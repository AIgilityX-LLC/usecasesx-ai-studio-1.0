# UseCasesX™ Application Audit — 25 July 2026

Read-only inventory & classification of the current codebase against the
14 August 2026 launch scope. No code, schema, config or data changed.

## Contents

1. [`route-inventory.md`](./route-inventory.md) — every route with gate, layout, data source, status.
2. [`feature-journey-map.md`](./feature-journey-map.md) — Discover → Advisory coverage.
3. [`retain-repair-defer-matrix.md`](./retain-repair-defer-matrix.md) — decision per capability.
4. [`dead-and-duplicate.md`](./dead-and-duplicate.md) — dead CTAs, mock data, duplicates, orphans.
5. [`top-risks.md`](./top-risks.md) — top 10 user-facing + top 10 engineering risks.

## Method

- Enumerated all 64 files in `src/routes/` (60 app routes + 4 auth/public).
- Parsed `head()`, gate wrappers (`RequireRoles`, `RequirePlan`, `Can`, `useEntitlement`, `usePlan`), redirects, and stub components (`ComingSoonGate`, `ModuleStub`).
- Cross-checked `AppSidebar.tsx` (`CORE / STUDIO_PRO / INTEGRATIONS / ADMIN / ACCOUNT`) and `SiteShell` top nav vs the route map.
- Distinguished **UI completeness** from **backend/data completeness**: any route reading `MOCK_USE_CASES` is not "production-ready" regardless of polish.
- Read-only Supabase inspection only where needed for evidence.

## Status legend

- **prod** — production-ready (live data, gates in place, states covered).
- **incomplete** — real UI, partial data or missing states.
- **prototype** — UI exists but backed by mock data.
- **stub** — `ComingSoonGate` / `ModuleStub` placeholder.
- **redirect** — file-route that only re-routes elsewhere.
- **orphan** — real route, unreachable from nav.
- **broken** — visibly failing.
