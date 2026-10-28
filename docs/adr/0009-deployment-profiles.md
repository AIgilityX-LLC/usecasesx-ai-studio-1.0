# ADR 0009 — Four UseCasesX deployment profiles

- **Status:** Accepted (Phase 9 — 2026-10-28)
- **Deciders:** Engineering (UseCasesX control plane)
- **Related:** `docs/architecture/deployment-profiles.md`, ADR 0008 (Sovereignty Architecture), ADR 0006 (ports & adapters), `docs/v2/sovereignty-abstractions.md`

## Context

Enterprises, government and regulated sectors need clear packaging for *how* UseCasesX is operated — not only feature entitlements. Sovereignty dimensions (Phase 8) describe *control*; deployment profiles describe *operating model*. Collapsing “sovereignty” into “self-host Supabase” would be both commercially fragile and operationally misleading: upstream self-hosting docs place provisioning, hardening, patching, DB maintenance, HA, scalability, backups, DR and monitoring on the operator.

## Decision

1. Publish **four deployment profiles** as product capabilities (one codebase, entitlement/contract gated):
   - **UseCasesX Cloud SaaS** — AIgilityX-managed, multi-tenant, regional, logical isolation.
   - **UseCasesX Dedicated Cloud** — dedicated environment/DB/keys, residency, enterprise SSO.
   - **UseCasesX Sovereign Cloud / Customer VPC** — customer account/VPC, private net, customer IAM/KMS/logs, restricted AI.
   - **UseCasesX Sovereign Private** — on-prem/private cloud, local identity/storage/model gateway, no mandatory public SaaS deps, optional disconnected.
2. Implement the catalogue, fit helper, backend options, and operator-responsibility matrix under `src/lib/deployment/`, facade `DeploymentProfileService`.
3. Treat **self-hosted Supabase as one backend option** for customer-controlled profiles — alongside dedicated managed projects and ports/adapters to customer Postgres/auth/storage/AI. It is **not** the sole sovereignty architecture.
4. Gate live “sovereign” profile claims behind contractual selection **and** Phase 8 attested exit criteria.

## Consequences

- Sales and engineering share one vocabulary for packaging regulated deals.
- Ops ownership is explicit when customers self-host.
- Ports/adapters remain the long-term swap seam; profiles choose *who runs which plane*.
- UI can later expose profile fit / readiness without inventing a parallel model.
