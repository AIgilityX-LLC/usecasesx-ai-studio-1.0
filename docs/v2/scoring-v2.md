# V2-09 — Scoring Engine V2

**Status:** Implemented  
**SRS:** FR-06  
**Migration:** `supabase/migrations/20260923200000_v2_09_scoring_engine.sql`

## What changed

| Area | Change |
|------|--------|
| Five pillars | Built-in `usecasex-pillars-v2` (Desirability · Viability · Feasibility · Governability · Value). Launch seven-dimension card retained; historical results keep `scorecard_slug` + `scorecard_version`. |
| Criterion metadata | Rationale, confidence, evidence, assessor, timestamp via `criterion_assessments` |
| Display | Weighted composite, risk-adjusted, **uncertainty band**, **evidence completeness** shown separately |
| Sensitivity | ±20% dimension-weight scenarios on the live scorecard |
| Templates | Clone → workspace **draft**; **publish** locks definition (DB trigger) |
| Labels | Prioritisation bands only + fixed disclaimer — never safe / compliant / approved |
| Backfill | Existing `scorecard_results` → `reconciliation_status = legacy_pending`; **scores not recomputed** |

## Files

- `src/lib/scoring/model.ts`, `pillars-v2.ts`, `default-scorecard.ts`
- `src/lib/scoring.server.ts`, `scoring.functions.ts`
- `src/components/scoring/ScoreExplanation.tsx`, `UseCaseScorecard.tsx`
- `tests/unit/scoring-v2.test.ts`

## Operator step

Apply `20260923200000_v2_09_scoring_engine.sql`, then open a use case → **Scorecard**.
