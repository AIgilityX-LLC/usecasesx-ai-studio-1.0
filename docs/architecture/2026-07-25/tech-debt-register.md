# Technical Debt Register — 25 July 2026

Effort: S ≤ ½d · M ½–2d · L > 2d.
Phase: **A** = before launch, **B** = post-launch (Sep), **C** = Enterprise runway.

| ID | Area | Evidence | Impact | Effort | Phase | Launch blocker |
|---|---|---|---|---:|:---:|:---:|
| D1 | Mock data in Pro surfaces | `_app.my-use-cases.tsx`, `_app.reports.tsx`, `MockUseCaseCard.tsx` import `MOCK_USE_CASES` | Users see fake data as their own | M | A | ✅ |
| D2 | Local-storage domain stores | `usecasex.studio.store.ts`, `usecasex.compare.store.ts` | No cross-device, no audit | M | B | — |
| D3 | Direct DB calls in components | `AddToCollectionButton`, `AddToStudioBoardDialog`, `DecisionHistory`, `EmailVerificationBanner`, `EntitlementLockCard`, `SiteShell` all import `@/integrations/supabase/client` | Hard to test, bypasses server-fn boundary | S–M | A/B | — |
| D4 | Inline `supabase.*` in 17 routes | `grep supabase\\. src/routes/_app*.tsx \| wc -l = 17` | Same coupling; higher client bundle risk | M | B | — |
| D5 | Oversized route files | `_app.administration.tsx` 1032, `_app.boards.$boardId.tsx` 929, `_app.use-cases.$slug.tsx` 734, `_app.studio.portfolio.tsx` 580, `_app.reports.tsx` 542 | Slow to edit safely | L | B | — |
| D6 | Duplicate stub primitives | `ComingSoonGate` (`/roadmap`, `/decision`) vs `ModuleStub` (`/patterns`, `/impact-assessment`) | Drift over time | S | B | — |
| D7 | Types + logic + store mixed | `usecasex.store.ts` 264 LOC | Blocks type reuse and refactor | M | B | — |
| D8 | Redirect-only sidebar links | `/feasibility`, `/data-readiness`, `/blueprint` → `/studio` | User confusion | S | A | ✅ |
| D9 | Tenancy inconsistent | `workspace_id` present on `boards`/`collections`/`portfolios`; `saved_use_cases`, `use_case_scores`, `feasibility_scores` scoped by `auth.uid()` only | Enterprise blocker | L | C | — |
| D10 | Manual validation | `usecasex.studio.functions.ts` parses input by hand; several `.functions.ts` files lack Zod | Runtime type risk | M | B | — |
| D11 | Missing `errorComponent` | Sample: `_app.reports.tsx`, `_app.studio.portfolio.tsx`, `_app.dashboard.tsx` | Blank screen on failure | S | A | — |
| D12 | Fetch + presentation mixed | `ProDashboard.tsx` 370 LOC | Hard to swap mock → live | S | A | ✅ |
| D13 | Fat modal | `LeadCaptureModal.tsx` 569 LOC | Bug surface | M | B | — |
| D14 | Grab-bag service | `usecasex.services.ts` 753 LOC | Blocks per-domain evolution | L | C | — |
| D15 | No `WorkspaceContext` | Pages resolve workspace via ad-hoc profile joins | Blocks Enterprise multi-workspace | M | C | — |
| D16 | `audit_events` producers not wired | Table exists in schema; no writer callers | Governance/compliance gap | M | B | — |
| D17 | Public API auth surface | `src/routes/api/public/usecasex/*` uses publishable key; verify rate-limit/observability | External abuse | S | A | — |
| D18 | Orphan admin-adjacent routes | `/module-analytics`, `/entitlement` reachable to any auth user | Info disclosure | S | A | ✅ |
| D19 | Terminology drift | "Portfolio Roadmap" vs "RoadmapX™" vs "Portfolio" | Executive polish | S | A | — |
| D20 | Test coverage focused on nav/RLS | `tests/*` has good nav + RLS specs; thin on Studio flows | Regression risk mid-launch | M | B | — |
