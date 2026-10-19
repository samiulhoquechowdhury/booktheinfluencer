import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { PublicTalentSchema, TalentPageSchema } from '@repo/schemas';
import { PrismaService } from '../src/prisma/prisma.service';
import { bootTestApp } from './support/app';

let app: NestExpressApplication;
let prisma: PrismaService;
const run = randomUUID().slice(0, 8);
const slug = (s: string) => `${s}-${run}`;
const created: string[] = [];
const http = () => request(app.getHttpServer());
const LAKH = 100_000n * 100n;

/** Slugs from a list response, limited to this run's fixtures. */
const slugs = (body: { data: { slug: string }[] }) => body.data.map((t) => t.slug).filter((s) => s.endsWith(run));

async function talent(data: {
  key: string;
  name: string;
  category: string;
  status?: 'PUBLISHED' | 'DRAFT';
  city: string;
  travelsTo?: string[];
  panIndia?: boolean;
  languages: string[];
  eventTypes: string[];
  fee?: [bigint, bigint];
  tier?: 'STANDARD' | 'PREMIUM';
  featured?: boolean;
  verified?: boolean;
  tags?: string[];
  blackout?: string;
}) {
  const cat = await prisma.category.upsert({ where: { slug: data.category }, update: {}, create: { slug: data.category, name: data.category } });
  const rep = await prisma.representative.create({ data: { name: `Rep ${run}`, phone: '+919000000000', verification: data.verified ? 'VERIFIED' : 'PENDING' } });
  const t = await prisma.talent.create({
    data: {
      slug: slug(data.key),
      stageName: data.name,
      tagline: `${data.name} live`,
      bio: `Bio of ${data.name}`,
      baseCity: data.city,
      travelsTo: data.travelsTo ?? [],
      travelsPanIndia: data.panIndia ?? false,
      languages: data.languages,
      eventTypes: data.eventTypes,
      tags: data.tags ?? [],
      tier: data.tier ?? 'STANDARD',
      featured: data.featured ?? false,
      status: data.status ?? 'PUBLISHED',
      representationType: 'PLATFORM_COORDINATED',
      feeBandMinPaise: data.fee?.[0] ?? null,
      feeBandMaxPaise: data.fee?.[1] ?? null,
      categories: { create: { categoryId: cat.id, isPrimary: true } },
      media: { create: [0, 1, 2, 3].map((i) => ({ key: `/talent/${data.key}-${i}.jpg`, alt: `${data.name} ${i}`, width: 1200, height: 1500, sortOrder: i, isCover: i === 0 })) },
      reps: { create: { repId: rep.id } },
      // INTERNAL — must never appear in any public response.
      rateCards: { create: { minimumRatePaise: 999_111n * 100n, sellingRatePaise: 999_222n * 100n, commissionBps: 1777, notes: 'INTERNAL-NOTE' } },
      blackouts: data.blackout ? { create: { date: new Date(`${data.blackout}T00:00:00.000Z`) } } : undefined,
    },
  });
  created.push(t.id);
}

beforeAll(async () => {
  app = await bootTestApp();
  prisma = app.get(PrismaService);
  await talent({ key: 'aanya', name: 'Aanya Folk', category: 'singers', city: 'guwahati', languages: ['Assamese', 'Hindi'], eventTypes: ['WEDDING', 'CONCERT'], fee: [2n * LAKH, 4n * LAKH], tier: 'PREMIUM', featured: true, verified: true, tags: ['bihu', 'folk'], blackout: '2026-12-01' });
  await talent({ key: 'zubeen', name: 'Zubeen Tester', category: 'actors', city: 'mumbai', travelsTo: ['guwahati'], languages: ['Hindi'], eventTypes: ['AWARD_NIGHT'] });
  await talent({ key: 'hidden', name: 'Hidden Draft', category: 'singers', city: 'guwahati', languages: ['Assamese'], eventTypes: ['WEDDING'], status: 'DRAFT' });
  await talent({ key: 'kolkata', name: 'Kolkata Voice', category: 'singers', city: 'kolkata', panIndia: true, languages: ['Bengali'], eventTypes: ['CORPORATE'], fee: [8n * LAKH, 12n * LAKH] });
});

afterAll(async () => {
  const reps = await prisma.talentRep.findMany({ where: { talentId: { in: created } }, select: { repId: true } });
  await prisma.talent.deleteMany({ where: { id: { in: created } } });
  await prisma.representative.deleteMany({ where: { id: { in: reps.map((r) => r.repId) } } });
  await app.close();
});

