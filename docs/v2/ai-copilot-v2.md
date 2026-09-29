# V2-17 — AI Copilot gateway and evaluation

**Status:** Implemented  
**SRS:** FR-14  
**Migration:** `supabase/migrations/20260923320000_v2_17_ai_feedback.sql`

## What already existed (reused)

Provider-neutral `AIService` + `gateway.server.ts`: entitlement re-check, fair-use + burst limits, timeout/retry, Zod output validation, provenance, redacted `ai_usage_events`, prompt injection fencing (`sanitize.ts`).

## What V2-17 added

| Area | Change |
|------|--------|
| Purpose ops | `rewriteText`, `classifyContent`, `compareOptions`, `findGaps`, `generateQuestions`, `summarizeEvidence`, `draftBrief` (+ FR-14 alias map) |
| Citations | Success envelope carries `citations[]`, `confidenceCaveat`, `trainingPolicy` |
| Authorized retrieval | `retrieval.server.ts` — RLS-scoped excerpts only |
| Circuit breaker | Opens after consecutive upstream failures; manual fallback messaging |
| Apply / Dismiss / Feedback | `ai_suggestion_feedback` + `recordAiFeedbackFn`; `AiDraftSuggestion` UI |
| Evaluation | Versioned `AI_EVAL_CASES` + task-specific thresholds + manual fallback when below threshold |
| Training policy | Explicit constant: no customer content training without separate agreement |

## Guarantees (unchanged + reinforced)

1. No provider key or privileged data in browser bundles (`*.server.ts` only).  
2. Telemetry never stores prompt/output bodies.  
3. AI never auto-applies; Apply is explicit.  
4. Core journey works when AI is down (`manualFallback: true`).

## Operator step

Apply `20260923320000_v2_17_ai_feedback.sql`. Smoke an opportunity AI draft → Apply / Dismiss / Helpful.
