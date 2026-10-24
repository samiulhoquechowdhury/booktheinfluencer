import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@repo/db';
import { ONBOARDING_MAX_PHOTOS, ONBOARDING_MIN_PHOTOS, type Onboarding, type OnboardingPhotoUpload, type OnboardingProfile, type OnboardingStatus } from '@repo/schemas';
import { AuditService } from '../audit/audit.service';
import type { AuthUserRef } from '../auth/guards';
import { DomainError, NotFoundError } from '../common/errors';
import { MediaStorage } from '../media/media.storage';
import { PrismaService } from '../prisma/prisma.service';

const INCLUDE = { categories: { include: { category: true }, orderBy: { isPrimary: 'desc' } }, media: { orderBy: { sortOrder: 'asc' } } } satisfies Prisma.TalentInclude;
type Row = Prisma.TalentGetPayload<{ include: typeof INCLUDE }>;

const kebab = (s: string) =>
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80) || 'talent';

const LIVE_EDIT = 'Your profile is live. Ask your manager to change it, so bookings in progress stay accurate.';

/** Plain-words list of what still blocks submitting (mirrors the admin publish check). */
export function onboardingGaps(t: Pick<Row, 'tagline' | 'bio' | 'languages' | 'eventTypes' | 'categories' | 'media'> | null): string[] {
  if (!t) return ['your basic details'];
  const gaps: string[] = [];
  if (!t.categories.length) gaps.push('a category');
  if (!t.tagline?.trim()) gaps.push('a one-line introduction');
  if ((t.bio?.trim().length ?? 0) < 80) gaps.push('a bio of at least 80 characters');
  if (!t.eventTypes.length) gaps.push('the events you perform at');
  if (!t.languages.length) gaps.push('the languages you perform in');
  if (t.media.length < ONBOARDING_MIN_PHOTOS) gaps.push(`${ONBOARDING_MIN_PHOTOS - t.media.length} more photo${ONBOARDING_MIN_PHOTOS - t.media.length === 1 ? '' : 's'}`);
  return gaps;
}

const statusOf = (t: Row | null): OnboardingStatus =>
  !t ? 'NOT_STARTED' : t.status === 'PUBLISHED' ? 'LIVE' : t.status === 'HIDDEN' ? 'HIDDEN' : t.submittedAt ? 'IN_REVIEW' : t.reviewNote ? 'CHANGES_REQUESTED' : 'DRAFT';

/**
 * Talent self-onboarding: a talent who signed in with their phone fills in their own profile and
 * photos, then submits it. Staff review it in the admin app and publish it (or send it back with a
 * note). Only the talent's own profile (Talent.userId); representatives keep using invites.
 */
