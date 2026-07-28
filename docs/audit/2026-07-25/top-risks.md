# Top Risks — 25 July 2026

Severity (Sev) 1 = launch blocker, 2 = credibility issue, 3 = post-launch.
Likelihood (Lik) H/M/L.

## Top 10 user-facing risks

| #   | Risk                                                                                                                | Sev | Lik | Evidence                                          |
| --- | ------------------------------------------------------------------------------------------------------------------- | --- | --- | ------------------------------------------------- |
| U1  | `/my-use-cases` shows sample data as if it were the user's saved shortlist                                          | 1   | H   | `_app.my-use-cases.tsx` imports `MOCK_USE_CASES`  |
| U2  | `/reports` generates PDFs against mock use cases — Pro users get fake exports                                       | 1   | H   | `_app.reports.tsx` imports `MOCK_USE_CASES`       |
| U3  | Three sidebar items (Feasibility, Data Readiness, Blueprint) all land on `/studio` — feels broken                   | 1   | H   | `_app.{feasibility,data-readiness,blueprint}.tsx` |
| U4  | Coming-Soon surfaces (AdvisorX, C3G, Roadmap) appear as first-class sidebar items and imply live capability         | 2   | H   | Sidebar `STUDIO_PRO` + `INTEGRATIONS`             |
| U5  | Studio drafts vanish on device change — persisted only in `localStorage`                                            | 2   | H   | `usecasex.studio.store`                           |
| U6  | Compare tray + reports both offer PDF export; unclear which is canonical                                            | 3   | M   | `_app.compare.tsx` + `_app.reports.tsx`           |
| U7  | Orphan pages (`/decision`, `/impact-assessment`, `/api-integration`) reachable via URL guessing show placeholder UI | 2   | M   | routes above                                      |
| U8  | Terminology drift ("Portfolio Roadmap" vs "RoadmapX™" vs "Portfolio") undermines executive polish                   | 3   | H   | sidebar + `/roadmap` head                         |
| U9  | Dashboard KPIs risk being static / non-personalized                                                                 | 2   | M   | `_app.dashboard.tsx` + `ProDashboard.tsx`         |
| U10 | Loading/empty/error states missing on several Pro pages (Reports, Studio Portfolio error path)                      | 2   | M   | route sweep                                       |

## Top 10 engineering risks

| #   | Risk                                                                                                                                                                    | Sev | Lik | Evidence                                                                |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | --- | ----------------------------------------------------------------------- |
| E1  | Mock data leaks into Pro pages, easy for future edits to regress                                                                                                        | 1   | H   | shared `MOCK_USE_CASES` import                                          |
| E2  | Local-only stores (`studio`, `compare`) cannot be observed, backed up, or audited                                                                                       | 2   | H   | `usecasex.*.store.ts`                                                   |
| E3  | Duplicate stub primitives (`ComingSoonGate` vs `ModuleStub`) drift over time                                                                                            | 3   | H   | components + routes                                                     |
| E4  | 5 redirect-only route files that still appear in nav — silent dead code                                                                                                 | 3   | H   | `_app.{feasibility,data-readiness,blueprint,governance,portfoliox}.tsx` |
| E5  | Orphan admin-adjacent route `/module-analytics` not gated by `RequireRoles`                                                                                             | 2   | M   | `_app.module-analytics.tsx`                                             |
| E6  | `/entitlement` debug page reachable to any authenticated user                                                                                                           | 2   | M   | `_app.entitlement.tsx`                                                  |
| E7  | Multiple sidebar/nav sources of truth (`AppSidebar` `CORE/STUDIO_PRO/...`, `SiteShell TOP_NAV`, `EXPECTED_REDIRECTS`) risk divergence                                   | 3   | H   | `AppSidebar.tsx`, `SiteShell.tsx`, `nav-integrity.ts`                   |
| E8  | Pro-tier enforcement inconsistent: some pages use `RequirePlan` wrapper, others check `usePlan()` inline                                                                | 2   | M   | `_app.pro.tsx` vs `_app.repository.tsx`, `_app.sarpi.tsx`               |
| E9  | New Pro tables (`feasibility_scores`, `data_readiness_assessments`, `use_case_scores`) may have RLS but unverified grants — needs read-only spot-check before wiring UI | 1   | M   | `docs/baseline/schema-*.md`                                             |
| E10 | `_app.reports.tsx` mixes client-side PDF generation with mock data; refactor risk when moving to live                                                                   | 2   | M   | `_app.reports.tsx`                                                      |

## Immediate follow-ups (no code changes)

1. Approve retain/repair/defer matrix.
2. Prompt-06: apply P0 repairs (mock → live for `/my-use-cases`, `/reports`, `/dashboard`; delist redirect-only sidebar items) as small, isolated edits behind a review.
3. Prompt-07: consolidate stub primitives and lock down `/entitlement` + `/module-analytics`.
