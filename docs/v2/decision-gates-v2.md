# V2-10 — Decision gates and review workflow

**Status:** Implemented  
**SRS:** FR-08  
**Migration:** `supabase/migrations/20260923220000_v2_10_decision_gates.sql`

## What changed

| Area | Change |
|------|--------|
| Default gates | Intake · Discovery Complete · Investment Review · Pilot Authorization · Scale Authorization · Retirement Review (`src/lib/gates/model.ts`) |
| Config | Required fields, evidence fields, submit/decide permissions, decision authority, SLA hours, SoD flag — code catalogue, snapshotted onto each review |
| Actions | submit · request_changes · approve_with_conditions · approve · hold · reject |
| Immutable events | `decision_gate_events` append-only (trigger blocks UPDATE/DELETE); stores authority, rationale, version pin, condition/change snapshots |
| Open items | `decision_gate_open_items` for conditions + field-level change requests; visible until human close |
| Inbox | `/reviews` with SLA indicator and decide form |
| Studio | `/studio/use-case/$id/gates` — submit, missing-input check, unresolved conditions |
| AI bounds | May flag missing inputs only; cannot approve, reject or close conditions (`actorKind: ai` denied) |
| SoD | Enforced when `sod_enabled` on the review (default true) |

## Files

- `src/lib/gates/model.ts`, `gates.server.ts`, `gates.functions.ts`, `index.ts`
- `src/components/gates/DecisionGatesPanel.tsx`, `ReviewInbox.tsx`
- `src/routes/_app.reviews.tsx`, `_app.studio.use-case.$id.gates.tsx`
- `tests/unit/decision-gates-v2.test.ts`

## Operator step

Apply `20260923220000_v2_10_decision_gates.sql`, then open a use case → **Decision Gates**, or sidebar **Review Inbox**.
