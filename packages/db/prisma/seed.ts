/**
 * Dev/staging seed (rules.md §3): categories, the current talent roster, one representative,
 * staff + a demo customer, and one lead in every pipeline stage with booking records that match
 * that stage (e.g. CONFIRMED really has an accepted quote, signed contract, paid advance and rep
 * acceptance — the confirmation rule in trd §5).
 *
 * Talent comes from apps/web/lib/mock/data/talents.json so the site and the database agree.
 * Re-running wipes and recreates everything. Refuses to run in production.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashPassword } from '../src/password';
import { Prisma, PrismaClient, type LeadStage, type LineItemType, type RepresentationType, type Role, type TalentTier } from '@prisma/client';

if (process.env.NODE_ENV === 'production') throw new Error('Refusing to seed a production database.');

const prisma = new PrismaClient();
/** Development only — printed after seeding. Never used outside local/staging seed data. */
const DEV_STAFF_PASSWORD = 'dev-staff-password-2026';
const here = dirname(fileURLToPath(import.meta.url));

type MockTalent = {
  slug: string;
  name: string;
  categories: string[];
  primaryCategory: string;
  tagline: string;
  bio: string;
  baseCity: string;
  travelsTo: string[];
  travelsPanIndia: boolean;
  languages: string[];
  eventTypes: string[];
  tier: TalentTier;
  representation: RepresentationType;
  featured: boolean;
  feeBand: { minPaise: string; maxPaise: string } | null;
  images: { src: string; alt: string; width: number; height: number; credit?: string }[];
  showreelUrl: string | null;
  riderSummary: string | null;
  tags: string[];
};
const talents: MockTalent[] = JSON.parse(readFileSync(join(here, '../../../apps/web/lib/mock/data/talents.json'), 'utf8'));

const CATEGORIES = [
  { slug: 'actors', name: 'Actors & celebrities' },
  { slug: 'singers', name: 'Singers' },
  { slug: 'djs', name: 'DJs' },
  { slug: 'comedians', name: 'Comedians' },
  { slug: 'speakers', name: 'Speakers & anchors' },
  { slug: 'creators', name: 'Creators' },
];

const rupees = (r: number) => BigInt(r) * 100n;
const GST_BPS = 1800;
/** Half-up rounding at line level (trd §6). */
const taxOf = (paise: bigint, bps: number) => (paise * BigInt(bps) + 5000n) / 10000n;
const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

/** Stage → how far the booking has progressed. */
const STAGES: LeadStage[] = ['NEW', 'CONTACTED', 'REQUIREMENT_RECEIVED', 'SHORTLISTED', 'AVAILABILITY_CHECK', 'QUOTE_SENT', 'NEGOTIATION', 'ADVANCE_PENDING', 'CONFIRMED', 'EVENT_COMPLETED', 'SETTLEMENT', 'CLOSED', 'LOST', 'CANCELLED'];
const at = (s: LeadStage, ...set: LeadStage[]) => set.includes(s);

