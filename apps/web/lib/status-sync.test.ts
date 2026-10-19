import { describe, expect, it } from 'vitest';
import { AVAILABILITY_STATUSES, LEAD_STAGES } from '@repo/schemas';
import { AVAILABILITY_STATUSES as SM_AVAILABILITY, LEAD_STAGES as SM_STAGES } from '@repo/utils';

/** The state machine (packages/utils) keeps its own status lists; they must match the schemas. */
describe('state machine statuses match the shared schemas', () => {
  it('lead stages', () => expect([...SM_STAGES]).toEqual([...LEAD_STAGES]));
  it('availability statuses', () => expect([...SM_AVAILABILITY]).toEqual([...AVAILABILITY_STATUSES]));
});