describe('public catalogue (CAT, T-146)', () => {
  it('lists only published talent, in the exact public shape', async () => {
    const r = await http().get('/v1/talents?pageSize=48').expect(200);
    expect(slugs(r.body).sort()).toEqual([slug('aanya'), slug('kolkata'), slug('zubeen')].sort());
    expect(r.body.meta).toMatchObject({ page: 1, pageSize: 48 });
    // Strict schema = the web app's contract; any extra field fails here.
    expect(() => TalentPageSchema.parse({ items: r.body.data, ...r.body.meta })).not.toThrow();
  });

  it('never leaks rate cards or internal fields (T-147)', async () => {
    const bodies = [
      (await http().get('/v1/talents?pageSize=48')).text,
      (await http().get(`/v1/talents/${slug('aanya')}`)).text,
      (await http().get('/v1/talents/featured')).text,
      (await http().get(`/v1/talents/${slug('kolkata')}/similar`)).text,
    ].join('\n');
    for (const leak of ['rateCard', 'minimumRate', 'sellingRate', 'commission', '99911100', '99922200', 'INTERNAL-NOTE', 'userId', 'searchVector', 'status']) expect(bodies).not.toContain(leak);
  });

  it('filters by category, city (incl. travel), language, event type and verified', async () => {
    expect(slugs((await http().get('/v1/talents?category=actors')).body)).toEqual([slug('zubeen')]);
    expect(slugs((await http().get('/v1/talents?city=guwahati')).body).sort()).toEqual([slug('aanya'), slug('kolkata'), slug('zubeen')].sort()); // base, pan-India, travels
    expect(slugs((await http().get('/v1/talents?language=Bengali')).body)).toEqual([slug('kolkata')]);
    expect(slugs((await http().get('/v1/talents?eventType=AWARD_NIGHT')).body)).toEqual([slug('zubeen')]);
    expect(slugs((await http().get('/v1/talents?verified=true')).body)).toEqual([slug('aanya')]);
  });

  it('filters by budget band; "On request" belongs to the top band', async () => {
    expect(slugs((await http().get('/v1/talents?budget=1l_3l')).body)).toEqual([slug('aanya')]);
    expect(slugs((await http().get('/v1/talents?budget=above_10l')).body).sort()).toEqual([slug('kolkata'), slug('zubeen')].sort());
  });

  it('hides talent blacked out on the chosen date (CAT-4)', async () => {
    expect(slugs((await http().get('/v1/talents?date=2026-12-01')).body)).not.toContain(slug('aanya'));
    expect(slugs((await http().get('/v1/talents?date=2026-12-02')).body)).toContain(slug('aanya'));
  });

  it('searches by tag, tagline and partial name', async () => {
    expect(slugs((await http().get('/v1/talents?q=bihu')).body)).toEqual([slug('aanya')]);
    expect(slugs((await http().get('/v1/talents?q=zube')).body)).toEqual([slug('zubeen')]);
    expect(slugs((await http().get('/v1/talents?q=voice live')).body)).toEqual([slug('kolkata')]);
  });

  it('sorts by fee with "On request" last, and by relevance with featured first', async () => {
    expect(slugs((await http().get('/v1/talents?sort=fee_asc&pageSize=48')).body)).toEqual([slug('aanya'), slug('kolkata'), slug('zubeen')]);
    expect(slugs((await http().get('/v1/talents?sort=fee_desc&pageSize=48')).body)).toEqual([slug('kolkata'), slug('aanya'), slug('zubeen')]);
    expect(slugs((await http().get('/v1/talents?pageSize=48')).body)[0]).toBe(slug('aanya'));
  });

  it('paginates and validates the query', async () => {
    const r = await http().get(`/v1/talents?q=${run}&pageSize=1&page=1`).expect(200);
    expect(r.body.meta.pageSize).toBe(1);
    expect((await http().get('/v1/talents?pageSize=500').expect(400)).body.error.code).toBe('VALIDATION_FAILED');
    expect((await http().get('/v1/talents?category=astronauts').expect(400)).body.error.code).toBe('VALIDATION_FAILED');
  });

  it('serves profiles, featured and similar; drafts are not found', async () => {
    const p = await http().get(`/v1/talents/${slug('aanya')}`).expect(200);
    expect(PublicTalentSchema.parse(p.body.data)).toMatchObject({ name: 'Aanya Folk', verified: true, primaryCategory: 'singers', feeBand: { minPaise: 2n * LAKH } });
    expect((await http().get(`/v1/talents/${slug('hidden')}`).expect(404)).body.error.code).toBe('TALENT_NOT_FOUND');

    const featured = await http().get('/v1/talents/featured').expect(200);
    expect(z.array(PublicTalentSchema).parse(featured.body.data).map((t) => t.slug)).toContain(slug('aanya'));

    const similar = await http().get(`/v1/talents/${slug('kolkata')}/similar`).expect(200);
    const sims = (similar.body.data as { slug: string; primaryCategory: string }[]).filter((t) => t.slug.endsWith(run));
    expect(sims.map((t) => t.slug)).toEqual([slug('aanya')]); // same category, published only
  });

  it('lists categories with published talent counts', async () => {
    const r = await http().get('/v1/categories').expect(200);
    const singers = r.body.data.find((c: { slug: string }) => c.slug === 'singers');
    expect(singers.talentCount).toBeGreaterThanOrEqual(2);
  });

  it('needs no sign-in', async () => {
    await http().get('/v1/talents').expect(200);
    await http().get('/v1/categories').expect(200);
  });
});
