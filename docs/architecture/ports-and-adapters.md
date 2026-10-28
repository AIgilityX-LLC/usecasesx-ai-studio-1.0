# Phase 6 — Ports & adapters (sovereignty)

**Status:** Active seam — default adapters = today’s Lovable Cloud stack  
**Goal:** Portable UseCasesX, not “hosted somewhere different with the same lock-in”  
**Code:** `src/lib/ports/`  
**ADR:** `docs/adr/0006-ports-and-adapters.md`  
**Related:** `docs/v2/sovereignty-abstractions.md`, `docs/architecture/ai-boundary.md`

---

## From / to

```text
Today (effective)          Target
─────────────────          ──────────────────────────────
React → Supabase           React
                             ↓
                           Application API (server fns)
                             ↓
                           Domain Services
                             ↓
                           Provider Interfaces (ports)
                             ├── Database Adapter
                             ├── Authentication Adapter
                             ├── Object Storage Adapter
                             ├── AI Provider Adapter
                             ├── Email Adapter
                             └── Analytics Adapter
```

---

## Ports

| Port | Active adapter | Planned adapters |
| ---- | -------------- | ---------------- |
| Database | `supabase_postgres` | managed_postgres, local_postgres |
| Authentication | `supabase_auth` | oidc_generic, saml_generic, local_idp |
| Object Storage | `supabase_storage` | aws_s3, azure_blob, minio |
| AI Provider | `lovable_gateway` | openai, anthropic, azure_openai, bedrock, local_llm, sovereign_model |
| Email | `lovable_email` | smtp_relay, resend, offline_queue |
| Analytics | `usecasesx_telemetry` | local_collector, disabled |

Catalogue + bindings: `src/lib/ports/registry.ts`.  
Server resolve: `src/lib/ports/resolve.server.ts`.

### AIProvider example

```text
AIProvider
 ├── LovableGatewayAdapter   (active)
 ├── OpenAIAdapter            (planned)
 ├── AnthropicAdapter         (planned)
 ├── AzureOpenAIAdapter       (planned)
 ├── BedrockAdapter           (planned)
 ├── LocalLLMAdapter          (planned)
 └── SovereignModelAdapter   (planned)
```

`AIService` (`service.server.ts`) calls `resolveAiProvider().complete(...)` — not a vendor SDK.

### ObjectStorage example

```text
ObjectStorage
 ├── SupabaseStorage   (active)
 ├── AWS S3            (planned)
 ├── Azure Blob        (planned)
 └── MinIO             (planned)
```

---

## Binding overrides (server env)

| Env | Default |
| --- | ------- |
| `PORT_DATABASE` | `supabase_postgres` |
| `PORT_AUTH` | `supabase_auth` |
| `PORT_OBJECT_STORAGE` | `supabase_storage` |
| `PORT_AI_PROVIDER` | `lovable_gateway` |
| `PORT_EMAIL` | `lovable_email` |
| `PORT_ANALYTICS` | `usecasesx_telemetry` |

Selecting a **planned** adapter throws until that adapter’s status is `active`. Silent fake portability is forbidden.

---

## Migration rules

1. New integrations depend on a **port**, not a vendor client.
2. Existing helpers (`gateway.server.ts`, `send-email.ts`, `storage/*`) remain the **bodies** of active adapters during the migration window.
3. Do not claim air-gap / multi-cloud until planned adapters are implemented and tested offline (`sovereignty-abstractions.md` exit criteria).
4. No provider secrets in the browser. Adapter modules that touch keys stay `*.server.ts` or under `ports/resolve.server.ts` import graph only.

---

## Verification

```bash
bun test tests/unit/ports-adapters.test.ts
```
