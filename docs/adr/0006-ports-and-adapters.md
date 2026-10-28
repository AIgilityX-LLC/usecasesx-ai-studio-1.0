# ADR 0006 — Ports & adapters for provider sovereignty

- **Status:** Accepted (Phase 6 — 2026-10-28)
- **Deciders:** Engineering (UseCasesX control plane)
- **Related:** `docs/architecture/ports-and-adapters.md`, `docs/v2/sovereignty-abstractions.md`, ADR 0005

## Context

The product can look like “React → Supabase” end-to-end. That ships fast but couples identity, storage, AI, email and analytics to one vendor surface. Sovereignty (and future private/air-gapped packs) requires swapping providers without forking the product.

## Decision

1. Introduce explicit **ports** under `src/lib/ports/` for database, authentication, object storage, AI, email, and analytics.
2. Bind **adapters** per port. Default adapters wrap the current Lovable Cloud / Supabase / Lovable AI Gateway / Lovable Email stack.
3. Catalogue future adapters (OpenAI, Anthropic, Azure OpenAI, Bedrock, Local LLM, Sovereign Model; S3, Azure Blob, MinIO; etc.) as `planned` — selectable only after implementation.
4. Application AI service resolves transport via `resolveAiProvider()` rather than importing a vendor SDK.
5. Do **not** rewrite every call site in this phase; active adapters delegate to existing modules.

## Consequences

- Portability is a named architecture, not a marketing claim.
- Env keys (`PORT_*`) document the swap points; planned adapters cannot be silently selected.
- Air-gap / multi-cloud remain non-claims until planned adapters meet `sovereignty-abstractions.md` exit criteria.
- Incremental extraction: each new vendor integration lands as an adapter, not a scattered SDK import.
