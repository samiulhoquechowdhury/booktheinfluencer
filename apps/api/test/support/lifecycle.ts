import { randomInt, randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { hmacHex } from '../../src/common/hmac';
import type { ConsoleSmsSender } from '../../src/auth/sms';
import type { PrismaService } from '../../src/prisma/prisma.service';
import { testEnv } from './app';
import type { Track } from './fixtures';

export type Ctx = { app: NestExpressApplication; prisma: PrismaService; sms: ConsoleSmsSender; sales: { userId: string; token: string }; manager: { userId: string; token: string }; run: string; track: Track };

const auth = (s: { token: string }) => ({ Authorization: `Bearer ${s.token}` });
export const future = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
const ip = () => `10.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(1, 254)}`;

/** A signed delivery exactly as the fake gateway / e-sign provider would send it (`testRun` lets cleanup find it). */
export function signedWebhook(ctx: Ctx, path: 'payments' | 'esign', body: object, eventId = `evt_${randomUUID()}`, secret?: string) {
  const raw = JSON.stringify({ ...body, testRun: ctx.run });
  const key = secret ?? (path === 'payments' ? testEnv.PAYMENT_WEBHOOK_SECRET : testEnv.ESIGN_WEBHOOK_SECRET);
  const [sig, id] = path === 'payments' ? ['x-gateway-signature', 'x-gateway-event-id'] : ['x-esign-signature', 'x-esign-event-id'];
  return request(ctx.app.getHttpServer()).post(`/v1/webhooks/${path}`).set('Content-Type', 'application/json').set(sig, hmacHex(key, raw)).set(id, eventId).send(raw);
}

export const paidEvent = (linkId: string, paymentId: string, amountPaise: bigint | string) => ({
  event: 'payment_link.paid',
  payload: { payment_link: { entity: { id: linkId } }, payment: { entity: { id: paymentId, amount: String(amountPaise), method: 'upi' } } },
});

/** Customer brief → available talent → accepted quote (₹5L fee with ₹3.8L payout + ₹50k travel, 30/70 plan). */
export async function acceptedBooking(ctx: Ctx, slug: string) {
  const http = () => request(ctx.app.getHttpServer());
  const phone = `9${randomInt(100_000_000, 999_999_999)}`;
  ctx.track.phones.push(`+91${phone}`);
  const from = ip();
  await http().post('/v1/auth/otp/send').set('X-Forwarded-For', from).send({ phone }).expect(202);
  const r = await http()
    .post('/v1/enquiries')
    .set('X-Forwarded-For', from)
    .send({
      event: { eventType: 'WEDDING', date: future(90), city: 'guwahati', venue: 'Vivanta', audienceSize: 400, durationMins: 90 },
      talent: { talentSlugs: [slug], budgetMinRupees: 300_000, budgetMaxRupees: 700_000 },
      contact: { name: 'Riya Sharma', phone, email: `riya-${ctx.run}-${phone}@test.local`, otp: ctx.sms.lastCode(`+91${phone}`)!, consent: true },
    })
    .expect(201);
  const customer = { token: r.body.data.session.accessToken as string };
  const lead = await ctx.prisma.lead.findUniqueOrThrow({ where: { ref: r.body.data.ref }, include: { bookings: true } });
  const booking = lead.bookings[0]!;
  await ctx.prisma.lead.update({ where: { id: lead.id }, data: { stage: 'AVAILABILITY_CHECK', ownerId: ctx.sales.userId } });
  await ctx.prisma.booking.update({ where: { id: booking.id }, data: { availability: 'AVAILABLE' } });
  const q = (
    await http()
      .post(`/v1/admin/bookings/${booking.id}/quotes`)
      .set(auth(ctx.manager))
      .send({
        validUntil: future(14),
        lines: [
          { type: 'TALENT_FEE', description: 'Performance', amountRupees: 500_000, payoutRupees: 380_000 },
          { type: 'TRAVEL', description: 'Flights', amountRupees: 50_000 },
        ],
        milestones: [
          { label: 'Advance', percentBps: 3000, dueDate: future(3) },
          { label: 'Balance', percentBps: 7000, dueDate: future(80) },
        ],
      })
      .expect(201)
  ).body.data;
  await http().post(`/v1/admin/quotes/${q.id}/send`).set(auth(ctx.sales)).expect(200);
  await http().post(`/v1/me/bookings/${booking.ref}/quotes/${q.id}/decision`).set(auth(customer)).send({ action: 'accept' }).expect(200);
  const milestones = await ctx.prisma.paymentMilestone.findMany({ where: { bookingId: booking.id }, orderBy: { dueDate: 'asc' } });
  return { leadId: lead.id, bookingId: booking.id, ref: booking.ref, customer, advance: milestones[0]!, balance: milestones[1]! };
}

/** …then contract signed, advance paid and rep acceptance → CONFIRMED. */
export async function confirmedBooking(ctx: Ctx, slug: string) {
  const http = () => request(ctx.app.getHttpServer());
  const b = await acceptedBooking(ctx, slug);
  const sent = (await http().post(`/v1/admin/bookings/${b.bookingId}/contract`).set(auth(ctx.sales)).send({}).expect(201)).body.data;
  await signedWebhook(ctx, 'esign', { envelopeId: sent[0].providerRef, status: 'completed' }).expect(200);
  await http().post(`/v1/me/bookings/${b.ref}/milestones/${b.advance.id}/pay`).set(auth(b.customer)).expect(200);
  const linkId = (await ctx.prisma.paymentMilestone.findUniqueOrThrow({ where: { id: b.advance.id } })).gatewayLinkId!;
  await signedWebhook(ctx, 'payments', paidEvent(linkId, `pay_${randomUUID()}`, b.advance.amountPaise)).expect(200);
  const w = (await http().post(`/v1/admin/bookings/${b.bookingId}/rep-acceptance`).set(auth(ctx.manager)).send({}).expect(200)).body.data;
  if (w.stage !== 'CONFIRMED') throw new Error(`expected CONFIRMED, got ${w.stage}`);
  return b;
}

/** Deletes everything a lifecycle test created (payments and payouts are Restrict, so they go first). */
export async function cleanupLifecycle(ctx: Ctx, emails: string[]) {
  const { prisma, track } = ctx;
  const users = await prisma.user.findMany({ where: { OR: [{ email: { in: emails } }, { phone: { in: track.phones } }] }, select: { id: true } });
  const ids = users.map((u) => u.id);
  const bookings = await prisma.booking.findMany({ where: { OR: [{ lead: { customerId: { in: ids } } }, { talentId: { in: track.talentIds } }] }, select: { id: true, milestones: { select: { id: true } }, contracts: { select: { id: true } }, payout: { select: { id: true } } } });
  const bookingIds = bookings.map((b) => b.id);
  const milestoneIds = bookings.flatMap((b) => b.milestones.map((m) => m.id));
  const other = bookings.flatMap((b) => [...b.contracts.map((c) => c.id), ...(b.payout ? [b.payout.id] : [])]);
  await prisma.payment.deleteMany({ where: { milestoneId: { in: milestoneIds } } });
  await prisma.payout.deleteMany({ where: { bookingId: { in: bookingIds } } });
  await prisma.lead.deleteMany({ where: { OR: [{ customerId: { in: ids } }, { bookings: { some: { id: { in: bookingIds } } } }] } });
  await prisma.webhookEvent.deleteMany({ where: { payload: { path: ['testRun'], equals: ctx.run } } });
  await prisma.auditLog.deleteMany({ where: { OR: [{ actorId: { in: ids } }, { entityId: { in: [...bookingIds, ...milestoneIds, ...other] } }] } });
  await prisma.talent.deleteMany({ where: { id: { in: track.talentIds } } });
  await prisma.representative.deleteMany({ where: { id: { in: track.repIds } } });
  await prisma.refreshToken.deleteMany({ where: { userId: { in: ids } } });
  await prisma.loginAttempt.deleteMany({ where: { email: { in: emails } } });
  await prisma.otpChallenge.deleteMany({ where: { phone: { in: track.phones } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
}
