# V2-08 — Agentic and AI System Designer

**Status:** Implemented  
**SRS:** FR-04 · SRS §14.4 (Pilot Authorization controls)  
**Migration:** `supabase/migrations/20260923180000_v2_08_solution_design.sql`

## What changed

| Area | Change |
|------|--------|
| Schema | `use_case_solution_designs` (1:1 with `ai_use_cases`) + RLS |
| Solution section | Conditional Studio tab — agentic fields when type is agentic / hybrid / robotics |
| Capture | Solution type, model/tool/vendor, build-buy-partner, human role, autonomy |
| Agentic | Goal, tools/actions, identities, memory, knowledge, delegation, checkpoints, action/transaction limits, sandbox, kill switch, observability, fallback |
| OWASP | Versioned prompt pack `2025.1-owasp-genai-themes` — informational only, not legal conclusions |
| Agent Card | Preview from captured fields only; marks missing / AI-draft / confirmed |
| Pilot gate | `pilotAuthorizationReadiness` + enforced in `prepareLifecycleTransition` → `approved_pilot` |

## Files

- `src/lib/solution-design/*`
- `src/components/solution-design/*`
- `src/routes/_app.studio.use-case.$id.solution-design.tsx`
- `tests/unit/solution-design-v2.test.ts`

## Operator step

Apply `20260923180000_v2_08_solution_design.sql` in the SQL Editor, then open a use case → **Solution Design**.
