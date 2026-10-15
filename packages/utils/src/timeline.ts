/** Customer status timeline (design.md §4 StatusTimeline). Pure derivation from booking state. */
export const TIMELINE_STEPS = [
  'BRIEF',
  'AVAILABILITY',
  'QUOTE',
  'CONTRACT',
  'ADVANCE',
  'CONFIRMED',
  'EVENT',
  'COMPLETED',
] as const;
export type TimelineStep = (typeof TIMELINE_STEPS)[number];
export type StepState = 'done' | 'current' | 'upcoming' | 'blocked';

export const TIMELINE_LABELS: Record<TimelineStep, string> = {
  BRIEF: 'Brief',
  AVAILABILITY: 'Availability',
  QUOTE: 'Quote',
  CONTRACT: 'Contract',
  ADVANCE: 'Advance',
  CONFIRMED: 'Confirmed',
  EVENT: 'Event',
  COMPLETED: 'Completed',
};

export type TimelineInput = {
  stage: string;
  availability: string;
  quoteAccepted: boolean;
  contractSigned: boolean;
  advancePaid: boolean;
};

/**
 * Which step is "current". CONFIRMED is only reached when every confirmation condition holds
 * (trd §5 / OPS-1) — the timeline never shows confirmed early, even if data says otherwise.
 */
export function deriveTimeline(input: TimelineInput): { step: TimelineStep; state: StepState }[] {
  const { stage, availability, quoteAccepted, contractSigned, advancePaid } = input;
  const confirmed =
    availability === 'CONFIRMED' && quoteAccepted && contractSigned && advancePaid;
  const completed = confirmed && ['EVENT_COMPLETED', 'SETTLEMENT', 'CLOSED'].includes(stage);
  const unavailable = availability === 'UNAVAILABLE' || stage === 'LOST' || stage === 'CANCELLED';

  let current: TimelineStep;
  if (completed) current = 'COMPLETED';
  else if (confirmed) current = 'EVENT';
  else if (!['AVAILABLE', 'TENTATIVE', 'CONFIRMED'].includes(availability)) current = 'AVAILABILITY';
  else if (!quoteAccepted) current = 'QUOTE';
  else if (!contractSigned) current = 'CONTRACT';
  else if (!advancePaid) current = 'ADVANCE';
  else current = 'CONFIRMED'; // all customer steps done; awaiting rep acceptance

  const idx = TIMELINE_STEPS.indexOf(current);
  return TIMELINE_STEPS.map((step, i) => ({
    step,
    state:
      i < idx || (completed && step === 'COMPLETED')
        ? 'done'
        : i === idx
          ? unavailable
            ? 'blocked'
            : 'current'
          : 'upcoming',
  }));
}