@Injectable()
export class OnboardingService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(MediaStorage) private readonly storage: MediaStorage,
  ) {}

  private own(u: AuthUserRef) {
    return this.prisma.talent.findUnique({ where: { userId: u.id }, include: INCLUDE });
  }

  private view(t: Row | null): Onboarding {
    return {
      status: statusOf(t),
      reviewNote: t?.reviewNote ?? null,
      submittedAt: t?.submittedAt?.toISOString() ?? null,
      slug: t?.slug ?? null,
      profile: t
        ? {
            stageName: t.stageName,
            categories: t.categories.map((c) => c.category.slug) as OnboardingProfile['categories'],
            tagline: t.tagline ?? '',
            bio: t.bio ?? '',
            baseCity: t.baseCity as OnboardingProfile['baseCity'],
            travelsPanIndia: t.travelsPanIndia,
            travelsTo: t.travelsTo as OnboardingProfile['travelsTo'],
            languages: t.languages as OnboardingProfile['languages'],
            eventTypes: t.eventTypes as OnboardingProfile['eventTypes'],
            feeBand: t.feeBandMinPaise != null && t.feeBandMaxPaise != null ? { minRupees: Number(t.feeBandMinPaise / 100n), maxRupees: Number(t.feeBandMaxPaise / 100n) } : null,
            showreelUrl: t.showreelUrl,
            riderSummary: t.riderSummary,
          }
        : null,
      photos: (t?.media ?? []).map((m) => ({ id: m.id, src: m.key, width: m.width, height: m.height })),
      gaps: onboardingGaps(t),
    };
  }

  async get(u: AuthUserRef): Promise<Onboarding> {
    const t = await this.own(u);
    // A representative with talents but no profile of their own goes straight to the portal.
    if (!t && (await this.prisma.talentRep.count({ where: { rep: { userId: u.id } } }))) return { ...this.view(null), status: 'LIVE', gaps: [] };
    return this.view(t);
  }

  /** Create or update the draft. Editing a submitted profile withdraws it from review. */
  async save(u: AuthUserRef, input: OnboardingProfile, ip?: string): Promise<Onboarding> {
    await this.prisma.$transaction(async (tx) => {
      const before = await tx.talent.findUnique({ where: { userId: u.id } });
      if (before && before.status !== 'DRAFT') throw new DomainError('PROFILE_LIVE', LIVE_EDIT, 409);
      const cats = await tx.category.findMany({ where: { slug: { in: input.categories } } });
      const categories = input.categories.flatMap((slug, i) => {
        const c = cats.find((x) => x.slug === slug);
        return c ? [{ categoryId: c.id, isPrimary: i === 0 }] : [];
      });
      const data = {
        stageName: input.stageName,
        tagline: input.tagline,
        bio: input.bio,
        baseCity: input.baseCity,
        travelsPanIndia: input.travelsPanIndia,
        travelsTo: input.travelsPanIndia ? [] : input.travelsTo,
        languages: input.languages,
        eventTypes: input.eventTypes,
        feeBandMinPaise: input.feeBand ? BigInt(input.feeBand.minRupees) * 100n : null,
        feeBandMaxPaise: input.feeBand ? BigInt(input.feeBand.maxRupees) * 100n : null,
        showreelUrl: input.showreelUrl,
        riderSummary: input.riderSummary || null,
        submittedAt: null,
      };
      let id = before?.id;
      if (!before) {
        let slug = kebab(input.stageName);
        for (let n = 2; await tx.talent.findUnique({ where: { slug } }); n++) slug = `${kebab(input.stageName)}-${n}`;
        id = (await tx.talent.create({ data: { ...data, slug, status: 'DRAFT', representationType: 'TALENT_MANAGED', userId: u.id } })).id;
      } else {
        await tx.talent.update({ where: { id }, data });
        await tx.talentCategory.deleteMany({ where: { talentId: id } });
      }
      await tx.talentCategory.createMany({ data: categories.map((c) => ({ ...c, talentId: id! })) });
      // New talent accounts have no name yet; use the stage name until they set one.
      await tx.user.updateMany({ where: { id: u.id, name: null }, data: { name: input.stageName } });
      await this.audit.record({ actorId: u.id, action: before ? 'onboarding.update' : 'onboarding.create', entity: 'talent', entityId: id!, after: { stageName: input.stageName, withdrawn: Boolean(before?.submittedAt) }, ip }, tx);
    });
    return this.view(await this.own(u));
  }

  private async editable(u: AuthUserRef) {
    const t = await this.own(u);
    if (!t) throw new DomainError('PROFILE_NOT_STARTED', 'Save your basic details first.', 409);
    if (t.status !== 'DRAFT') throw new DomainError('PROFILE_LIVE', LIVE_EDIT, 409);
    return t;
  }

  async addPhoto(u: AuthUserRef, input: OnboardingPhotoUpload, ip?: string): Promise<Onboarding> {
    const t = await this.editable(u);
    if (t.media.length >= ONBOARDING_MAX_PHOTOS) throw new DomainError('TOO_MANY_PHOTOS', `You can add up to ${ONBOARDING_MAX_PHOTOS} photos. Remove one first.`, 409);
    const key = await this.storage.saveJpeg(input.dataUrl);
    await this.prisma.$transaction(async (tx) => {
      const n = await tx.talentMedia.count({ where: { talentId: t.id } });
      await tx.talentMedia.create({ data: { talentId: t.id, key, alt: `${t.stageName}, photo ${n + 1}`, width: input.width, height: input.height, sortOrder: n, isCover: n === 0 } });
      await tx.talent.update({ where: { id: t.id }, data: { submittedAt: null } });
      await this.audit.record({ actorId: u.id, action: 'onboarding.photo.add', entity: 'talent', entityId: t.id, after: { key }, ip }, tx);
    });
    return this.view(await this.own(u));
  }

  async removePhoto(u: AuthUserRef, mediaId: string, ip?: string): Promise<Onboarding> {
    const t = await this.editable(u);
    const m = t.media.find((x) => x.id === mediaId);
    if (!m) throw new NotFoundError('Photo', mediaId);
    await this.prisma.$transaction(async (tx) => {
      await tx.talentMedia.delete({ where: { id: mediaId } });
      const rest = t.media.filter((x) => x.id !== mediaId);
      await Promise.all(rest.map((x, i) => tx.talentMedia.update({ where: { id: x.id }, data: { sortOrder: i, isCover: i === 0 } })));
      await tx.talent.update({ where: { id: t.id }, data: { submittedAt: null } });
      await this.audit.record({ actorId: u.id, action: 'onboarding.photo.remove', entity: 'talent', entityId: t.id, before: { key: m.key }, ip }, tx);
    });
    await this.storage.remove(m.key);
    return this.view(await this.own(u));
  }

  /** Make a photo the cover (moves it first). */
  async coverPhoto(u: AuthUserRef, mediaId: string): Promise<Onboarding> {
    const t = await this.editable(u);
    if (!t.media.some((x) => x.id === mediaId)) throw new NotFoundError('Photo', mediaId);
    const order = [mediaId, ...t.media.filter((x) => x.id !== mediaId).map((x) => x.id)];
    await this.prisma.$transaction(order.map((id, i) => this.prisma.talentMedia.update({ where: { id }, data: { sortOrder: i, isCover: i === 0 } })));
    return this.view(await this.own(u));
  }

  async submit(u: AuthUserRef, ip?: string): Promise<Onboarding> {
    const t = await this.editable(u);
    const gaps = onboardingGaps(t);
    if (gaps.length) throw new DomainError('PROFILE_INCOMPLETE', `Before submitting, add ${gaps.join(', ')}.`, 409, { gaps });
    await this.prisma.$transaction(async (tx) => {
      await tx.talent.update({ where: { id: t.id }, data: { submittedAt: new Date(), reviewNote: null } });
      await this.audit.record({ actorId: u.id, action: 'onboarding.submit', entity: 'talent', entityId: t.id, ip }, tx);
    });
    return this.view(await this.own(u));
  }
}
