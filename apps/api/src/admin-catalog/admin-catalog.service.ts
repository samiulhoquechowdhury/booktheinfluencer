import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@repo/db';
import type { AdminTalentQuery, TalentInput, TalentUpdate } from '@repo/schemas';
import type { z } from 'zod';
import type { BlackoutInputSchema, MediaInputSchema, RateCardInputSchema, RepInputSchema, RepUpdateSchema, RepVerificationSchema } from '@repo/schemas';
import { AuditService } from '../audit/audit.service';
import type { AuthUserRef } from '../auth/guards';
import { toE164 } from '../auth/otp.service';
import { DomainError, NotFoundError } from '../common/errors';
import { PrismaService } from '../prisma/prisma.service';

const paise = (rupees: number) => BigInt(rupees) * 100n;
const rupees = (p: bigint | null) => (p == null ? null : Number(p / 100n));

/** Public profiles need 4–6 images (PublicTalentSchema), plus enough content to render (ADM-1). */
export const MIN_PUBLIC_IMAGES = 4;
export const MAX_PUBLIC_IMAGES = 6;

const ADMIN_INCLUDE = {
  categories: { include: { category: true }, orderBy: { isPrimary: 'desc' } },
  media: { orderBy: { sortOrder: 'asc' } },
  reps: { include: { rep: true } },
  _count: { select: { blackouts: true, rateCards: true, bookings: true } },
} satisfies Prisma.TalentInclude;
type AdminTalentRow = Prisma.TalentGetPayload<{ include: typeof ADMIN_INCLUDE }>;

