import { describe, expect, it } from 'vitest';
import { TalentPageSchema } from '@repo/schemas';
import { unwrapEnvelope } from './transport';

describe('unwrapEnvelope (NestJS → endpoints.ts shapes)', () => {
  it('unwraps { data }', () => expect(unwrapEnvelope({ data: { slug: 'x' } })).toEqual({ slug: 'x' }));
  it('turns { data, meta } into a page', () => {
    const page = unwrapEnvelope({ data: [], meta: { page: 2, pageSize: 12, total: 30 } });
    expect(page).toEqual({ items: [], total: 30, page: 2, pageSize: 12 });
    expect(TalentPageSchema.parse(page).total).toBe(30);
  });
  it('leaves mock responses alone', () => {
    expect(unwrapEnvelope({ items: [], total: 0, page: 1, pageSize: 12 })).toEqual({ items: [], total: 0, page: 1, pageSize: 12 });
    expect(unwrapEnvelope([1, 2])).toEqual([1, 2]);
    expect(unwrapEnvelope(null)).toBeNull();
  });
});
