# Incremental Refactor Plan — 25 July 2026

No whole-app rewrite. Every change is additive; routes are preserved; tenancy migrations are deferred to Phase C.

---

## Phase A — Before launch (26 Jul → 12 Aug)

Priority: **preserve routes, replace mock data with live data, remove misleading nav, add missing safety states**.

| Step | Change | Files | Effort | Owner |
|---|---|---|---:|---|
| A1 | Replace `MOCK_USE_CASES` with live `saved_use_cases` join in My Use Cases | `_app.my-use-cases.tsx`, new `src/lib/saved-use-cases.functions.ts` | M | eng |
| A2 | Replace `MOCK_USE_CASES` in Reports; keep sample only for signed-out demo | `_app.reports.tsx` | M | eng |
| A3 | Verify `ProDashboard` KPIs come from live tables; add loading/empty | `_app.dashboard.tsx`, `components/ProDashboard.tsx` | S | eng |
| A4 | Delist redirect-only sidebar links (`/feasibility`, `/data-readiness`, `/blueprint`); keep files (external links may exist) | `components/AppSidebar.tsx` | S | eng |
| A5 | Add `errorComponent` + skeleton to Reports, Studio Portfolio, Dashboard | routes above | S | eng |
| A6 | Add `SampleDataDisclaimer` on Studio landing + any remaining sample-driven surfaces | `_app.ai-use-case-studio.tsx` etc. | S | eng |
| A7 | Role-gate + `noindex` on `/module-analytics` and `/entitlement` | those routes | S | eng |
| A8 | Move the 6 components off inline Supabase into existing `.functions.ts` (no signature changes) | `AddToCollectionButton`, `AddToStudioBoardDialog`, `DecisionHistory`, `EmailVerificationBanner`, `EntitlementLockCard`, `SiteShell` | M | eng |
| A9 | Terminology sweep for "Portfolio" vs "Roadmap" vs "RoadmapX™" | sidebar, `/roadmap`, `/studio/portfolio` | S | eng |
| A10 | Nav-integrity + navbar + RLS + PDF specs pass green | `tests/*` | S | qa |

Explicitly **not** in Phase A: new tables, tenancy refactor, splitting oversized files, replacing local stores, consolidating stub primitives, restructuring `src/lib/**`.

---

## Phase B — Immediately after launch (15–31 Aug)

Priority: **stabilize, then decouple**.

| Step | Change | Notes |
|---|---|---|
| B1 | New `studio_drafts` table (RLS + `workspace_id`); migrate `usecasex.studio.store.ts` from `localStorage` to server-persisted | Feature-flag; keep local fallback for one release |
| B2 | Split `_app.administration.tsx` (1032 LOC) into route + `components/admin/*` subtree | Extract tabs already grouped in `StudioAdminTabs` |
| B3 | Split `_app.boards.$boardId.tsx` (929 LOC) and `_app.use-cases.$slug.tsx` (734 LOC) into presentational subcomponents |  |
| B4 | Consolidate `ComingSoonGate` and `ModuleStub` into a single primitive |  |
| B5 | Introduce `src/domain/**` for shared types (`UseCase`, `Score`, `Portfolio`, `Board`, `Deliverable`); move type exports out of `usecasex.store.ts` first |  |
| B6 | Add Zod validators to every `.functions.ts` handler that still parses by hand; start with `usecasex.studio.functions.ts` |  |
| B7 | Wire `audit_events` producers on Pro governance mutations (score changes, portfolio publish, decision changes) |  |
| B8 | Move `usecasex.compare.store.ts` off `localStorage` behind a `compare_selections` table (workspace-scoped) |  |
| B9 | Rate-limit + basic observability on `src/routes/api/public/usecasex/*` |  |
| B10 | Broaden Playwright coverage: Studio, Deliverables, Reports live-data flows |  |

---

## Phase C — Enterprise runway (Sep–Nov 2026)

Priority: **multi-workspace, service decomposition, AI governance**.

| Step | Change | Notes |
|---|---|---|
| C1 | Introduce `WorkspaceContext` + `useWorkspace()` hook; source current workspace once at the shell | Prereq for C2 |
| C2 | Additive migrations to add `workspace_id` (nullable → default → NOT NULL over 3 releases) to `saved_use_cases`, `use_case_scores`, `feasibility_scores`, `data_readiness_assessments`; update RLS to `workspace_id ∈ my workspaces OR auth.uid()` for the transition | No destructive drops |
| C3 | Split `usecasex.services.ts` (753 LOC) into `services/{scoring,portfolio,reporting,advisory}.ts` |  |
| C4 | Single `src/lib/ai/*` façade with prompt registry, per-request policy check, token budget, audit-event writer; migrate `usecasex.studio.functions.ts` behind it |  |
| C5 | Feature-flagged Enterprise roles beyond launch five (`workspace_owner`, `workspace_admin`, `contributor`, `viewer`, `facilitator`); add `enterprise_admin`, `auditor`, `advisory_partner` |  |
| C6 | `entitlements.ts` reads from a `plan_features` table (currently code-only) |  |
| C7 | Extract `LeadCaptureModal` (569 LOC) into hook + primitives |  |
| C8 | Standardize error handling: every route has `errorComponent`; server fns return `{ data, error }` or throw typed errors |  |

---

## Changes explicitly too risky for the 20-day window

- Any table drop, column drop, rename, or ownership reassignment.
- Multi-workspace tenancy refactor (Phase C).
- Splitting `_app.administration.tsx`, `usecasex.services.ts`, or `LeadCaptureModal.tsx`.
- Replacing Studio/Compare local stores with server persistence.
- Consolidating stub primitives.
- New state or data-fetching framework.
- Any change to `src/integrations/supabase/*` generated files, `src/routeTree.gen.ts`, `.env`, `supabase/config.toml`, `src/router.tsx`, `src/server.ts`, or `src/start.ts`.

---

## Rollback / forward-fix policy

- Every Phase A step is a small PR (≤ ~300 LOC diff) with a rollback commit prepared.
- Data-source flips (A1–A3) live behind a feature flag (`live_saved_cases`, `live_reports`) so a rollback is a config flip, not a revert.
- Nav delist (A4) is a one-line change per group; trivially revertible.
- Post-launch phases require green `bun run test:e2e` + `bun run test:rls` before merge.
