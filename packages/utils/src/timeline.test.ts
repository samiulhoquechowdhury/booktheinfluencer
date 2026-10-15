import { describe, expect, it } from 'vitest';
import { deriveTimeline } from './timeline';

const current = (t: ReturnType<typeof deriveTimeline>) => t.find((s) => s.state === 'current' || s.state === 'blocked');

describe('deriveTimeline', () => {
  it('starts at availability', () => {
    const t = deriveTimeline({ stage: 'NEW', availability: 'NOT_CHECKED', quoteAccepted: false, contractSigned: false, advancePaid: false });
    expect(current(t)?.step).toBe('AVAILABILITY');
  });
  it('never shows confirmed without all conditions', () => {
    const t = deriveTimeline({ stage: 'CONFIRMED', availability: 'CONFIRMED', quoteAccepted: true, contractSigned: true, advancePaid: false });
    expect(current(t)?.step).toBe('ADVANCE');
  });
  it('marks unavailable as blocked', () => {
    const t = deriveTimeline({ stage: 'AVAILABILITY_CHECK', availability: 'UNAVAILABLE', quoteAccepted: false, contractSigned: false, advancePaid: false });
    expect(current(t)).toEqual({ step: 'AVAILABILITY', state: 'blocked' });
  });
  it('confirmed booking points at the event', () => {
    const t = deriveTimeline({ stage: 'CONFIRMED', availability: 'CONFIRMED', quoteAccepted: true, contractSigned: true, advancePaid: true });
    expect(current(t)?.step).toBe('EVENT');
  });
});
