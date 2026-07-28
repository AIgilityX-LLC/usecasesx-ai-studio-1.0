# AI Boundary — provider-neutral AI services

**Status:** implemented 2026-07-28. Supersedes the ad-hoc gateway call that
previously lived inline in `src/lib/usecasex.studio.functions.ts`.

## Why

Before this change the product had exactly one AI call: an **unauthenticated**
server function that built its own prompt, its own tool schema and its own
`fetch` to the gateway, with hardcoded vendor model ids, no timeout, no retry,
no validation of the model output, no usage record and no fair-use limit.

Adding a second AI feature would have duplicated all of it, and swapping
providers would have meant editing UI-adjacent code.

## Shape

```
src/lib/ai/
  models.ts           provider-neutral registry (tiers + aliases -> gateway ids)
  prompts.ts          versioned prompt registry, one entry per task
  schemas.ts          Zod output schema + JSON tool schema per task
  types.ts            AiResult envelope, AiProvenance, user-safe error copy
  fair-use.ts         pure limit policy (per user / per workspace / per edition)
  gateway.server.ts   the ONLY provider transport: key, timeout, retry, mapping
  service.server.ts   AIService — entitlement, fair use, validation, logging
  index.ts            client-safe barrel (no transport, no service, no key)

src/lib/ai.functions.ts        thin createServerFn wrappers (6 methods)
src/lib/usecasex.studio.functions.ts  Studio compatibility layer, delegates here
```

### AIService methods

| Method                     | Task key                   | Default tier |
| -------------------------- | -------------------------- | ------------ |
| `enrichOpportunity`        | `enrichOpportunity`        | balanced     |
| `draftUseCase`             | `draftUseCase`             | balanced     |
| `recommendCapabilities`    | `recommendCapabilities`    | fast         |
| `explainScore`             | `explainScore`             | fast         |
| `findSimilarUseCases`      | `findSimilarUseCases`      | fast         |
| `generateExecutiveSummary` | `generateExecutiveSummary` | deep         |

## Guarantees

1. **No secret in the browser.** `LOVABLE_API_KEY` is read only inside
   `gateway.server.ts`, at call time. Server-only filenames keep the transport
   and service out of every client bundle; the build output is scanned for the
   gateway host and key name.
2. **No provider leakage.** Callers pick a _tier_ or a stable _alias_
   (`openai` / `gemini` / `conversx`). Vendor model ids exist in `models.ts`
   only. Changing provider is a one-line edit with no UI change.
3. **Server is the security boundary.** Every call re-resolves the caller's
   subject and re-checks the `ai.assist` entitlement. Hidden buttons are never
   relied on. All six server functions use `requireSupabaseAuth` — the previous
   Studio endpoint was public.
4. **Structured output is validated before use.** The gateway response is
   parsed against the task's Zod schema; a failure records an
   `invalid_output` event and returns a typed failure. Nothing unvalidated is
   ever returned to the UI or written to the database.
5. **Graceful degradation.** Nothing throws. Every path returns an `AiResult`
   with a user-safe message. When AI is unconfigured, rate-limited, out of
   credits, timed out or unreachable, the surrounding journey (capture, score,
   prioritise, portfolio, roadmap, export) is unaffected.
6. **Attributable usage.** Success and failure both insert an
   `ai_usage_events` row: user, organization, workspace, task, model, alias,
   status, error kind, duration, token counts, entity and prompt version.
   Logging failures are swallowed — telemetry never breaks a user action.
7. **Provenance, not silent overwrite.** Success returns an `AiProvenance`
   stamp (`aiGenerated: true`, task, model, prompt version, timestamp).
   AI output is returned as a _suggestion_; the caller decides whether to
   apply it. Saved Studio drafts persist the stamp.

## Fair use

Pro Founding Access is complimentary through 31 December 2026 _subject to fair
use_. `fair-use.ts` is the single definition:

| Edition    | per user / 24h | per workspace / 24h |
| ---------- | -------------- | ------------------- |
| Lite       | 5              | 20                  |
| Pro        | 60             | 300                 |
| Enterprise | 500            | 5 000               |

Overridable without a deploy via `AI_FAIR_USE_PER_USER_PER_DAY` and
`AI_FAIR_USE_PER_WORKSPACE_PER_DAY`. Only successful calls consume budget —
counting reads `ai_usage_events` where `status = 'ok'` inside a rolling 24h
window. Exceeding the limit returns `fair_use_exceeded` with a reset time.

## Data

`public.ai_usage_events` (additive migration, 2026-07-28). RLS: a user reads
their own rows; workspace owners/admins read their workspace's rows; inserts
are restricted to the caller's own `user_id`. No `anon` grant.

## Testing

`tests/unit/ai-boundary.test.ts` — 19 tests, no network, no database. Covers
model resolution, prompt/schema registry completeness, output validation,
fair-use maths, gateway status mapping, retry vs. terminal behaviour, and an
assertion that the API key never appears in a returned envelope.

## Post-launch extraction candidates

- Move `explainScore` / `findSimilarUseCases` behind a cache keyed on input
  hash; both are deterministic enough to reuse.
- Promote `ai.bulkAssist` to a queued job once Enterprise batch enrichment
  ships; the service signature already supports it.
- Surface an AI usage panel for workspace admins from `ai_usage_events`.
