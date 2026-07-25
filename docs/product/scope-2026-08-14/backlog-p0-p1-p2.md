# Prioritized Backlog — 14 August 2026

Source: `docs/audit/2026-07-25/retain-repair-defer-matrix.md`, `top-risks.md`, `ux/recommendations.md`, `database/migration-plan.md`.

Priority: **P0** launch blocker · **P1** required outcome · **P2** post-launch.
Decision: Ship (S) · Repair (R) · Simplify (Sm) · Flag (F) · Defer (D).

## P0 — must land by 3 Aug core-journey freeze

| # | Item | Decision | Outcome | Dependency |
|---|---|---|---|---|
| P0-1 | `/my-use-cases` mock → live `saved_use_cases` join | R | Pro user sees only their own saved rows | RLS verified on `saved_use_cases` |
| P0-2 | `/reports` mock → live saved cases + portfolios | R | Zero mock imports in `_app.reports.tsx` | P0-1 |
| P0-3 | Delist Feasibility / Data-Readiness / Blueprint top-level from sidebar; keep redirects | Sm | No dead sidebar CTAs | AppSidebar |
| P0-4 | Mobile home overflow (scrollWidth 413 vs 390) | R | scrollWidth ≤ viewport at 390px | none |
| P0-5 | `/repository` empty-state populated + labelled search/sort | R | Non-empty result on cold load; axe pass | Seed / grants verified |
| P0-6 | Lock `/entitlement` to admin + `noindex` | Sm | Non-admin gets 404/redirect | `RequireRoles` |
| P0-7 | Gate `/module-analytics` with `RequireRoles` | R | Non-admin cannot reach page | none |
| P0-8 | DB Phase A1 additive: tighten anon-INSERT `WITH CHECK` on `lead_captures` + event ingest | R | RLS test proves anon cannot forge identity | `test:rls` |
| P0-9 | `/auth` label placeholders → real `<label>` | R | axe critical = 0 on `/auth` | none |
| P0-10 | Dashboard remove any hardcoded KPI numbers | R | All numbers derived from live queries | P0-1 |

## P1 — required outcomes, land by 9 Aug feature freeze

| # | Item | Decision | Outcome | Dependency |
|---|---|---|---|---|
| P1-1 | Studio drafts server-persisted (draft flag on `use_cases` or `studio_drafts`) | R | Draft survives device change | Additive migration |
| P1-2 | Per-use-case Feasibility wired to `feasibility_scores` | R | Form persists + summary card renders | Table grants |
| P1-3 | Per-use-case Data Readiness wired to `data_readiness_assessments` | R | Form persists + summary card renders | Table grants |
| P1-4 | Portfolio Roadmap `/studio/portfolio` live `portfolios` + `portfolio_items` | R | Empty/loading/error states pass | RLS |
| P1-5 | Deliverables hub — one working export path per type + empty states | R | User can export ≥ 1 deliverable | P1-1 |
| P1-6 | Unify `RequirePlan` wrapper across Pro routes | Sm | One enforcement path | none |
| P1-7 | Consolidate nav sources of truth (AppSidebar / SiteShell / EXPECTED_REDIRECTS) | Sm | `check:nav-integrity` green | none |
| P1-8 | Sample-data disclaimer component sweep on any remaining sample UIs | R | No implicit "your data" framing | none |
| P1-9 | SEO/head sweep — unique `head()` per content route | R | Titles < 60, descriptions < 160, og/twitter set | none |
| P1-10 | Fair-use meter (advisory only, server-logged) | R | Meter renders per Pro user | Activation events table |
| P1-11 | Activation event logging (`activation_events`) | R | 8 events fire end-to-end | Additive migration |
| P1-12 | Per-use-case SARPI, AdvisorX, C3G, RoadmapX marked Coming Soon (no live claim) | F | Zero UI states imply live capability | none |

## P2 — post-launch backlog

| # | Item | Decision |
|---|---|---|
| P2-1 | `/decision`, `/impact-assessment`, `/api-integration` | D — hide from nav, keep files |
| P2-2 | Blueprint editor | D |
| P2-3 | Consolidate `ComingSoonGate` vs `ModuleStub` primitives | D |
| P2-4 | Collections share advanced flows if token flow unverified | D |
| P2-5 | Fair-use hard enforcement + billing | D |
| P2-6 | Enterprise roles beyond launch five, SSO, custom domains | D |
| P2-7 | Terminology unification ("Portfolio Roadmap" vs "RoadmapX") | D |