async function wipe() {
  // Children first; every table is dev data.
  await prisma.$transaction([
    prisma.payment.deleteMany(),
    prisma.paymentMilestone.deleteMany(),
    prisma.payout.deleteMany(),
    prisma.contract.deleteMany(),
    prisma.quoteLineItem.deleteMany(),
    prisma.quote.deleteMany(),
    prisma.booking.deleteMany(),
    prisma.activity.deleteMany(),
    prisma.lead.deleteMany(),
    prisma.favourite.deleteMany(),
    prisma.blackout.deleteMany(),
    prisma.rateCard.deleteMany(),
    prisma.talentMedia.deleteMany(),
    prisma.talentCategory.deleteMany(),
    prisma.talentRep.deleteMany(),
    prisma.talent.deleteMany(),
    prisma.representative.deleteMany(),
    prisma.category.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.loginAttempt.deleteMany(),
    prisma.otpChallenge.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.webhookEvent.deleteMany(),
    prisma.document.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

async function main() {
  await wipe();

  // ── Users ──
  // Dev-only staff password (staff must still enrol an authenticator app on first sign-in).
  const staffHash = await hashPassword(DEV_STAFF_PASSWORD);
  const user = (name: string, email: string, roles: Role[], phone?: string) =>
    prisma.user.create({ data: { name, email, roles, phone, passwordHash: roles.includes('CUSTOMER') ? null : staffHash } });
  const admin = await user('Super Admin', 'admin@booktheinfluencer.local', ['SUPER_ADMIN']);
  const sales = await user('Priyanka Das', 'priyanka@booktheinfluencer.local', ['SALES'], '+919864012345');
  await user('Rahul Nath', 'rahul@booktheinfluencer.local', ['TALENT_MANAGER']);
  await user('Accounts Desk', 'accounts@booktheinfluencer.local', ['ACCOUNTS']);
  const customer = await user('Riya Sharma', 'riya@example.com', ['CUSTOMER'], '+919000000001');

  // ── Catalogue ──
  const cats = new Map<string, string>();
  for (const [i, c] of CATEGORIES.entries()) cats.set(c.slug, (await prisma.category.create({ data: { ...c, sortOrder: i } })).id);

  const desk = await prisma.representative.create({
    data: { name: 'Talent Desk', agencyName: 'BookTheInfluencer', phone: '+919864012345', email: 'talent@booktheinfluencer.local', verification: 'VERIFIED' },
  });

  const talentIds: string[] = [];
  for (const t of talents) {
    const created = await prisma.talent.create({
      data: {
        slug: t.slug,
        stageName: t.name,
        tagline: t.tagline,
        bio: t.bio,
        baseCity: t.baseCity,
        travelsTo: t.travelsTo,
        travelsPanIndia: t.travelsPanIndia,
        languages: t.languages,
        eventTypes: t.eventTypes,
        tags: t.tags,
        tier: t.tier,
        status: 'PUBLISHED',
        featured: t.featured,
        representationType: t.representation,
        feeBandMinPaise: t.feeBand ? BigInt(t.feeBand.minPaise) : null,
        feeBandMaxPaise: t.feeBand ? BigInt(t.feeBand.maxPaise) : null,
        showreelUrl: t.showreelUrl,
        riderSummary: t.riderSummary,
        categories: { create: t.categories.filter((c) => cats.has(c)).map((c) => ({ categoryId: cats.get(c)!, isPrimary: c === t.primaryCategory })) },
        media: {
          create: t.images.map((img, i) => ({ key: img.src.split('?')[0]!, alt: img.alt, width: img.width, height: img.height, credit: img.credit, sortOrder: i, isCover: i === 0 })),
        },
        // INTERNAL demo values — replace with real rate cards before launch.
        rateCards: { create: { minimumRatePaise: rupees(150000), sellingRatePaise: rupees(250000), commissionBps: 1500, notes: 'Demo seed value' } },
        reps: { create: { repId: desk.id } },
      },
    });
    talentIds.push(created.id);
  }

  // ── One lead per stage ──
  const fee = 250000; // ₹2.5L talent fee in the demo quotes
  for (const [i, stage] of STAGES.entries()) {
    const past = at(stage, 'EVENT_COMPLETED', 'SETTLEMENT', 'CLOSED');
    const lead = await prisma.lead.create({
      data: {
        ref: `TB-2026-${String(101 + i).padStart(6, '0')}`,
        stage,
        ownerId: stage === 'NEW' ? null : sales.id,
        customerId: customer.id,
        eventType: ['CORPORATE', 'WEDDING', 'COLLEGE_FEST', 'PRODUCT_LAUNCH', 'AWARD_NIGHT'][i % 5]!,
        eventDate: day(past ? '2026-09-20' : `2026-${String(11 + (i % 2)).padStart(2, '0')}-${String(5 + i).padStart(2, '0')}`),
        city: 'guwahati',
        venue: 'Radisson Blu, Guwahati',
        audienceSize: 300 + i * 50,
        durationMins: 75,
        budgetMinPaise: rupees(200000),
        budgetMaxPaise: rupees(400000),
        language: 'Assamese',
        companyName: i % 2 ? 'Northeast Ventures Pvt Ltd' : null,
        source: 'seed',
        lostReason: stage === 'LOST' ? 'Budget below talent fee' : null,
        activities: { create: { type: 'stage_change', body: `Seeded in ${stage}`, actorId: admin.id } },
      },
    });

    if (at(stage, 'NEW', 'CONTACTED', 'LOST')) continue; // no talent picked yet

    const availability = at(stage, 'REQUIREMENT_RECEIVED', 'SHORTLISTED')
      ? 'NOT_CHECKED'
      : stage === 'AVAILABILITY_CHECK'
        ? 'AWAITING_MANAGER'
        : at(stage, 'CONFIRMED', 'EVENT_COMPLETED', 'SETTLEMENT', 'CLOSED')
          ? 'CONFIRMED'
          : 'AVAILABLE';
    const confirmed = availability === 'CONFIRMED';
    const booking = await prisma.booking.create({
      data: {
        leadId: lead.id,
        talentId: talentIds[i % talentIds.length]!,
        availability,
        repAcceptedAt: confirmed ? day('2026-09-01') : null,
        confirmedAt: confirmed ? day('2026-09-01') : null,
        completedAt: past ? day('2026-09-21') : null,
        completionNote: at(stage, 'SETTLEMENT', 'CLOSED') ? 'Set ran 75 minutes; no issues.' : null,
        cancelledAt: stage === 'CANCELLED' ? day('2026-10-10') : null,
        cancelReason: stage === 'CANCELLED' ? 'Event postponed by the customer' : null,
      },
    });

    if (!at(stage, 'QUOTE_SENT', 'NEGOTIATION', 'ADVANCE_PENDING', 'CONFIRMED', 'EVENT_COMPLETED', 'SETTLEMENT', 'CLOSED', 'CANCELLED')) continue;

    // ── Quote (GST at line level, half-up) ──
    const lines: { type: LineItemType; description: string; amount: number; cost: number; payout?: number }[] = [
      { type: 'TALENT_FEE', description: '75-minute set', amount: fee, cost: 200000, payout: 200000 },
      { type: 'TRAVEL', description: 'Return travel', amount: 18000, cost: 18000 },
      { type: 'SERVICE_FEE', description: 'Platform service fee', amount: 20000, cost: 0 },
    ];
    const subtotal = lines.reduce((s, l) => s + rupees(l.amount), 0n);
    const tax = lines.reduce((s, l) => s + taxOf(rupees(l.amount), GST_BPS), 0n);
    const total = subtotal + tax;
    const accepted = !at(stage, 'QUOTE_SENT', 'NEGOTIATION');
    await prisma.quote.create({
      data: {
        bookingId: booking.id,
        version: 1,
        status: accepted ? 'ACCEPTED' : 'SENT',
        validUntil: day('2026-12-31'),
        subtotalPaise: subtotal,
        taxPaise: tax,
        totalPaise: total,
        internalCostPaise: lines.reduce((s, l) => s + rupees(l.cost), 0n),
        acceptedAt: accepted ? day('2026-08-25') : null,
        acceptedByUserId: accepted ? customer.id : null,
        acceptedIp: accepted ? '127.0.0.1' : null,
        changeRequest: stage === 'NEGOTIATION' ? 'Can the set be 60 minutes instead?' : null,
        milestonePlan: [
          { label: 'Advance', percentBps: 5000, dueDate: '2026-09-01' },
          { label: 'Balance', percentBps: 5000, dueDate: '2026-09-18' },
        ] satisfies Prisma.InputJsonValue,
        lineItems: {
          create: lines.map((l, k) => ({
            type: l.type,
            description: l.description,
            customerAmountPaise: rupees(l.amount),
            internalCostPaise: rupees(l.cost),
            payoutPaise: l.payout ? rupees(l.payout) : null,
            taxRateBps: GST_BPS,
            sortOrder: k,
          })),
        },
      },
    });
    if (!accepted) continue;

    // ── Contract + milestones + payments ──
    await prisma.contract.create({
      data: { bookingId: booking.id, status: confirmed ? 'SIGNED' : 'SENT', sentAt: day('2026-08-26'), signedAt: confirmed ? day('2026-08-28') : null },
    });
    const half = total / 2n;
    const balancePaid = at(stage, 'SETTLEMENT', 'CLOSED');
    const advance = await prisma.paymentMilestone.create({
      data: { bookingId: booking.id, label: 'Advance', amountPaise: half, dueDate: day('2026-09-01'), status: confirmed ? 'PAID' : stage === 'CANCELLED' ? 'CANCELLED' : 'LINK_SENT', isAdvance: true },
    });
    const balance = await prisma.paymentMilestone.create({
      data: { bookingId: booking.id, label: 'Balance', amountPaise: total - half, dueDate: day('2026-09-18'), status: balancePaid ? 'PAID' : stage === 'CANCELLED' ? 'CANCELLED' : 'PENDING' },
    });
    if (confirmed) await prisma.payment.create({ data: { milestoneId: advance.id, method: 'gateway', gatewayPaymentId: `pay_seed_${i}_a`, amountPaise: half, status: 'captured', receivedAt: day('2026-08-30') } });
    if (balancePaid) await prisma.payment.create({ data: { milestoneId: balance.id, method: 'gateway', gatewayPaymentId: `pay_seed_${i}_b`, amountPaise: total - half, status: 'captured', receivedAt: day('2026-09-17') } });

    if (confirmed) {
      const payout = rupees(200000);
      await prisma.booking.update({
        where: { id: booking.id },
        data: { sellingTotalPaise: subtotal, payoutTotalPaise: payout, marginPaise: subtotal - payout - rupees(18000) },
      });
    }
    if (at(stage, 'SETTLEMENT', 'CLOSED')) {
      await prisma.payout.create({ data: { bookingId: booking.id, amountPaise: rupees(200000), status: stage === 'CLOSED' ? 'PAID' : 'SCHEDULED', paidAt: stage === 'CLOSED' ? day('2026-09-25') : null, reference: stage === 'CLOSED' ? 'UTR SEED 0001' : null } });
    }
  }

  const counts = await Promise.all([prisma.talent.count(), prisma.lead.count(), prisma.booking.count(), prisma.quote.count()]);
  console.log(`Seeded ${counts[0]} talents, ${counts[1]} leads (one per stage), ${counts[2]} bookings, ${counts[3]} quotes.`);
  console.log(`Staff sign-in (dev): admin@booktheinfluencer.local / ${DEV_STAFF_PASSWORD} (authenticator setup on first sign-in)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
