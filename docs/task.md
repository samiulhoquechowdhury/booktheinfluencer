# Tasks — Talent & Celebrity Booking Platform

> Status: `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocked
> IDs map to requirements in `srs.md`. Estimates are for one full-stack dev (d = day).
> Order within a milestone is the recommended build order.

---

## Phase 0 — Discovery & UX (2–3 weeks)

### M0.1 Decisions
- [ ] T-001 Confirm brand name, domain, logo
- [ ] T-002 Confirm launch geography and 3–5 launch categories
- [ ] T-003 Confirm default commission %, service fee %, margin floor for approval
- [ ] T-004 Choose payment gateway (default Razorpay) and open merchant account
- [ ] T-005 Choose e-sign provider; get sandbox keys
- [ ] T-006 Choose SMS/WhatsApp provider; register DLT templates
- [ ] T-007 Legal: terms, privacy policy, cancellation/refund policy, booking contract template (lawyer)
- [ ] T-008 Tax: GST/TDS treatment of commission vs pass-through (CA)
- [ ] T-009 Sign first manager/agency partners; collect 30+ talent profiles

### M0.2 Design
- [ ] T-010 Design tokens + component library in Figma (`design.md` §3–4)
- [ ] T-011 Customer screens: home, listing, profile, enquiry, booking detail (mobile + desktop)
- [ ] T-012 Admin screens: pipeline, lead workspace, quote builder, talent edit, dashboard
- [ ] T-013 Clickable prototype; 5 user tests (2 corporate, 2 planners, 1 private)

---

## Phase 1 — MVP (8–12 weeks build)

### M1.1 Foundation (week 1–2)
- [~] T-100 Turborepo + pnpm monorepo, apps `web`, `admin`, `api`, `worker`, packages `db`, `schemas`, `ui`, `config`, `utils` (1d)  — _done: `web`, `api` (core), `schemas`, `ui`, `config`, `utils`, `db`; pending: `admin`, `worker`_
- [ ] T-101 Shared ESLint/Prettier/tsconfig, Husky + lint-staged, commitlint (0.5d)
- [x] T-102 Docker Compose: Postgres 16 + Redis (0.5d)  — _`docker-compose.yml`; host ports 5440/6390; `pnpm db:up` / `db:down`; `talent_test` DB for e2e_
- [x] T-103 GitHub Actions: lint, typecheck, test, build (0.5d)  — _`.github/workflows/ci.yml`: Postgres service, Prisma generate + migrate, then turbo lint/typecheck/test/build (simulated locally: all pass)_
- [x] T-104 Prisma schema v1 from `trd.md §4` + first migration + seed (2d)  — _`packages/db`: 23 tables, GIN/trigram indexes, `init` migration, seed = 8 talents + one lead per stage_
- [~] T-105 Zod env validation per app; `.env.example` (0.5d)  — _done for `web` (`lib/env.ts`, checked in next.config), `db` and `api` (`src/config/env.ts`); `worker` when it exists_
- [x] T-106 NestJS core: config, Prisma service, pino logger, global error filter, Zod pipe, request id (1d)  — _`apps/api`: `/v1` prefix, helmet, strict CORS, `GET /v1/health`; 9 e2e tests (Supertest + Docker DB); tsup production build_
- [x] T-107 `packages/utils`: money (paise, bps, formatINR, tax rounding) + tests (1d)
- [x] T-108 `packages/utils`: lead/booking state machine + tests (1d)  — _`packages/utils/src/stateMachine.ts`; 19 tests incl. every rejected move_
- [x] T-109 `packages/ui`: tokens, Tailwind preset, shadcn setup, base components (2d)  — _Tailwind v4 CSS tokens instead of a JS preset_
- [ ] T-110 Staging environments (web, admin, api, worker, DB, Redis, buckets) (1d)

### M1.2 Auth & users (week 2–3) — AUTH-1..5
- [x] T-120 OTP send/verify (provider adapter, rate limits) (1.5d)  — _`apps/api/src/auth`; console SMS adapter until a vendor is chosen; 5-min codes, 5 attempts, 30 s resend, 3/10 min per phone & IP_
- [x] T-121 Staff email/password login + TOTP MFA (1.5d)  — _scrypt passwords (`@repo/db`), mandatory TOTP with enrolment on first sign-in, AES-256-GCM secrets, replay block, 10/15 min lockout_
- [x] T-122 JWT access + rotating refresh cookie, logout (1d)  — _15-min HS256 access token; refresh in httpOnly SameSite=Strict cookie on /v1/auth; reuse of a rotated token revokes all sessions_
- [~] T-123 Roles guard, `@Public`, ownership guard (1d)  — _global sign-in guard + `@Public()` + `@Roles()` done; ownership guard comes with the first owned resources (bookings)_
- [x] T-124 Invite flow for talent/rep and staff (1d)  — _7-day single-use links (HMAC stored); staff accept with a password then MFA, talent/reps with a phone OTP; links talent/rep records; links returned (sending waits for the notifications worker)_
- [~] T-125 Admin: users & roles screen (1d)  — _API done (`/v1/admin/users`, role changes revoke sessions, self-lockout blocked); screen waits for `apps/admin`_
- [x] T-126 Audit interceptor + `AuditLog` writes (1d) — AUD-1..3  — _interceptor logs every /admin mutation (incl. failures); services add before/after; secrets redacted; `GET /v1/admin/audit`_

### M1.3 Talent catalogue (week 3–5) — CAT, ADM
- [ ] T-140 Categories CRUD (admin) (0.5d)
- [ ] T-141 Talent CRUD API + admin form (profile, categories, tags, languages, cities, tier, status, representation) (2d)
- [ ] T-142 Media upload via presigned URLs, ordering, cover image (1.5d)
- [ ] T-143 Rate cards (internal) UI + API (1d)
- [ ] T-144 Representatives CRUD, link to talents, KYC upload, verification status (1.5d)
- [ ] T-145 Blackout dates (admin) (0.5d)
- [ ] T-146 Public catalogue API: list, filters, full-text search, pagination (2d)
- [x] T-147 Serializer tests: public talent DTO has no rate card fields (0.5d)  — _mock + NestJS: strict-schema parse and leak checks on every catalogue route_
- [~] T-148 Web: listing page with filters (desktop rail, mobile sheet) (2d)  — _UI done on mock API (`apps/web`); API part pending_
- [~] T-149 Web: talent profile page with sticky CTA, fee band, disclaimer (2d)  — _UI done on mock API (`apps/web`); API part pending_
- [~] T-150 Web: home page (1.5d)  — _UI done on mock API (`apps/web`); API part pending_
- [~] T-151 Web: SEO city/category landing pages, metadata, JSON-LD, sitemap (1.5d)  — _UI done on mock API (`apps/web`); API part pending_
- [~] T-152 Favourites (0.5d)  — _UI done on mock API (`apps/web`); API part pending_
- [ ] T-153 CSV bulk import of talents (SHOULD) (1d)

### M1.4 Enquiry & pipeline (week 5–7) — ENQ, PIPE, AVL
- [ ] T-160 Enquiry API: create lead + draft bookings, ref number, Turnstile (1.5d)
- [~] T-161 Web: enquiry stepper with OTP, success page (2d)  — _UI done on mock API (`apps/web`); API part pending_
- [ ] T-162 Acknowledgement notifications (worker + templates) (1d)
- [ ] T-163 Admin: pipeline Kanban + table views, filters (2.5d)
- [ ] T-164 Stage transition endpoint using state machine; lost reason; activity log (1d)
- [ ] T-165 Admin: lead workspace (brief, bookings per talent, activity, notes) (2.5d)
- [ ] T-166 Availability status per booking + rep acceptance capture (1d)
- [ ] T-167 Auto-assign owner round robin (SHOULD) (0.5d)
- [ ] T-168 Follow-up tasks/reminders (SHOULD) (1d)

### M1.5 Quotes (week 7–8) — QUO
- [ ] T-180 Quote model, versions, line items, tax calc, milestone plan (1.5d)
- [ ] T-181 Admin quote builder with rate card hints, live totals, margin (finance only) (2.5d)
- [ ] T-182 Approval rule (below minimum / margin floor) + approval action (1d)
- [ ] T-183 Quote PDF render in worker (1d)
- [ ] T-184 Send quote: email/WA with secure link (0.5d)
- [~] T-185 Web: quote view, accept (IP + timestamp), request changes, expiry (1.5d)  — _UI done on mock API (`apps/web`); API part pending_
- [~] T-186 Serializer tests: customer quote DTO has no internal cost (0.5d)  — _mock serializer tests pass; NestJS serializer tests pending_

### M1.6 Contracts & payments (week 8–10) — CON, PAY
- [ ] T-200 Documents module: private bucket, presigned GET (0.5d)
- [ ] T-201 Contract: upload PDF or generate from simple template; send via e-sign adapter (2d)
- [ ] T-202 E-sign webhook, status tracking, signed PDF storage (1d)
- [ ] T-203 Payment milestones from accepted quote (0.5d)
- [ ] T-204 Gateway adapter: payment link per milestone (1d)
- [ ] T-205 Gateway webhook: signature verify, idempotency, worker processing (1.5d)
- [ ] T-206 Manual payment entry with proof (Accounts) (0.5d)
- [ ] T-207 Receipts + payment reminders (1d)
- [ ] T-208 Confirmation rule handler → CONFIRMED + notifications (1d)
- [ ] T-209 Webhook replay/duplicate tests; full-lifecycle e2e test (1.5d)

### M1.7 Customer dashboard & talent portal (week 10–11) — CUS, TAL
- [~] T-220 Web: account bookings list (1d)  — _UI done on mock API (`apps/web`); API part pending_
- [~] T-221 Web: booking detail with status timeline, action card, tabs (2d)  — _UI done on mock API (`apps/web`); API part pending_
- [~] T-222 Talent portal: my bookings, my payouts, blackout dates (1.5d)  — _UI done on mock API (`apps/web`); API part pending_
- [~] T-223 Serializer tests: talent DTO has payout only, no selling price/margin (0.5d)  — _mock serializer tests pass; NestJS serializer tests pending_

### M1.8 Ops, settlement, analytics (week 11–12) — OPS, SET, ANA
- [ ] T-240 Ops checklist on booking (SHOULD) (1d)
- [ ] T-241 Mark completed; cancellation flow with reason (1d)
- [ ] T-242 Payout records + mark paid (Accounts) (1d)
- [ ] T-243 Margin calculation on confirmation/settlement (0.5d)
- [ ] T-244 Analytics dashboard: pipeline, GMV, conversion, time-to-confirm, receivables, pending payouts (2d)
- [ ] T-245 Event reminders T-3/T-1, feedback request (0.5d)
- [ ] T-246 Nightly reconciliation job (1d)

### M1.9 Hardening & launch prep
- [ ] T-260 Security review: OWASP checklist, rate limits, headers, CORS, MFA enforcement (1.5d)
- [ ] T-261 Accessibility pass (axe + manual) (1d)
- [ ] T-262 Performance pass: LCP, image optimisation, ISR (1d)
- [ ] T-263 Backups + restore drill (0.5d)
- [ ] T-264 Sentry, uptime monitoring, alerting (0.5d)
- [~] T-265 Legal pages live; consent capture on forms (0.5d)  — _placeholder legal copy + consent checkbox; awaiting T-007 lawyer text_

---

## QA & Pilot (2–4 weeks)
- [ ] T-300 UAT script covering full booking cycle; fix list
- [ ] T-301 Onboard pilot managers; load real talent profiles
- [ ] T-302 Gateway + e-sign live mode
- [ ] T-303 Run N controlled bookings end-to-end (N set in T-003)
- [ ] T-304 Pilot review: KPIs, ops bottlenecks → Phase 2 backlog
- [ ] **GATE 1:** full cycle (onboarding → enquiry → quote → payment → event → settlement) reliable in live bookings

---

## Phase 2 — Management platform (backlog)
- [ ] T-400 Rep/talent self-service: accept / reject / counter quote
- [ ] T-401 Media kit, rider, fee band edits with admin approval
- [ ] T-402 Real-time calendar sync (Google/Outlook) where authorized
- [ ] T-403 Contract template engine with clause library and versions
- [ ] T-404 GST tax invoices
- [ ] T-405 Automated payouts (e.g. RazorpayX), settlement statements
- [ ] T-406 Commission calculation engine per rate card
- [ ] T-407 Refunds via gateway API + policy calculator
- [ ] T-408 WhatsApp automation flows
- [ ] T-409 Event operations module (travel, hotel, rider)
- [ ] T-410 Reviews & ratings
- [ ] T-411 Dispute workflow
- [ ] **GATE 2:** booking operations stable

## Phase 3 — Corporate & influencer (backlog)
- [ ] T-500 Organisations, members, approval chains
- [ ] T-501 Multi-talent requirement → options comparison for corporates
- [ ] T-502 Consolidated billing, corporate membership plans
- [ ] T-503 Campaigns: creation, creator selection, deliverables, draft approvals
- [ ] T-504 Social metrics ingestion, post URLs, reach/engagement reports
- [ ] T-505 Brand dashboard

## Phase 4 — Intelligence & scale (backlog)
- [ ] T-600 AI brief parser → structured filters → ranked shortlist (human verification)
- [ ] T-601 Automated quote suggestions
- [ ] T-602 Recommendations
- [ ] T-603 Multi-city teams, agency accounts
- [ ] T-604 Public API + API keys
- [ ] T-605 React Native apps (customer, talent)
- [ ] T-606 Advanced analytics
