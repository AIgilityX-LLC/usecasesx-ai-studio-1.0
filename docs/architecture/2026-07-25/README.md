# Architecture Assessment — 25 July 2026

Read-only assessment. No code, schema, or config changes.

1. [`architecture-map.md`](./architecture-map.md) — current layered map + clean/leaky boundaries
2. [`tech-debt-register.md`](./tech-debt-register.md) — 20 ranked items with effort + phase
3. [`incremental-refactor-plan.md`](./incremental-refactor-plan.md) — Phase A (pre-launch), Phase B (post-launch), Phase C (Enterprise runway)
4. [`high-risk-files.md`](./high-risk-files.md) — do-not-casually-touch list

## Headline

- **Ship-ready**: routing, Discover, Boards, Repository, Submit, Admin, public API, AI provider surface, RLS baseline.
- **Launch-blocking debt**: mock data still consumed by `/my-use-cases`, `/reports`, `ProDashboard`; three sidebar items are redirect-only.
- **Enterprise-blocking debt**: local-storage Studio/Compare stores; inconsistent `workspace_id` on `saved_use_cases`, `use_case_scores`, `feasibility_scores`; grab-bag `usecasex.services.ts` (753 LOC).
- **No whole-app rewrite required.** Phase A is ~1½ engineer-weeks of additive work; Phase B/C is post-launch.
