import type { RawBooking, RawPortal, RawQuote, RawTalent } from './db';

/**
 * Serializers = the only exit for mock data (mirrors API DTO mappers).
 * They whitelist fields; internal cost / payout / margin / rate cards never leave (rules.md §0.2).
 */
export function toPublicTalent(t: RawTalent) {
  return {
    id: t.id,
    slug: t.slug,
    name: t.name,
    categories: t.categories,
    primaryCategory: t.primaryCategory,
    tagline: t.tagline,
    bio: t.bio,
    baseCity: t.baseCity,
    travelsTo: t.travelsTo,
    travelsPanIndia: t.travelsPanIndia,
    languages: t.languages,
    eventTypes: t.eventTypes,
    tier: t.tier,
    representation: t.representation,
    verified: t.verified,
    featured: t.featured,
    feeBand: t.feeBand,
    images: t.images,
    showreelUrl: t.showreelUrl,
    pastEvents: t.pastEvents,
    riderSummary: t.riderSummary,
    faqs: t.faqs,
    tags: t.tags,
  };
}

export function toCustomerQuote(q: RawQuote) {
  return {
    id: q.id,
    version: q.version,
    status: q.status,
    issuedAt: q.issuedAt,
    validUntil: q.validUntil,
    lineItems: q.lineItems.map((li) => ({ id: li.id, type: li.type, description: li.description, amountPaise: li.amountPaise })),
    subtotalPaise: q.subtotalPaise,
    gstBps: q.gstBps,
    taxPaise: q.taxPaise,
    totalPaise: q.totalPaise,
    milestones: q.milestones.map((m) => ({ id: m.id, label: m.label, percentBps: m.percentBps, amountPaise: m.amountPaise, dueDate: m.dueDate })),
    inclusions: q.inclusions,
    notes: q.notes,
    acceptedAt: q.acceptedAt,
    changeRequest: q.changeRequest,
  };
}

export function toCustomerBookingSummary(b: RawBooking) {
  return {
    ref: b.ref,
    stage: b.stage,
    availability: b.availability,
    talent: b.talent,
    event: b.event,
    createdAt: b.createdAt,
  };
}

export function toCustomerBooking(b: RawBooking) {
  return {
    ...toCustomerBookingSummary(b),
    leadRef: b.leadRef,
    quotes: b.quotes.map(toCustomerQuote).sort((a, z) => z.version - a.version),
    contract: { status: b.contract.status, sentAt: b.contract.sentAt, signedAt: b.contract.signedAt },
    advancePaid: b.advancePaid,
    milestones: (b.milestones as Record<string, unknown>[]).map((m) => ({
      id: m.id,
      label: m.label,
      amountPaise: m.amountPaise,
      dueDate: m.dueDate,
      status: m.status,
      paidAt: m.paidAt,
      receiptNo: m.receiptNo,
    })),
    documents: b.documents,
    activity: b.activity,
    notes: b.notes,
    manager: b.manager,
  };
}

type RawPortalBooking = RawPortal['bookings'][number];
/** Talent sees payout only — never selling price or margin (TAL-2). */
export function toTalentBooking(b: RawPortalBooking) {
  return {
    ref: b.ref,
    event: b.event,
    availability: b.availability,
    contract: b.contract,
    payoutPaise: b.payoutPaise,
    reportingTime: b.reportingTime,
    pointOfContact: b.pointOfContact,
  };
}

export function toTalentPayout(p: RawPortal['payouts'][number]) {
  return {
    id: p.id,
    bookingRef: p.bookingRef,
    eventTitle: p.eventTitle,
    eventDate: p.eventDate,
    amountPaise: p.amountPaise,
    status: p.status,
    paidAt: p.paidAt,
    reference: p.reference,
  };
}
