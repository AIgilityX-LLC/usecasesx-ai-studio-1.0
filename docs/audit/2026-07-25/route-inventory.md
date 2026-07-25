# Route Inventory — 25 July 2026

Gate = auth requirement. Layout = wrapper. Data = primary source.
Evidence = `file:line` in `src/`.

## Public / auth surface

| Path | Gate | Layout | Purpose | Data | Status | Evidence |
|---|---|---|---|---|---|---|
| `/` | public | SiteShell | Marketing home | static + segments | prod | `routes/index.tsx` |
| `/auth` | public | none | Sign in / up | supabase.auth | prod | `routes/auth.tsx` |
| `/forgot-password` | public | none | Password reset request | supabase.auth | prod | `routes/forgot-password.tsx` |
| `/reset-password` | public | none | Password reset commit | supabase.auth | prod | `routes/reset-password.tsx` |
| `/c/$token` | public | none | Collection share link | `collections` | incomplete | `routes/c.$token.tsx` |
| `/sitemap.xml` | public | none | SEO | static | prod | `routes/sitemap[.]xml.ts` |
| `/api/public/usecasex/*` | public | API | Public read API | `use_cases` | prod | `routes/api/public/usecasex/*` |

## `_app` (authenticated shell) — Core navigation

| Path | Gate | Layout | Purpose | Data | Status | Evidence |
|---|---|---|---|---|---|---|
| `/dashboard` | auth | SiteShell/Sidebar | Pro portfolio dashboard | profiles + `ProDashboard` | incomplete | `_app.dashboard.tsx` |
| `/repository` | auth | SiteShell/Sidebar | Global catalogue | `use_cases` live | prod | `_app.repository.tsx` |
| `/discover` | auth | SiteShell/Sidebar | Segment wizard | `use_cases` + `segments` | prod | `_app.discover.tsx` |
| `/quick-wins` | auth | SiteShell/Sidebar | Value × complexity matrix | `use_cases` live | prod | `_app.quick-wins.tsx` |
| `/roi-calculator` | auth | SiteShell/Sidebar | ROI estimator | client math only | prod | `_app.roi-calculator.tsx` |
| `/insights` | auth (Pro up-sell) | SiteShell/Sidebar | Deployment intelligence | `getInsights` server fn | incomplete | `_app.insights.tsx` |
| `/studio` | auth | SiteShell/Sidebar | Studio drafts hub | `usecasex.studio.store` (local) | incomplete | `_app.studio.tsx` |
| `/ai-use-case-studio` | auth | SiteShell/Sidebar | Studio landing | static + sample | prod | `_app.ai-use-case-studio.tsx` |
| `/my-use-cases` | auth | SiteShell/Sidebar | Saved shortlist | **MOCK_USE_CASES** + local store | prototype | `_app.my-use-cases.tsx` |
| `/boards` | auth | SiteShell/Sidebar | Board index | `boards` table | prod | `_app.boards.index.tsx` |
| `/boards/$boardId` | auth | SiteShell/Sidebar | Board detail | `boards` + items | prod | `_app.boards.$boardId.tsx` |
| `/boards/collections` | auth | SiteShell/Sidebar | Collections view | `collections` | incomplete | `_app.boards.collections.tsx` |
| `/submit` | auth | SiteShell/Sidebar | Use-case submission | `use_case_submissions` | prod | `_app.submit.tsx` |
| `/patterns` | auth | SiteShell/Sidebar | Pattern library | none | stub (`ModuleStub`) | `_app.patterns.tsx` |
| `/compare` | auth | SiteShell/Sidebar | Compare tray | `use_cases` live | prod | `_app.compare.tsx` |

## `_app` — Studio / Pro (sidebar `STUDIO_PRO`)

| Path | Gate | Purpose | Status | Evidence |
|---|---|---|---|---|
| `/feasibility` | auth | → `/studio` | redirect | `_app.feasibility.tsx` |
| `/data-readiness` | auth | → `/studio` | redirect | `_app.data-readiness.tsx` |
| `/blueprint` | auth | → `/studio` | redirect | `_app.blueprint.tsx` |
| `/roadmap` | auth | Delivery roadmap | stub (`ComingSoonGate`) | `_app.roadmap.tsx` |
| `/portfoliox` | auth | → `/studio/portfolio` | redirect | `_app.portfoliox.tsx` |
| `/governance` | auth | → `/studio` | redirect | `_app.governance.tsx` |
| `/studio/portfolio` | Pro (`RequirePlan`) | Portfolio roadmap | incomplete | `_app.studio.portfolio.tsx` |

