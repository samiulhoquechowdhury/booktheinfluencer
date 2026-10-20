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
