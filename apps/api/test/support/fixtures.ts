import type { PrismaService } from '../../src/prisma/prisma.service';

/** Race-safe across parallel test files (Prisma's upsert can hit a unique violation). */
export async function ensureCategory(prisma: PrismaService, slug: string, name = slug) {
  await prisma.category.createMany({ data: [{ slug, name }], skipDuplicates: true });
  return prisma.category.findUniqueOrThrow({ where: { slug } });
}

/** Ids a test file creates, for its afterAll cleanup. */
export type Track = { talentIds: string[]; repIds: string[]; phones: string[] };

/** A published talent that satisfies the public schema, with a rep and a ₹3L-minimum wedding rate card. */
export async function publishedTalent(prisma: PrismaService, key: string, run: string, track: Track) {
  const cat = await ensureCategory(prisma, 'singers', 'Singers');
  const rep = await prisma.representative.create({ data: { name: `Rep ${run}`, phone: '+919000000000', email: `rep-${run}@test.local` } });
  track.repIds.push(rep.id);
  const t = await prisma.talent.create({
    data: {
      slug: `${key}-${run}`,
      stageName: `${key} ${run}`,
      tagline: `${key} live`,
      bio: `Bio of ${key}`,
      baseCity: 'guwahati',
      languages: ['Assamese'],
      eventTypes: ['WEDDING'],
      status: 'PUBLISHED',
      representationType: 'PLATFORM_COORDINATED',
      categories: { create: { categoryId: cat.id, isPrimary: true } },
      media: { create: [0, 1, 2, 3].map((i) => ({ key: `/talent/${key}-${i}.jpg`, alt: `${key} photo ${i}`, width: 1200, height: 1500, sortOrder: i, isCover: i === 0 })) },
      reps: { create: { repId: rep.id } },
      rateCards: { create: { eventType: 'WEDDING', minimumRatePaise: 300_000_00n, sellingRatePaise: 450_000_00n, commissionBps: 1500 } },
    },
  });
  track.talentIds.push(t.id);
  return t;
}
