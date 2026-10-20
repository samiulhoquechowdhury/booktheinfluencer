import type { AvailabilityStatus, LeadStage } from '@repo/schemas';

/** Shapes of the staff API responses (apps/api pipeline / settlement services). Money = paise strings. */
export type StaffRole = 'SUPER_ADMIN' | 'SALES' | 'TALENT_MANAGER' | 'OPS' | 'ACCOUNTS';
export type StaffUser = { id: string; name: string | null; email: string | null; roles: StaffRole[] };

export type LeadCard = {
  id: string;
  ref: string;
  stage: LeadStage;
  eventType: string;
  eventDate: string;
  city: string;
  customer: string | null;
  company: string | null;
  owner: { id: string; name: string | null } | null;
  talents: { name: string; availability: AvailabilityStatus }[];
  budget: { minRupees: number | null; maxRupees: number | null };
  updatedAt: string;
};

export type BoardColumn = { stage: LeadStage; count: number; cards: LeadCard[] };

export type Activity = { id: string; type: string; body: string | null; meta: Record<string, unknown> | null; actor: string | null; at: string };

export type WorkspaceBooking = {
  id: string;
  ref: string;
  talent: { id: string; slug: string; name: string; tier: string; cover: string | null };
  availability: AvailabilityStatus;
  repAcceptedAt: string | null;
  confirmedAt: string | null;
  quoteStatuses: string[];
  confirmable: boolean;
  opsChecklist: unknown;
  cancelledAt: string | null;
};

export type Workspace = {
  id: string;
  ref: string;
  stage: LeadStage;
  nextStages: LeadStage[];
  lostReason: string | null;
  owner: { id: string; name: string | null } | null;
  customer: { id: string; name: string | null; phone: string | null; email: string | null };
  brief: {
    eventType: string;
    eventDate: string;
    altDate: string | null;
    city: string;
    venue: string | null;
    audienceSize: number | null;
    durationMins: number | null;
    startTime: string | null;
    budget: { minRupees: number | null; maxRupees: number | null };
    language: string | null;
    notes: string | null;
    companyName: string | null;
    gstin: string | null;
    source: string | null;
  };
  bookings: WorkspaceBooking[];
  activity: Activity[];
  createdAt: string;
};

export type Analytics = {
  leads: number;
  leadsByStage: Record<LeadStage, number>;
  bookingsConfirmed: number;
  gmvPaise: string;
  avgBookingValuePaise: string;
  conversion: { enquiryToQuoteBps: number; quoteToConfirmedBps: number };
  avgHoursToConfirm: number | null;
  finance?: { marginPaise: string; receivablesPaise: string; overduePaise: string; pendingPayouts: { count: number; amountPaise: string } };
};

/** Staff quote view (apps/api quotes.service `view`). Payout / cost / margin keys appear only for roles allowed to see them. */
export type QuoteLineView = { id: string; type: string; description: string; amountPaise: string; taxPaise: string; payoutPaise?: string | null; internalCostPaise?: string };
export type QuoteView = {
  id: string;
  bookingId: string;
  version: number;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'SUPERSEDED';
  validUntil: string;
  sentAt: string | null;
  acceptedAt: string | null;
  changeRequest: string | null;
  notes: string | null;
  inclusions: string[];
  gstBps: number;
  approval: { reasons: string[]; approved: boolean };
  lines: QuoteLineView[];
  milestones: { label: string; percentBps: number; dueDate: string; amountPaise: string }[];
  subtotalPaise: string;
  taxPaise: string;
  totalPaise: string;
  payoutTotalPaise?: string;
  payoutComplete?: boolean;
  internalCostPaise?: string;
  marginPaise?: string;
  marginBps?: number;
};
export type BookingQuotes = {
  booking: { id: string; ref: string; availability: string; lead: { id: string; ref: string; stage: string; eventType: string }; talent: { slug: string; name: string } };
  rateCard: { eventType: string | null; minimumRupees: number; sellingRupees: number; commissionBps: number } | null;
  marginFloorBps?: number;
  quotes: QuoteView[];
};

