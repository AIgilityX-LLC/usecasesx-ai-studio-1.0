# V2-15 — Workshop Mode V2

**Status:** Implemented  
**SRS:** FR-12  
**Migration:** `supabase/migrations/20260923300000_v2_15_workshop_mode.sql`

## What changed

| Area | Change |
|------|--------|
| Session design | Agenda, teams, challenge statements, timeboxes on `workshops` |
| Anonymous ideation | `allow_anonymous` — UI redacts submitter for non-facilitators |
| Voting | `voting_mode` score (1–5) or **dot** (`dots` criterion) |
| AI clusters | `workshop_cluster_proposals` — AI proposes; facilitator confirms merge + final label |
| Conversion | Idempotent via `source_reference` unique index + race re-read |
| Outcome report | Executive summary, decision log, shortlist, next-actions (PDF sections) |

## Files

- `src/lib/workshops/workshop-v2.ts`
- `src/lib/workshops.ts`, `.server.ts`, `.functions.ts`, `.collab.ts`
- `src/components/workshop/WorkshopFacilitatorV2Panel.tsx`, `WorkshopBoardView.tsx`
- `tests/unit/roadmap-workshop-v2-14-15.test.ts`

## Tests covered (unit)

- Cluster proposals from similarity (no auto-merge)
- Anonymity display rules
- Dot tally
- Outcome executive summary + decision log
- Duplicate-safe conversion logic path (source_reference lookup)

Simultaneous-user / reconnect e2e remain existing workshop specs + operator smoke.

## Operator step

Apply `20260923300000_v2_15_workshop_mode.sql`, open a workshop → Context stage → **Session design (V2)**; generate outcome PDF and confirm executive summary / decision log sections.