/** Staff view of a talent. No rate cards here (separate endpoint) and no search internals. */
function toAdminTalent(t: AdminTalentRow) {
  return {
    id: t.id,
    slug: t.slug,
    stageName: t.stageName,
    tagline: t.tagline ?? '',
    bio: t.bio ?? '',
    baseCity: t.baseCity,
    travelsTo: t.travelsTo,
    travelsPanIndia: t.travelsPanIndia,
    languages: t.languages,
    eventTypes: t.eventTypes,
    tags: t.tags,
    tier: t.tier,
    status: t.status,
    featured: t.featured,
    representationType: t.representationType,
    feeBand: t.feeBandMinPaise != null && t.feeBandMaxPaise != null ? { minRupees: rupees(t.feeBandMinPaise), maxRupees: rupees(t.feeBandMaxPaise) } : null,
    showreelUrl: t.showreelUrl,
    riderSummary: t.riderSummary,
    pastEvents: t.pastEvents,
    faqs: t.faqs,
    followers: t.followers,
    categories: t.categories.map((c) => c.category.slug),
    media: t.media.map((m) => ({ id: m.id, key: m.key, alt: m.alt, width: m.width, height: m.height, credit: m.credit, isCover: m.isCover, sortOrder: m.sortOrder })),
    reps: t.reps.map((r) => ({ id: r.rep.id, name: r.rep.name, agencyName: r.rep.agencyName, verification: r.rep.verification })),
    hasLogin: Boolean(t.userId),
    counts: { blackouts: t._count.blackouts, rateCards: t._count.rateCards, bookings: t._count.bookings },
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

const kebab = (s: string) =>
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80) || 'talent';

/** T-140..145: admin catalogue. Every change is audited (T-126); writes run in transactions. */
@Injectable()
export class AdminCatalogService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  // ── Categories (T-140) ──────────────────────────────────────────────────

  listCategories() {
    return this.prisma.category.findMany({ orderBy: { sortOrder: 'asc' }, include: { _count: { select: { talents: true } } } }).then((rows) => rows.map((c) => ({ id: c.id, slug: c.slug, name: c.name, sortOrder: c.sortOrder, talentCount: c._count.talents })));
  }

  async createCategory(input: { slug: string; name: string; sortOrder: number }, actor: AuthUserRef, ip?: string) {
    return this.prisma.$transaction(async (tx) => {
      const c = await tx.category.create({ data: input });
      await this.audit.record({ actorId: actor.id, action: 'category.create', entity: 'category', entityId: c.id, after: c, ip }, tx);
      return c;
    });
  }

  async updateCategory(id: string, input: { name?: string; sortOrder?: number }, actor: AuthUserRef, ip?: string) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.category.findUnique({ where: { id } });
      if (!before) throw new NotFoundError('Category', id);
      const c = await tx.category.update({ where: { id }, data: input });
      await this.audit.record({ actorId: actor.id, action: 'category.update', entity: 'category', entityId: id, before, after: c, ip }, tx);
      return c;
    });
  }

  async deleteCategory(id: string, actor: AuthUserRef, ip?: string) {
    await this.prisma.$transaction(async (tx) => {
      const c = await tx.category.findUnique({ where: { id }, include: { _count: { select: { talents: true } } } });
      if (!c) throw new NotFoundError('Category', id);
      if (c._count.talents > 0) throw new DomainError('IN_USE', `${c.name} still has ${c._count.talents} talent. Move them first.`, 409);
      await tx.category.delete({ where: { id } });
      await this.audit.record({ actorId: actor.id, action: 'category.delete', entity: 'category', entityId: id, before: c, ip }, tx);
    });
  }

  // ── Talent (T-141) ──────────────────────────────────────────────────────

  async listTalents(q: AdminTalentQuery) {
    const where: Prisma.TalentWhereInput = {
      status: q.status,
      categories: q.category ? { some: { category: { slug: q.category } } } : undefined,
      stageName: q.q ? { contains: q.q, mode: 'insensitive' } : undefined,
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.talent.findMany({ where, include: ADMIN_INCLUDE, orderBy: { updatedAt: 'desc' }, skip: (q.page - 1) * q.pageSize, take: q.pageSize }),
      this.prisma.talent.count({ where }),
    ]);
    return { data: rows.map(toAdminTalent), meta: { page: q.page, pageSize: q.pageSize, total } };
  }

  async getTalent(id: string) {
    const t = await this.prisma.talent.findUnique({ where: { id }, include: ADMIN_INCLUDE });
    if (!t) throw new NotFoundError('Talent', id);
    return toAdminTalent(t);
  }

  private async categoryIds(tx: Prisma.TransactionClient, slugs: string[]) {
    const cats = await tx.category.findMany({ where: { slug: { in: slugs } } });
    const missing = slugs.filter((s) => !cats.some((c) => c.slug === s));
    if (missing.length) throw new DomainError('UNKNOWN_CATEGORY', `Create these categories first: ${missing.join(', ')}.`, 400);
    return slugs.map((s, i) => ({ categoryId: cats.find((c) => c.slug === s)!.id, isPrimary: i === 0 }));
  }

  private async uniqueSlug(tx: Prisma.TransactionClient, base: string) {
    let slug = base;
    for (let n = 2; await tx.talent.findUnique({ where: { slug } }); n++) slug = `${base}-${n}`;
    return slug;
  }

  /** Scalar columns from create/update input (categories handled separately). */
  private columns(input: TalentUpdate): Prisma.TalentUncheckedUpdateInput {
    const { categories: _c, feeBand, slug: _s, ...rest } = input;
    const data: Prisma.TalentUncheckedUpdateInput = { ...rest } as Prisma.TalentUncheckedUpdateInput;
    if (feeBand !== undefined) {
      data.feeBandMinPaise = feeBand ? paise(feeBand.minRupees) : null;
      data.feeBandMaxPaise = feeBand ? paise(feeBand.maxRupees) : null;
    }
    return data;
  }

  /** New profiles always start as DRAFT (ADM-5); publish is a separate, checked step. */
  async createTalent(input: TalentInput, actor: AuthUserRef, ip?: string) {
    return this.prisma.$transaction(async (tx) => {
      const slug = await this.uniqueSlug(tx, input.slug ?? kebab(input.stageName));
      const categories = await this.categoryIds(tx, input.categories);
      const t = await tx.talent.create({
        data: { ...(this.columns(input) as Prisma.TalentUncheckedCreateInput), slug, status: 'DRAFT', categories: { create: categories } },
        include: ADMIN_INCLUDE,
      });
      await this.audit.record({ actorId: actor.id, action: 'talent.create', entity: 'talent', entityId: t.id, after: toAdminTalent(t), ip }, tx);
      return toAdminTalent(t);
    });
  }

  async updateTalent(id: string, input: TalentUpdate, actor: AuthUserRef, ip?: string) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.talent.findUnique({ where: { id }, include: ADMIN_INCLUDE });
      if (!before) throw new NotFoundError('Talent', id);
      if (input.slug && input.slug !== before.slug && (await tx.talent.findUnique({ where: { slug: input.slug } }))) throw new DomainError('CONFLICT', 'That slug is taken.', 409);
      if (input.categories) {
        const categories = await this.categoryIds(tx, input.categories);
        await tx.talentCategory.deleteMany({ where: { talentId: id } });
        await tx.talentCategory.createMany({ data: categories.map((c) => ({ ...c, talentId: id })) });
      }
      await tx.talent.update({ where: { id }, data: { ...this.columns(input), ...(input.slug ? { slug: input.slug } : {}) } });
      const after = await tx.talent.findUniqueOrThrow({ where: { id }, include: ADMIN_INCLUDE });
      // A live profile must stay publishable after edits.
      if (after.status === 'PUBLISHED') this.assertPublishable(after);
      await this.audit.record({ actorId: actor.id, action: 'talent.update', entity: 'talent', entityId: id, before: toAdminTalent(before), after: toAdminTalent(after), ip }, tx);
      return toAdminTalent(after);
    });
  }

  /** Everything a public profile needs (PublicTalentSchema + CAT-5). Lists every gap at once. */
  private assertPublishable(t: AdminTalentRow) {
    const gaps: string[] = [];
    if (t.media.length < MIN_PUBLIC_IMAGES) gaps.push(`at least ${MIN_PUBLIC_IMAGES} photos (has ${t.media.length})`);
    if (t.media.length > MAX_PUBLIC_IMAGES) gaps.push(`at most ${MAX_PUBLIC_IMAGES} photos (has ${t.media.length})`);
    if (!t.categories.length) gaps.push('a category');
    if (!t.tagline?.trim()) gaps.push('a tagline');
    if (!t.bio?.trim()) gaps.push('a bio');
    if (!t.languages.length) gaps.push('at least one language');
    if (!t.eventTypes.length) gaps.push('at least one event type');
    if (gaps.length) throw new DomainError('NOT_PUBLISHABLE', `Before publishing, add ${gaps.join(', ')}.`, 409, { gaps });
  }

  async setStatus(id: string, status: 'DRAFT' | 'PUBLISHED' | 'HIDDEN', actor: AuthUserRef, ip?: string) {
    return this.prisma.$transaction(async (tx) => {
      const t = await tx.talent.findUnique({ where: { id }, include: ADMIN_INCLUDE });
      if (!t) throw new NotFoundError('Talent', id);
      if (status === 'PUBLISHED') this.assertPublishable(t);
      const after = await tx.talent.update({ where: { id }, data: { status }, include: ADMIN_INCLUDE });
      await this.audit.record({ actorId: actor.id, action: 'talent.status', entity: 'talent', entityId: id, before: { status: t.status }, after: { status }, ip }, tx);
      return toAdminTalent(after);
    });
  }

  // ── Media (T-142, without storage upload) ───────────────────────────────

  async addMedia(talentId: string, input: z.infer<typeof MediaInputSchema>, actor: AuthUserRef, ip?: string) {
    return this.prisma.$transaction(async (tx) => {
      const count = await tx.talentMedia.count({ where: { talentId } });
      if (!(await tx.talent.findUnique({ where: { id: talentId } }))) throw new NotFoundError('Talent', talentId);
      if (count >= MAX_PUBLIC_IMAGES) throw new DomainError('TOO_MANY_PHOTOS', `A profile can have at most ${MAX_PUBLIC_IMAGES} photos.`, 409);
      const m = await tx.talentMedia.create({ data: { ...input, talentId, sortOrder: count, isCover: count === 0 } });
      await this.audit.record({ actorId: actor.id, action: 'talent.media.add', entity: 'talent', entityId: talentId, after: { mediaId: m.id, key: m.key }, ip }, tx);
      return m;
    });
  }

  /** New order = the given ids; the first becomes the cover. Must list every photo exactly once. */
  async orderMedia(talentId: string, ids: string[], actor: AuthUserRef, ip?: string) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.talentMedia.findMany({ where: { talentId } });
      if (current.length !== ids.length || new Set(ids).size !== ids.length || !ids.every((id) => current.some((m) => m.id === id)))
        throw new DomainError('BAD_ORDER', 'List every photo of this talent exactly once.', 400);
      await Promise.all(ids.map((id, i) => tx.talentMedia.update({ where: { id }, data: { sortOrder: i, isCover: i === 0 } })));
      await this.audit.record({ actorId: actor.id, action: 'talent.media.order', entity: 'talent', entityId: talentId, after: { ids }, ip }, tx);
      return tx.talentMedia.findMany({ where: { talentId }, orderBy: { sortOrder: 'asc' } });
    });
  }

  async removeMedia(talentId: string, mediaId: string, actor: AuthUserRef, ip?: string) {
    await this.prisma.$transaction(async (tx) => {
      const t = await tx.talent.findUnique({ where: { id: talentId }, include: { media: true } });
      const m = t?.media.find((x) => x.id === mediaId);
      if (!t || !m) throw new NotFoundError('Photo', mediaId);
      if (t.status === 'PUBLISHED' && t.media.length <= MIN_PUBLIC_IMAGES) throw new DomainError('NOT_PUBLISHABLE', `A live profile needs at least ${MIN_PUBLIC_IMAGES} photos. Add one first, or hide the profile.`, 409);
      await tx.talentMedia.delete({ where: { id: mediaId } });
      const rest = t.media.filter((x) => x.id !== mediaId).sort((a, b) => a.sortOrder - b.sortOrder);
      await Promise.all(rest.map((x, i) => tx.talentMedia.update({ where: { id: x.id }, data: { sortOrder: i, isCover: i === 0 } })));
      await this.audit.record({ actorId: actor.id, action: 'talent.media.remove', entity: 'talent', entityId: talentId, before: { mediaId, key: m.key }, ip }, tx);
    });
  }

  // ── Rate cards (T-143, INTERNAL) ────────────────────────────────────────

  private toRateCard = (r: { id: string; eventType: string | null; minimumRatePaise: bigint; sellingRatePaise: bigint; commissionBps: number; notes: string | null }) => ({
    id: r.id,
    eventType: r.eventType,
    minimumRupees: rupees(r.minimumRatePaise),
    sellingRupees: rupees(r.sellingRatePaise),
    commissionBps: r.commissionBps,
    notes: r.notes,
  });

  async listRateCards(talentId: string) {
    if (!(await this.prisma.talent.findUnique({ where: { id: talentId } }))) throw new NotFoundError('Talent', talentId);
    return (await this.prisma.rateCard.findMany({ where: { talentId }, orderBy: { eventType: 'asc' } })).map(this.toRateCard);
  }

  async upsertRateCard(talentId: string, input: z.infer<typeof RateCardInputSchema>, actor: AuthUserRef, ip?: string, id?: string) {
    return this.prisma.$transaction(async (tx) => {
      if (!(await tx.talent.findUnique({ where: { id: talentId } }))) throw new NotFoundError('Talent', talentId);
      const dup = await tx.rateCard.findFirst({ where: { talentId, eventType: input.eventType, NOT: id ? { id } : undefined } });
      if (dup) throw new DomainError('CONFLICT', 'There is already a rate card for this event type.', 409);
      const data = { eventType: input.eventType, minimumRatePaise: paise(input.minimumRupees), sellingRatePaise: paise(input.sellingRupees), commissionBps: input.commissionBps, notes: input.notes };
      const before = id ? await tx.rateCard.findFirst({ where: { id, talentId } }) : null;
      if (id && !before) throw new NotFoundError('Rate card', id);
      const saved = id ? await tx.rateCard.update({ where: { id }, data }) : await tx.rateCard.create({ data: { ...data, talentId } });
      await this.audit.record({ actorId: actor.id, action: id ? 'ratecard.update' : 'ratecard.create', entity: 'talent', entityId: talentId, before: before ? this.toRateCard(before) : undefined, after: this.toRateCard(saved), ip }, tx);
      return this.toRateCard(saved);
    });
  }

  async deleteRateCard(talentId: string, id: string, actor: AuthUserRef, ip?: string) {
    await this.prisma.$transaction(async (tx) => {
      const r = await tx.rateCard.findFirst({ where: { id, talentId } });
      if (!r) throw new NotFoundError('Rate card', id);
      await tx.rateCard.delete({ where: { id } });
      await this.audit.record({ actorId: actor.id, action: 'ratecard.delete', entity: 'talent', entityId: talentId, before: this.toRateCard(r), ip }, tx);
    });
  }

  // ── Representatives (T-144, without KYC upload) ─────────────────────────

  async listReps() {
    const reps = await this.prisma.representative.findMany({ orderBy: { name: 'asc' }, include: { talents: { include: { talent: { select: { id: true, stageName: true } } } } } });
    return reps.map((r) => ({ id: r.id, name: r.name, agencyName: r.agencyName, phone: r.phone, email: r.email, verification: r.verification, hasLogin: Boolean(r.userId), talents: r.talents.map((t) => t.talent) }));
  }

  async createRep(input: z.infer<typeof RepInputSchema>, actor: AuthUserRef, ip?: string) {
    return this.prisma.$transaction(async (tx) => {
      const r = await tx.representative.create({ data: { ...input, phone: toE164(input.phone) } });
      await this.audit.record({ actorId: actor.id, action: 'rep.create', entity: 'rep', entityId: r.id, after: r, ip }, tx);
      return r;
    });
  }

  async updateRep(id: string, input: z.infer<typeof RepUpdateSchema>, actor: AuthUserRef, ip?: string) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.representative.findUnique({ where: { id } });
      if (!before) throw new NotFoundError('Representative', id);
      const r = await tx.representative.update({ where: { id }, data: { ...input, phone: input.phone ? toE164(input.phone) : undefined } });
      await this.audit.record({ actorId: actor.id, action: 'rep.update', entity: 'rep', entityId: id, before, after: r, ip }, tx);
      return r;
    });
  }

  async setRepVerification(id: string, input: z.infer<typeof RepVerificationSchema>, actor: AuthUserRef, ip?: string) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.representative.findUnique({ where: { id } });
      if (!before) throw new NotFoundError('Representative', id);
      const r = await tx.representative.update({ where: { id }, data: { verification: input.status } });
      await this.audit.record({ actorId: actor.id, action: 'rep.verification', entity: 'rep', entityId: id, before: { verification: before.verification }, after: { verification: r.verification, note: input.note }, ip }, tx);
      return r;
    });
  }

  async linkRep(talentId: string, repId: string, on: boolean, actor: AuthUserRef, ip?: string) {
    await this.prisma.$transaction(async (tx) => {
      if (!(await tx.talent.findUnique({ where: { id: talentId } }))) throw new NotFoundError('Talent', talentId);
      if (!(await tx.representative.findUnique({ where: { id: repId } }))) throw new NotFoundError('Representative', repId);
      if (on) await tx.talentRep.upsert({ where: { talentId_repId: { talentId, repId } }, update: {}, create: { talentId, repId } });
      else await tx.talentRep.deleteMany({ where: { talentId, repId } });
      await this.audit.record({ actorId: actor.id, action: on ? 'talent.rep.link' : 'talent.rep.unlink', entity: 'talent', entityId: talentId, after: { repId }, ip }, tx);
    });
  }

  // ── Blackouts (T-145) ───────────────────────────────────────────────────

  async listBlackouts(talentId: string) {
    const rows = await this.prisma.blackout.findMany({ where: { talentId }, orderBy: { date: 'asc' } });
    return rows.map((b) => ({ id: b.id, date: b.date.toISOString().slice(0, 10), note: b.note }));
  }

  async addBlackout(talentId: string, input: z.infer<typeof BlackoutInputSchema>, actor: AuthUserRef, ip?: string) {
    return this.prisma.$transaction(async (tx) => {
      if (!(await tx.talent.findUnique({ where: { id: talentId } }))) throw new NotFoundError('Talent', talentId);
      const b = await tx.blackout.create({ data: { talentId, date: new Date(`${input.date}T00:00:00.000Z`), note: input.note } });
      await this.audit.record({ actorId: actor.id, action: 'blackout.add', entity: 'talent', entityId: talentId, after: { date: input.date }, ip }, tx);
      return { id: b.id, date: input.date, note: b.note };
    });
  }

  async removeBlackout(talentId: string, id: string, actor: AuthUserRef, ip?: string) {
    await this.prisma.$transaction(async (tx) => {
      const b = await tx.blackout.findFirst({ where: { id, talentId } });
      if (!b) throw new NotFoundError('Blackout', id);
      await tx.blackout.delete({ where: { id } });
      await this.audit.record({ actorId: actor.id, action: 'blackout.remove', entity: 'talent', entityId: talentId, before: { date: b.date.toISOString().slice(0, 10) }, ip }, tx);
    });
  }
}