## `_app` — Per-use-case Studio (nested under `$id`)

| Path | Gate | Purpose | Status | Evidence |
|---|---|---|---|---|
| `/studio/use-case/$id/` | auth | Use-case cockpit | incomplete | `_app.studio.use-case.$id.index.tsx` |
| `.../feasibility` | Pro | Feasibility scoring | incomplete | `.feasibility.tsx` |
| `.../data-readiness` | Pro | Data readiness | incomplete | `.data-readiness.tsx` |
| `.../blueprint` | Pro | Blueprint builder | incomplete | `.blueprint.tsx` |
| `.../sarpi` | Pro | SARPI readiness | incomplete | `.sarpi.tsx` |
| `.../advisorx` | Pro | AdvisorX guidance | incomplete | `.advisorx.tsx` |
| `.../c3g-governance` | Pro | C3G governance | incomplete | `.c3g-governance.tsx` |
| `.../deliverables` | Pro | Deliverables hub | incomplete | `.deliverables.tsx` |
| `.../deliverable/$type` | Pro | Deliverable editor | incomplete | `.deliverable.$type.tsx` |

## `_app` — Integrations (sidebar `INTEGRATIONS`, top-level shortcuts)

| Path | Gate | Purpose | Status | Evidence |
|---|---|---|---|---|
| `/sarpi` | auth + `useEntitlement` | SARPI landing | incomplete | `_app.sarpi.tsx` |
| `/advisorx` | auth | AdvisorX landing | stub (Coming Soon) | `_app.advisorx.tsx` |
| `/cyberx/c3g/intake` | auth | C3G intake | stub (Coming Soon) | `_app.cyberx.c3g.intake.tsx` |

## `_app` — Admin

| Path | Gate | Purpose | Status | Evidence |
|---|---|---|---|---|
| `/administration` | `RequireRoles` | Admin taxonomy/users | prod | `_app.administration.tsx` |
| `/admin-submissions` | `RequireRoles` | Submission review | prod | `_app.admin-submissions.tsx` |
| `/admin-waitlist` | `RequireRoles` | Waitlist | prod | `_app.admin-waitlist.tsx` |
| `/reports` | auth | Reports | prototype (mock data) | `_app.reports.tsx` |
| `/module-analytics` | auth | Module events | incomplete, orphan | `_app.module-analytics.tsx` |

## `_app` — Account & marketing

| Path | Gate | Purpose | Status | Evidence |
|---|---|---|---|---|
| `/account` / `/account/index` / `/account/security` | auth | Account | prod | `_app.account*.tsx` |
| `/profile` | auth | Profile onboarding | prod | `_app.profile.tsx` |
| `/pricing` | public in shell | Pricing | prod | `_app.pricing.tsx` |
| `/pro` | `RequirePlan` | Pro workspace intro | incomplete | `_app.pro.tsx` |
| `/resources` | public in shell | Resources | prod | `_app.resources.tsx` |
| `/entitlement` | auth | Entitlement debug | orphan | `_app.entitlement.tsx` |
| `/decision` | auth | DecisionX | stub, orphan | `_app.decision.tsx` |
| `/impact-assessment` | auth | ImpactX | stub, orphan | `_app.impact-assessment.tsx` |
| `/api-integration` | auth | API preview | orphan | `_app.api-integration.tsx` |
| `/sectors/$sector` | auth | Sector view | incomplete, orphan | `_app.sectors.$sector.tsx` |
| `/segments/$segment` | auth | Segment view | incomplete, orphan | `_app.segments.$segment.tsx` |
| `/use-cases/$slug` | auth | Use-case detail | prod | `_app.use-cases.$slug.tsx` |

## Summary counts

| Status | Count |
|---|---|
| prod | 20 |
| incomplete | 17 |
| prototype (mock data) | 2 |
| stub (Coming Soon / ModuleStub) | 5 |
| redirect-only | 5 |
| orphan (real route, not in nav) | 6 |
