# V2-06 — Opportunity Intake V2

**Status:** Implemented (enhance existing `/opportunities/new` + `$id` — no competing route)  
**SRS:** FR-02  
**Migration:** `supabase/migrations/20260923160000_v2_06_opportunity_intake.sql`

## What changed

| Area | Change |
|------|--------|
| Schema | Additive columns: `sponsor_name`, `affected_users`, `geography`, `constraints_text` |
| Modes | **Quick capture** (title, pain, outcome, urgency, owner) and **Guided intake** (full FR-02 disclosure) on the same form |
| Drafts | Existing local + server autosave retained; schema defaults keep old drafts loadable |
| Similarity | Server `findSimilar` returns scored workspace + repository hits with human-readable reasons |
| Missing info | Side-rail prompts from `missingInformationPrompts()` |
| AI | PII/secret confirm dialog **before** external call; every suggestion is an **AI draft** with reason/source and **Apply** only |
| Handoff | Convert / “Continue to Studio Canvas” opens `/studio/use-case/$id` (not a dead success screen) |

## Files

- `src/lib/opportunities.ts` — draft fields, modes, missing prompts, similarity helpers
- `src/lib/opportunities.server.ts` / `.functions.ts` — persist + scored similarity + convert mapping
- `src/components/opportunities/OpportunityForm.tsx` — UI
- `src/components/opportunities/AiDraftSuggestion.tsx` — Apply-gated draft card
- `tests/unit/opportunity-intake-v2.test.ts`

## Operator step

Apply `20260923160000_v2_06_opportunity_intake.sql` in the SQL Editor before saving the new guided fields to the database.
