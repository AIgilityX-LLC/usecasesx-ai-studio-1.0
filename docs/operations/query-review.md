# Query review — enterprise production

Review date: 2026-10-28. Goal: reduce latency and load **without** changing business semantics.

## Findings & remediations

| Area | Risk | Remediation |
| ---- | ---- | ----------- |
| `listReviewsForUseCaseFn` + per-review `listOpenItems` | **N+1** | Batched `listOpenItemsForReviews` (single `.in("review_id", …)`) |
| Studio portfolio `ai_use_cases.select("*")` unbounded | **Unbounded + large payload** | Column projection + `.limit(500)` |
| Feasibility / integration loads for portfolio | Unbounded `.in` | `.limit(500)` + narrower selects |
| Module analytics `.limit(5000)` | Large payload | Cap **1000** |
| Gate open items / reviews | Missing indexes | Migration `20261028140000_ops_query_bounds_indexes.sql` |
| Audit filter/export | Hot path | Existing org/created indexes from audit architecture migration |
| Realtime | Unnecessary subscriptions | No `supabase.channel` usage found in app domain code (auth `onAuthStateChange` only) |

## Still watch (follow-ups)

- `workshops.functions.ts` / `opportunities.functions.ts` / `submissions.functions.ts` — several `select("*")`; tighten columns when touching those modules.
- `adminGetCTAAnalytics` — already limited (default 500); keep callers from raising unbounded.
- Inbox gate path already batches open-item counts; keep that pattern.

## Standards for new queries

1. Always set an explicit `.limit()` on list endpoints (default ≤ 100–500; export ≤ 5 000).
2. Prefer column lists over `select("*")` for UI-facing lists.
3. Never query inside `.map` / loops when a single `.in(...)` will do.
4. Add indexes in the **same** migration that introduces a new filtered list path.
5. Do not subscribe to realtime for static catalogues or one-shot reads.

## Verification

- Unit: ops control-plane + gate list behaviour
- After index migration: spot-check gate inbox / portfolio load times via `db.query_ms` metrics
