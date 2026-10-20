import type { PrismaService } from '../../src/prisma/prisma.service';

/** Race-safe across parallel test files (Prisma's upsert can hit a unique violation). */
export async function ensureCategory(prisma: PrismaService, slug: string, name = slug) {
  await prisma.category.createMany({ data: [{ slug, name }], skipDuplicates: true });
  return prisma.category.findUniqueOrThrow({ where: { slug } });
}
