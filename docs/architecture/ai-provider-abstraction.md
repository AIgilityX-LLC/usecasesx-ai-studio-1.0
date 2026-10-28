# AI Provider abstraction

**Code:** `src/lib/ai/provider/`  
**Facade (server):** `resolveAiProvider` / `resolveAiProviderForCall`  
**Product AI service:** `src/lib/ai/service.server.ts` (fair-use, entitlements, Zod) → `AIProvider`

---

## Contract

```ts
type AIProvider = {
  generateText()
  classify()
  embed()
  matchUseCases()
  summarize()
  extractStructuredData()  // primary path today (tool calling)
}
```

UI and route modules must **not** import `gateway.server.ts`, vendor SDKs, or provider URLs. Studio selects capability **aliases** from `PROVIDER_ALIAS_META` only.

---

## Active vs planned adapters

| Id | Status |
| -- | ------ |
| `lovable_gateway` | Active (default) |
| `openai_compatible` | Active (engine endpoint + key) |
| `openai`, `anthropic`, `azure_openai`, `bedrock`, `google_vertex`, `private_endpoint`, `local_llm` | Planned |

Planned providers cannot be selected via `AI_PROVIDER` until status flips to `active`.

---

## Configuration (`AiProviderConfig`)

Env keys: `AI_PROVIDER`, `AI_MODEL`, `AI_REGION`, `AI_TIMEOUT_MS`, `AI_RETRIES`, `AI_TOKEN_LIMIT`, `AI_LOGGING_POLICY`, `AI_PII_HANDLING`, `AI_DATA_RETENTION_POLICY`.

Defaults preserve today's gateway behavior.

---

## `AIProviderPolicy`

Prohibit/permit providers by tenant pack or deployment profile (`PROFILE_AI_PROVIDER_POLICY`). Evaluate with `assertAiProviderAllowed` before resolving an adapter.

Bridge from sovereignty string routes: `fromSovereigntyAiPolicy`.

---

## Behavior guarantee

`AIService` still owns entitlements, fair-use, circuit breaker, Zod validation, and usage events. Only the transport hop moved behind `AIProvider.extractStructuredData` — no intentional product behavior change.
