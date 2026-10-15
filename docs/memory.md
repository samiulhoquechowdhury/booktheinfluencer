# Memory — Project Context Log

> Living file. **Read at the start of every session; update at the end.**
> Keep it short and current: facts, decisions, status, gotchas. Detail lives in the other docs.

---

## 1. Project snapshot
- **What:** India-first *managed* talent booking platform — marketplace + booking engine + talent CRM (+ influencer campaigns later).
- **Who books:** corporates, event/wedding planners, brands/agencies, colleges/hotels/malls, private customers.
- **Model:** Request to Book / Check Availability → verify with rep → quote → contract → advance → confirmed → event → settlement.
- **Revenue:** margin/commission 10–25%, service fee 5–10%, campaign mgmt, retainers, featured profiles.
- **Current phase:** Phase 0 — Discovery & UX.
- **Docs:** `prd.md` · `srs.md` · `trd.md` · `architecture.md` · `design.md` · `rules.md` · `task.md`

## 2. Stack (locked unless a decision below changes it)
Turborepo + pnpm · Next.js 15 (web, admin) · NestJS 11 (api, worker) · Prisma + PostgreSQL 16 · Redis + BullMQ · S3/R2 · Tailwind + shadcn/ui · Zod shared schemas · TanStack Query · Vitest/Supertest/Playwright · GitHub Actions · India region hosting.

## 3. Non-negotiables (short form — full list in `rules.md §0`)
- Confirmation is system-derived: quote accepted + contract signed + advance paid + rep accepted.
- Margin/rate cards never reach customer or talent responses.
- Money = paise `BigInt`; % = bps `Int`.
- No "Book Now", no exact public fees.

## 4. Decisions log
| Date | Decision | Why | Ref |
|---|---|---|---|
| 2026-10-16 | Merge two Sept 2026 drafts into one plan; 5 phases with 2 gates | Single source of truth | Plan doc |
| 2026-10-16 | Modular monolith (NestJS), separate admin app | Small team, transactional money flows | ADR-1, ADR-2 |
| 2026-10-16 | Web/PWA first, native apps Phase 4 | Speed to pilot | ADR-7 |
| 2026-10-16 | Postgres full-text search for MVP | No extra infra | ADR-5 |
| 2026-10-16 | Provider adapters for payment/e-sign/messaging | Vendors not yet chosen | ADR-6 |
| 2026-10-16 | Build `apps/web` frontend first on mock data via typed `lib/api/*` (fake latency) | Validate UX before backend; swap to NestJS later without UI changes | Frontend brief |
| 2026-10-16 | Add libs outside trd §1: `motion`, `gsap` (+ScrollTrigger), `lenis`, `lucide-react`, `next-themes`, `react-day-picker`, `canvas-confetti`, `sonner`, `vaul`, `@date-fns/tz` | Motion/scroll system + UI primitives requested in brief; all MIT, maintained | Frontend brief |
| 2026-10-16 | No Lottie — empty-state loops in CSS/SVG | Smaller bundle, no extra dep | Frontend brief |
| 2026-10-16 | Tailwind v4 (CSS-first `@theme`); tokens shipped as CSS from `packages/ui` | shadcn/ui current default; no JS preset needed | Frontend brief |
| 2026-10-16 | Display font Clash Display (Fontshare, self-hosted), fallback Inter Tight 800; body Inter | Free for commercial use; Neue Montreal is paid | Frontend brief |
| 2026-10-16 | Hero H1 "BOOK THE TALENT. / WE HANDLE THE REST."; design.md headline used as sub-copy | Brief overrides design.md §6.1 headline (accepted at "go") | Frontend brief |
| 2026-10-16 | Availability labels follow design.md §4 table (covers all 7 statuses) | srs AVL-2 lacks TENTATIVE and differs on NOT_CHECKED | Frontend brief |
| 2026-10-16 | Mock "Pay" opens a gateway hand-off only; never mutates payment state client-side. CONFIRMED appears only in seeded data | Golden rules 1 & 4 | Frontend brief |
| 2026-10-16 | Dev-only session switcher (guest/customer/talent) stands in for OTP auth | No backend yet | Frontend brief |
| 2026-10-16 | Placeholder brand name kept in one constant; `/compare` (CAT-9) deferred; paid placements tagged "Featured" | Brand undecided; not in brief page list; design.md §6.1 | Frontend brief |

## 5. Open questions
- [ ] Brand name / domain
- [ ] Launch geography (single city/region vs pan-India)
- [ ] Launch categories (proposed: singers, DJs, comedians, anchors/speakers, creators)
- [ ] Commission %, service fee %, margin floor for approval
- [ ] Payment gateway (assumed Razorpay) · e-sign vendor · SMS/WA vendor
- [ ] Pilot target N bookings
- [ ] MVP budget ceiling and team size
- [ ] Legal/tax: GST on commission vs pass-through, TDS, intermediary status, DPDP compliance
- [ ] Availability label wording: design.md §4 vs srs AVL-2 disagree (NOT_CHECKED "Request received" vs "Checking availability"; AVL-2 has no TENTATIVE). Using design.md for now — confirm.
- [ ] Hero headline: design.md §6.1 vs frontend brief. Using brief's line as H1 — confirm with brand work.
- [ ] Final display font licence check once brand is locked (Clash Display placeholder).

## 6. Status
| Area | State | Notes |
|---|---|---|
| Planning docs | Done (v1.0) | 16 Oct 2026 |
| Design | Not started | T-010..T-013 |
| Repo / foundation | Not started | T-100.. |
| Integrations | Not started | Blocked on vendor choice |

## 7. Glossary
Lead = enquiry pipeline record · Booking = one talent at one event · Rep = authorized manager/agency · Fee band = public indicative range · Milestone = scheduled payment part · Payout = amount owed to talent · Margin = selling − payout − costs (internal).

## 8. Gotchas / learnings
_(add as they happen — e.g. gateway webhook quirks, DLT template rejections, Prisma BigInt JSON serialisation)_
- Prisma `BigInt` doesn't serialise to JSON by default → convert in DTO layer (string or number-safe).

## 9. Session log
| Date | Who | What changed |
|---|---|---|
| 2026-10-16 | Planning | Created all docs v1.0 |
