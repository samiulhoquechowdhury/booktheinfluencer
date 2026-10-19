import { describe, expect, it } from 'vitest';
import { CategoryUpdateSchema, RepUpdateSchema, TalentInputSchema, TalentUpdateSchema } from './admin';

describe('TalentUpdateSchema', () => {
  it('keeps only the fields that were sent (no create defaults)', () => {
    expect(TalentUpdateSchema.parse({ tagline: 'New' })).toEqual({ tagline: 'New' });
    expect(TalentUpdateSchema.parse({})).toEqual({});
  });
  it('still validates sent fields', () => {
    expect(TalentUpdateSchema.safeParse({ baseCity: 'atlantis' }).success).toBe(false);
    expect(TalentUpdateSchema.safeParse({ feeBand: { minRupees: 5, maxRupees: 5 } }).success).toBe(false);
    expect(TalentUpdateSchema.parse({ feeBand: null })).toEqual({ feeBand: null });
  });
  it('create still fills defaults', () => {
    const t = TalentInputSchema.parse({ stageName: 'Ab', baseCity: 'guwahati', representationType: 'PLATFORM_COORDINATED', categories: ['singers'] });
    expect(t).toMatchObject({ bio: '', languages: [], tier: 'STANDARD', feeBand: null });
  });
});

describe('other PATCH schemas keep omitted fields', () => {
  it('category', () => expect(CategoryUpdateSchema.parse({ name: 'Singers' })).toEqual({ name: 'Singers' }));
  it('representative', () => expect(RepUpdateSchema.parse({ name: 'NE Talent' })).toEqual({ name: 'NE Talent' }));
});
