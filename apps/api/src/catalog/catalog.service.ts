import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@repo/db';
import type { TalentQueryParsed } from '@repo/schemas';
import { DomainError } from '../common/errors';
import { PrismaService } from '../prisma/prisma.service';
import { PUBLIC_TALENT_INCLUDE, toPublicTalent } from './public-talent';

const LAKH = 100_000n * 100n; // ₹1L in paise
/** Budget bands (CAT-2), in paise. A band matches when it overlaps the talent's fee band. */
const BUDGETS: Record<string, [bigint, bigint]> = {
  under_1l: [0n, LAKH],
  '1l_3l': [LAKH, 3n * LAKH],
  '3l_10l': [3n * LAKH, 10n * LAKH],
  above_10l: [10n * LAKH, 10n ** 15n],
};

const published = { status: 'PUBLISHED' } as const;

/** Public catalogue (CAT-1..11): only PUBLISHED profiles are ever visible. */
@Injectable()
export class CatalogService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /** Full-text (search vector) + partial-name (trigram) match → talent ids. */
  private async searchIds(q: string): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Talent"
      WHERE status = 'PUBLISHED'
        AND ("searchVector" @@ websearch_to_tsquery('simple', unaccent(${q}))
             OR unaccent("stageName") ILIKE '%' || unaccent(${q}) || '%'
             OR similarity(unaccent("stageName"), unaccent(${q})) > 0.3)`;
    return rows.map((r) => r.id);
  }

  async list(query: TalentQueryParsed) {
    const and: Prisma.TalentWhereInput[] = [published];
    if (query.category) and.push({ categories: { some: { category: { slug: query.category } } } });
    if (query.city) and.push({ OR: [{ baseCity: query.city }, { travelsPanIndia: true }, { travelsTo: { has: query.city } }] });
    if (query.eventType) and.push({ eventTypes: { has: query.eventType } });
    if (query.language) and.push({ languages: { has: query.language } });
    if (query.verified) and.push({ reps: { some: { rep: { verification: 'VERIFIED' } } } });
    // CAT-4: a blackout hides the talent on that date — it never implies availability.
    if (query.date) and.push({ blackouts: { none: { date: new Date(`${query.date}T00:00:00.000Z`) } } });
    if (query.budget) {
      const [lo, hi] = BUDGETS[query.budget]!;
      const overlaps: Prisma.TalentWhereInput = { feeBandMaxPaise: { gte: lo }, feeBandMinPaise: { lt: hi } };
      // "On request" talent belong to the top band.
      and.push(query.budget === 'above_10l' ? { OR: [overlaps, { feeBandMinPaise: null }] } : overlaps);
    }
    if (query.q) and.push({ id: { in: await this.searchIds(query.q) } });

    const where: Prisma.TalentWhereInput = { AND: and };
    const orderBy: Prisma.TalentOrderByWithRelationInput[] =
      query.sort === 'relevance'
        ? [{ featured: 'desc' }, { tier: 'desc' }, { stageName: 'asc' }]
        : // "On request" (no fee band) always last.
          [{ feeBandMinPaise: { sort: query.sort === 'fee_asc' ? 'asc' : 'desc', nulls: 'last' } }, { stageName: 'asc' }];

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.talent.findMany({ where, orderBy, include: PUBLIC_TALENT_INCLUDE, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      this.prisma.talent.count({ where }),
    ]);
    return { data: rows.map(toPublicTalent), meta: { page: query.page, pageSize: query.pageSize, total } };
  }

  async featured() {
    const rows = await this.prisma.talent.findMany({ where: { ...published, featured: true }, orderBy: [{ tier: 'desc' }, { stageName: 'asc' }], include: PUBLIC_TALENT_INCLUDE });
    return rows.map(toPublicTalent);
  }

  async bySlug(slug: string) {
    const t = await this.prisma.talent.findFirst({ where: { ...published, slug }, include: PUBLIC_TALENT_INCLUDE });
    if (!t) throw new DomainError('TALENT_NOT_FOUND', 'We couldn’t find that profile.', 404);
    return toPublicTalent(t);
  }

  /** Same primary category; same city first, then featured/premium. */
  async similar(slug: string) {
    const t = await this.bySlug(slug);
    const rows = await this.prisma.talent.findMany({
      where: { ...published, slug: { not: slug }, categories: { some: { isPrimary: true, category: { slug: t.primaryCategory } } } },
      orderBy: [{ featured: 'desc' }, { tier: 'desc' }, { stageName: 'asc' }],
      include: PUBLIC_TALENT_INCLUDE,
      take: 12,
    });
    return rows
      .map(toPublicTalent)
      .sort((a, b) => Number(b.baseCity === t.baseCity) - Number(a.baseCity === t.baseCity))
      .slice(0, 4);
  }

  async categories() {
    const rows = await this.prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { talents: { where: { talent: published } } } } },
    });
    return rows.map((c) => ({ slug: c.slug, name: c.name, talentCount: c._count.talents }));
  }
}