/** Admin catalogue (apps/api admin-catalog.service `toAdminTalent` etc.). Money in whole rupees. */
export type AdminMedia = { id: string; key: string; alt: string; width: number | null; height: number | null; credit: string | null; isCover: boolean; sortOrder: number };
export type AdminTalent = {
  id: string;
  slug: string;
  stageName: string;
  tagline: string;
  bio: string;
  baseCity: string;
  travelsTo: string[];
  travelsPanIndia: boolean;
  languages: string[];
  eventTypes: string[];
  tags: string[];
  tier: 'STANDARD' | 'PREMIUM';
  status: 'DRAFT' | 'PUBLISHED' | 'HIDDEN';
  featured: boolean;
  blackoutSelfEdit: boolean;
  representationType: string;
  feeBand: { minRupees: number; maxRupees: number } | null;
  showreelUrl: string | null;
  riderSummary: string | null;
  pastEvents: { title: string; city: string; year: number }[];
  faqs: { q: string; a: string }[];
  followers: { platform: 'instagram' | 'youtube'; count: number }[];
  categories: string[];
  media: AdminMedia[];
  reps: { id: string; name: string; agencyName: string | null; verification: 'PENDING' | 'VERIFIED' | 'REJECTED' }[];
  hasLogin: boolean;
  counts: { blackouts: number; rateCards: number; bookings: number };
  createdAt: string;
  updatedAt: string;
};
export type RateCard = { id: string; eventType: string | null; minimumRupees: number; sellingRupees: number; commissionBps: number; notes: string | null };
export type Rep = { id: string; name: string; agencyName: string | null; phone: string; email: string | null; verification: 'PENDING' | 'VERIFIED' | 'REJECTED'; hasLogin: boolean; talents: { id: string; stageName: string }[] };
export type BlackoutRow = { id: string; date: string; note: string | null };
export type Category = { id: string; slug: string; name: string; sortOrder: number; talentCount?: number };

export type MilestoneRow = {
  id: string;
  label: string;
  isAdvance: boolean;
  amountPaise: string;
  dueDate: string;
  status: 'PENDING' | 'LINK_SENT' | 'PAID' | 'OVERDUE' | 'REFUNDED' | 'CANCELLED';
  overdue: boolean;
  paidAt: string | null;
  receiptNo: string | null;
  linkSent: boolean;
  booking: { id: string; ref: string; talent: string };
  lead: { id: string; ref: string; customer: string | null };
};
export type PayoutRow = {
  id: string;
  bookingId: string;
  bookingRef: string;
  leadRef: string;
  talent: { slug: string; name: string };
  eventDate: string;
  amountPaise: string;
  contractedPaise: string | null;
  status: 'PENDING' | 'SCHEDULED' | 'PAID' | 'ON_HOLD';
  scheduledFor: string | null;
  paidAt: string | null;
  reference: string | null;
  note: string | null;
};
export type ContractRow = { id: string; status: 'DRAFT' | 'SENT' | 'PARTIALLY_SIGNED' | 'SIGNED' | 'VOID'; sentAt: string | null; signedAt: string | null; hasDocument: boolean; providerRef: string | null };

export type Role = StaffRole | 'TALENT' | 'REP' | 'CUSTOMER';
export type UserRow = { id: string; name: string | null; phone: string | null; email: string | null; roles: Role[]; mfaEnabled: boolean; createdAt: string };
export type InviteRow = { id: string; email: string | null; phone: string | null; name: string | null; roles: Role[]; status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED'; invitedBy: string | null; expiresAt: string; createdAt: string };
export type AuditRow = { id: string; actorId: string | null; action: string; entity: string; entityId: string; before: unknown; after: unknown; ip: string | null; createdAt: string };
