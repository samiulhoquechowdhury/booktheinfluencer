/** Human copy for enums. Single source so UI never invents labels. */

export const AVAILABILITY_LABELS = {
  NOT_CHECKED: { label: 'Request received', tone: 'neutral' },
  AWAITING_MANAGER: { label: 'Awaiting manager confirmation', tone: 'warning' },
  HOLD_REQUESTED: { label: 'Hold requested', tone: 'warning' },
  AVAILABLE: { label: 'Available — quote coming', tone: 'info' },
  TENTATIVE: { label: 'Tentatively available', tone: 'info' },
  UNAVAILABLE: { label: 'Not available on this date', tone: 'danger' },
  CONFIRMED: { label: 'Confirmed', tone: 'success' },
} as const;
export type StatusTone = 'neutral' | 'warning' | 'info' | 'danger' | 'success';

export const PENDING_AVAILABILITY = new Set(['NOT_CHECKED', 'AWAITING_MANAGER', 'HOLD_REQUESTED']);

export const REPRESENTATION_LABELS = {
  TALENT_MANAGED: 'Talent-managed',
  AGENCY_MANAGED: 'Agency-managed',
  PLATFORM_COORDINATED: 'Platform-coordinated',
} as const;

export const EVENT_TYPE_LABELS = {
  CORPORATE: 'Corporate event',
  WEDDING: 'Wedding',
  COLLEGE_FEST: 'College fest',
  PRODUCT_LAUNCH: 'Product launch',
  AWARD_NIGHT: 'Award night',
  PRIVATE_PARTY: 'Private party',
  CONFERENCE: 'Conference',
  CLUB_NIGHT: 'Club night',
  BRAND_CAMPAIGN: 'Brand campaign',
  CONCERT: 'Concert',
} as const;

export const LINE_ITEM_LABELS = {
  TALENT_FEE: 'Talent fee',
  TRAVEL: 'Travel',
  ACCOMMODATION: 'Accommodation',
  LOCAL_TRANSPORT: 'Local transport',
  SECURITY: 'Security',
  PRODUCTION: 'Production',
  SERVICE_FEE: 'Service fee',
  OTHER: 'Other',
} as const;

export const STAGE_LABELS = {
  NEW: 'Brief received',
  CONTACTED: 'In conversation',
  REQUIREMENT_RECEIVED: 'Requirement received',
  SHORTLISTED: 'Shortlisted',
  AVAILABILITY_CHECK: 'Checking availability',
  QUOTE_SENT: 'Quote sent',
  NEGOTIATION: 'In negotiation',
  ADVANCE_PENDING: 'Advance pending',
  CONFIRMED: 'Confirmed',
  EVENT_COMPLETED: 'Event completed',
  SETTLEMENT: 'Completed',
  CLOSED: 'Closed',
  LOST: 'Closed — not proceeding',
  CANCELLED: 'Cancelled',
} as const;

/** CTA copy (CAT-6). Never "Book Now". */
export const ctaLabelForTier = (tier: 'STANDARD' | 'PREMIUM') =>
  tier === 'PREMIUM' ? 'Check Availability' : 'Request to Book';

export const CTA_FORBIDDEN = /\b(book now|instant(ly)? book|instant confirmation|guaranteed)\b/i;
