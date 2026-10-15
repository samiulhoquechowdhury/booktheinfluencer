# Design — Talent & Celebrity Booking Platform

> UI/UX design system and screen specs · v1.0 · 16 Oct 2026
> Brand name and logo are pending (open decision). Tokens below are placeholders that are easy to swap.

---

## 1. Design principles
1. **Premium but honest** — feels like a concierge service; never overpromises availability or price.
2. **Clarity of status** — the customer always knows where the booking stands and what happens next.
3. **Total cost transparency** — every price shown with what it includes.
4. **Speed for staff** — CRM is dense, keyboard-friendly, built for scanning.
5. **Mobile-first for customers, desktop-first for admin.**

## 2. Brand tone
- Voice: confident, warm, professional. "We'll confirm with Arijit's manager and get back within 24 hours."
- Never: "Instantly book any celebrity", "Guaranteed", "Book Now" on premium talent.

## 3. Design tokens

### Colour (light / dark)
| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | #FFFFFF | #0B0B0F | Page |
| `--surface` | #F7F7F8 | #141419 | Cards |
| `--surface-2` | #EEEEF1 | #1C1C23 | Inputs, hover |
| `--border` | #E3E3E8 | #2A2A33 | Lines |
| `--text` | #111114 | #F4F4F6 | Primary text |
| `--text-muted` | #5C5C66 | #A1A1AC | Secondary |
| `--primary` | #6D28D9 | #8B5CF6 | CTAs, links (placeholder brand violet) |
| `--primary-fg` | #FFFFFF | #FFFFFF | On primary |
| `--accent-gold` | #B8860B | #E3B341 | Premium tier, verified badge |
| `--success` | #15803D | #22C55E | Confirmed, paid |
| `--warning` | #B45309 | #F59E0B | Awaiting, pending |
| `--danger` | #B91C1C | #EF4444 | Unavailable, overdue |
| `--info` | #1D4ED8 | #60A5FA | Informational |

### Typography
| Role | Font | Size / line | Weight |
|---|---|---|---|
| Display | Inter Tight (or Satoshi) | 48/56 (mobile 34/40) | 700 |
| H1 | Inter Tight | 36/44 | 700 |
| H2 | Inter Tight | 28/36 | 600 |
| H3 | Inter | 20/28 | 600 |
| Body | Inter | 16/24 | 400 |
| Small | Inter | 14/20 | 400 |
| Caption | Inter | 12/16 | 500 |
| Numbers (money) | Inter, `tabular-nums` | — | 600 |

### Spacing, radius, elevation
- Spacing scale (px): 4, 8, 12, 16, 24, 32, 48, 64, 96.
- Radius: `sm 6`, `md 10`, `lg 16`, `xl 24`, `full`.
- Shadow: only `sm` on cards in light mode; borders in dark mode.
- Grid: 12 columns, max width 1280, gutter 24 (16 mobile).
- Breakpoints: `sm 640`, `md 768`, `lg 1024`, `xl 1280`.

### Motion
- 150 ms ease-out for hovers; 250 ms for sheets/modals; respect `prefers-reduced-motion`.

## 4. Core components (shadcn/ui based)
| Component | Notes |
|---|---|
| `TalentCard` | Photo 4:5, name, category chips, base city, languages, fee band, verified badge, representation label, favourite heart |
| `VerifiedBadge` | Gold tick + tooltip: "Representation verified by our team" |
| `RepresentationLabel` | "Talent-managed" / "Agency-managed" / "Platform-coordinated" |
| `FeeBand` | "₹2L – ₹4L · indicative" or "On request"; tooltip explaining what changes the final price |
| `AvailabilityPill` | Colour + label per status (table below) |
| `StatusTimeline` | Vertical steps: Brief → Availability → Quote → Contract → Advance → Confirmed → Event → Completed |
| `QuoteTable` | Line items, subtotal, GST, total, milestones, validity countdown |
| `MilestoneCard` | Label, amount, due date, status, Pay button |
| `FilterBar` | Category, city, date, budget, language, event type; mobile = bottom sheet |
| `EnquiryStepper` | 3 steps: Event → Talent & budget → Contact (+OTP) |
| `KanbanBoard` (admin) | Columns per lead stage, card = ref, customer, date, city, talents, owner avatar, value |
| `DataTable` (admin) | Sortable, filters, column visibility, saved views |
| `MoneyInput` (admin) | ₹ prefix, Indian grouping (1,00,000), stores paise |
| `RoleGate` | Hides restricted UI (API still enforces) |

### Availability pill mapping
| Status | Customer label | Colour |
|---|---|---|
| NOT_CHECKED | Request received | neutral |
| AWAITING_MANAGER | Awaiting manager confirmation | warning |
| HOLD_REQUESTED | Hold requested | warning |
| AVAILABLE | Available — quote coming | info |
| TENTATIVE | Tentatively available | info |
| UNAVAILABLE | Not available on this date | danger |
| CONFIRMED | Confirmed | success |

