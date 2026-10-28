# ADR 0008 — UseCasesX Sovereignty Architecture™

- **Status:** Accepted (Phase 8 — 2026-10-28)
- **Deciders:** Engineering (UseCasesX control plane)
- **Related:** `docs/architecture/sovereignty-architecture.md`, `docs/v2/sovereignty-abstractions.md`, ADR 0006, ADR 0007, V2-18 enterprise identity

## Context

Sovereignty language already appears in marketing, tenant policy (residency / AI routes), SSO, support access, AI engine keys, audit exports, and air-gap abstraction notes. Without a formal product model, those pieces stay disconnected infrastructure statements and invite over-claims (especially air-gap / BYOK / “sovereign”).

NIST Zero Trust guidance moves trust decisions from network location toward users, resources, identities, and continuous authorization, and recommends **gradual evolution** rather than wholesale replacement of existing architecture.

## Decision

1. Establish **UseCasesX Sovereignty Architecture™** as a product capability with eight dimensions: Data, Infrastructure, Identity, Cryptographic, AI, Operational, Audit, Exit.
2. Implement the catalogue, maturity ladder, posture assessment, and Zero Trust mappings under `src/lib/sovereignty/`, exposed through `SovereigntyService`.
3. Bind each required capability to an existing module (tenant-policy, SSO, support-access, engine-crypto, AI allow-lists, telemetry/audit, exports). Do not fork parallel policy engines.
4. Maturity advances **one level at a time**. The `sovereign` level requires operator-attested exit criteria evidence — UI preferences alone never unlock it.
5. Keep private/air-gapped and platform-wide customer-managed KMS as **non-claims** until documented exit criteria pass (see `sovereignty-abstractions.md`).

## Consequences

- Product, sales, and engineering share one vocabulary for sovereignty posture.
- Over-claims are blocked in code (`claimsBlocked`, `publicClaimAllowed`).
- Phase 6 ports/adapters remain the infrastructure swap seam; this ADR owns the product control model on top.
- UI for a “sovereignty posture” board can consume `SovereigntyService.assess` later without redesigning the model.
