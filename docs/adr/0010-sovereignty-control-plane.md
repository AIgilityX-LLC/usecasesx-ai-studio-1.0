# ADR 0010 — Sovereignty Control Plane

- **Status:** Accepted (2026-10-28)
- **Related:** `docs/sovereignty/*`, ADR 0008, ADR 0009, V2-18 tenant policy

## Context

Sovereignty dimensions and deployment profiles described *what* and *how*, but allow/deny rules for residency, AI egress, break-glass, and exit still risked scattering across UI. Encoding specific statutes in code would couple the product to legal interpretations and slow every market expansion.

## Decision

1. Introduce a **Sovereignty Control Plane** under `src/lib/sovereignty/control-plane/` with typed policies (`SovereigntyPolicy` and domain slices) and **`SovereigntyControlPlane`** evaluation API.
2. Keep vocabulary as opaque tokens; forbid jurisdiction-specific law in evaluators.
3. Bridge legacy V2-18 fields via `overlayLegacyTenantPolicy`.
4. Document the model under `docs/sovereignty/`.

## Consequences

- One evaluation path for product and server handlers.
- Legal packs become configuration, not code forks.
- Persistence / admin UI for full policy JSON remains a follow-on (additive).