## 5. Information architecture

### Customer web (`apps/web`)
```
/                         Home
/talent                   Browse all (filters)
/talent/[category]        Category listing
/[city]/[category]        SEO landing (e.g. /guwahati/singers)
/t/[slug]                 Talent profile
/enquire                  Event brief (prefill ?talent=slug)
/compare                  Compare (≤3)
/how-it-works  /corporate  /about  /contact  /faq
/legal/terms  /legal/privacy  /legal/cancellation
/account                  Dashboard
/account/bookings/[ref]   Booking detail
/account/favourites
/talent-portal            Talent/rep home (bookings, payouts, blackout dates)
```

### Admin (`apps/admin`)
```
/                 Overview dashboard
/leads            Pipeline (Kanban / table)
/leads/[ref]      Lead workspace (brief, bookings, quotes, contract, payments, activity)
/talents          Talent list
/talents/[id]     Profile, media, rate cards, reps, blackouts
/reps             Representatives + verification
/payments         Milestones, collections, overdue
/payouts          Pending / paid payouts
/analytics
/settings         Users & roles, templates, fees, categories
/audit
```

## 6. Key screens

### 6.1 Home
- Hero: headline "Book verified talent for any event", sub "Singers, DJs, comedians, speakers and creators — with contracts, secure payments and a dedicated manager." Search bar (category · city · date) + "Plan with an expert" secondary CTA.
- Category tiles (launch categories).
- "How it works" 4 steps: Brief → We verify → Quote & contract → Enjoy the event.
- Featured talent row (clearly marked "Featured" if paid).
- Trust strip: verified representation, GST invoices, secure payments, dedicated manager.
- Corporate band: "Planning an annual day or conference?" → /corporate.
- FAQ, footer.

### 6.2 Listing
- Desktop: left filter rail, right grid (3–4 cols). Mobile: sticky filter button → bottom sheet, 2-col grid.
- Sort: Relevance, Fee low→high, Fee high→low.
- Empty state: "No match? Tell us your brief and we'll source talent for you." → /enquire.

### 6.3 Talent profile
- Media gallery + showreel embed; name, categories, verified badge, representation label.
- Sticky right card (bottom bar on mobile): fee band, "What's included in a quote", date picker, CTA **Check Availability** / **Request to Book**.
- Sections: About, Performs at (event types), Languages, Past events, Rider summary (if public), FAQ.
- Disclaimer (small): "Fees and availability are confirmed with the authorized representative before booking."

### 6.4 Enquiry stepper
1. Event: type, date (+alt), city, venue, audience size, duration.
2. Talent & budget: preselected talent(s) chips + "Add more", budget range slider, language, notes.
3. Contact: name, phone (OTP), email, company + GSTIN (optional), consent checkbox.
- Success: ref number, "What happens next" timeline, expected response time, WhatsApp contact button.

### 6.5 Booking detail (customer)
- Header: ref, event, date, city, overall status pill.
- `StatusTimeline` left; right: current action card (e.g. "Review your quote", "Pay advance ₹1,20,000", "Sign contract").
- Tabs: Quote (versions), Contract, Payments, Documents, Brief.

### 6.6 Admin lead workspace
- 3-column: left = brief + customer; centre = bookings per talent (availability pill, rep contact, quote builder); right = activity timeline + notes + tasks.
- Stage dropdown shows only allowed transitions; disabled ones show the guard reason on hover.
- Quote builder: rate card hint (min / selling), line items, live totals, margin badge (Accounts/Admin only), approval banner if below threshold.

### 6.7 Admin dashboard
- KPI cards: open leads, quotes sent, confirmed this month, GMV, conversion %, avg time-to-confirm.
- Pipeline funnel, upcoming events (7 days), overdue payments, pending payouts (finance only).

## 7. Content rules
- Money: ₹ with Indian grouping, "₹1,20,000"; lakhs shorthand in bands "₹2L – ₹4L".
- Dates: "Sat, 14 Feb 2027"; times "7:30 PM IST".
- Never display a single exact fee publicly.
- Celebrity images only with rights; caption "Representation verified" only when true.

## 8. Accessibility
- Contrast ≥ 4.5:1 for text; focus rings visible; all interactive elements keyboard-reachable.
- Form errors inline + summarised; labels always visible (no placeholder-only labels).
- Images: alt text from talent name + context.

## 9. Deliverables in Phase 0
- [ ] Figma: tokens, components, home, listing, profile, enquiry, booking detail (mobile + desktop)
- [ ] Figma: admin pipeline, lead workspace, quote builder, talent edit, dashboard
- [ ] Clickable prototype of enquiry → quote accept → pay
- [ ] Brand: name, logo, final primary colour
