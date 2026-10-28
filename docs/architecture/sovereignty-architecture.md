# Phase 8 — UseCasesX Sovereignty Architecture™

**Status:** Product capability introduced  
**Code:** `src/lib/sovereignty/`  
**ADR:** `docs/adr/0008-sovereignty-architecture.md`  
**Air-gap seams:** `docs/v2/sovereignty-abstractions.md`

---

## Product framing

Sovereignty is a **product capability**, not a hosting slogan. Tenants declare and enforce controls across eight dimensions; posture is assessed from runtime signals. Trust decisions follow NIST Zero Trust direction: users, resources, identities, and continuous authorization — evolved gradually, not replaced wholesale.

Facade: `SovereigntyService` (`src/lib/sovereignty/service.ts`).

---

## Eight dimensions

| Dimension | Required capability | Primary binding |
| --------- | ------------------- | --------------- |
| **Data** | residency, classification, retention | `tenant-policy` · export envelope · evidence retention |
| **Infrastructure** | customer / regional deployment | `DATA_REGIONS` · ports/adapters (Phase 6) · abstractions note |
| **Identity** | customer IdP | `enterprise/sso` · RLS · roles |
| **Cryptographic** | customer-controlled keys | `engine-crypto` · workspace AI keys |
| **AI** | configurable model / provider | AI route allow-list · provider-neutral gateway |
| **Operational** | controlled privileged access | support-access grants · no impersonation |
| **Audit** | customer-owned evidence / logs | `audit_events` · export receipts · security events |
| **Exit** | export / migration / portability | Studio/Portfolio/report exports · CSV contracts · ports |

---

## Maturity ladder (gradual evolution)

```
not_applicable → declared → enforced → customer_controlled → sovereign
```

- Advance **one step** at a time (`canAdvanceMaturity`).
- `sovereign` requires `sovereignExitCriteriaAttested` plus every active dimension at least `customer_controlled`.
- Prefer `SovereigntyService.publicClaimAllowed` before any customer-facing “sovereign” claim.

Default targets by plan: `DEFAULT_TARGET_MATURITY` in `maturity.ts`.

---

## Posture assessment

```ts
import { SovereigntyService } from "@/lib/sovereignty";

const posture = SovereigntyService.assess({
  dataRegionDeclared: true,
  dataRegionPrivateOrAirgap: false,
  aiProviderAllowlistEnforced: true,
  customerAiProviderConfigured: false,
  customerIdpEnabled: true,
  workspaceKeysEnabled: false,
  engineKeyEncryptionConfigured: true,
  supportAccessControlsEnforced: true,
  auditExportAvailable: true,
  exitExportAvailable: true,
});

const gaps = SovereigntyService.gapsForTier(posture, "enterprise");
```

Signals are **facts supplied by call sites** (org policy row, SSO config, env). The assessor does not read the database itself — keeps the module pure and testable.

---

## Zero Trust mapping

| Pillar | Sovereignty focus |
| ------ | ----------------- |
| Users | Identity + operational grants |
| Resources | Data, AI, crypto, infrastructure |
| Identities | Customer IdP + roles |
| Continuous authorization | Entitlements, RLS, audit, exit receipts |

Rule text: `GRADUAL_EVOLUTION_RULE`.

---

## Explicit non-claims

- `data_region = airgap_reserved` / `private` ≠ deployed private cloud.
- `AI_PROVIDER_ROUTES` `local` ≠ live offline inference.
- Envelope encryption ≠ platform-wide customer-managed KMS / BYOK for Postgres or object storage.
- SCIM remains deferred (`SCIM_STATUS`).

Air-gap exit criteria remain in `docs/v2/sovereignty-abstractions.md`.

---

## Relationship to prior phases

| Phase | Contribution |
| ----- | ------------ |
| V2-18 | SSO, tenant policy, support access, abstractions note |
| Phase 4 | Tenant context / policy facade (when merged) |
| Phase 6 | Ports & adapters as infrastructure swap seam |
| Phase 7 | Security events, audit correlation, health |
| **Phase 8** | Product sovereignty model + posture + Zero Trust alignment |
| **Phase 9** | Four deployment profiles (operating planes) — `docs/architecture/deployment-profiles.md` |
| **Control plane** | Configurable `SovereigntyPolicy` + `SovereigntyControlPlane` — `docs/sovereignty/` |
