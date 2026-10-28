# Phase 9 — Four UseCasesX deployment profiles

**Status:** Product packaging introduced  
**Code:** `src/lib/deployment/`  
**ADR:** `docs/adr/0009-deployment-profiles.md`  
**Sovereignty model:** `docs/architecture/sovereignty-architecture.md` (Phase 8)

---

## Why profiles exist

Phase 8 defines **what control** a tenant has (eight sovereignty dimensions). Phase 9 defines **how the product is operated** for different buying centers. Same modular monolith; different operating planes.

Facade: `DeploymentProfileService`.

---

## The four profiles

| Profile | Host | Isolation | Best for |
| ------- | ---- | --------- | -------- |
| **UseCasesX Cloud SaaS** | AIgilityX-managed | Logical multi-tenant | SMEs & standard enterprise |
| **UseCasesX Dedicated Cloud** | AIgilityX dedicated | Dedicated environment / DB / keys | Major enterprises |
| **UseCasesX Sovereign Cloud / Customer VPC** | Customer cloud account | Customer VPC, private net | Public sector, FS, regulated |
| **UseCasesX Sovereign Private** | On-prem / private cloud | Air-gapped or private | Highly sensitive environments |

### Profile 1 — Cloud SaaS

AIgilityX-managed · multi-tenant · regional deployment · logical isolation (RLS + workspace tenancy).

### Profile 2 — Dedicated Cloud

Dedicated customer environment · dedicated database · dedicated encryption keys · regional residency · enterprise SSO.

### Profile 3 — Sovereign Cloud / Customer VPC

Customer-controlled cloud account/VPC · private networking · customer IAM · customer KMS · customer logs · restricted AI endpoints.

### Profile 4 — Sovereign Private

On-premises / private cloud · self-hosted services · local identity · local storage · local model gateway · no mandatory public SaaS dependencies · optional disconnected operation.

---

## Backend options (self-host is one path)

| Backend | Typical profiles | Ops owner |
| ------- | ---------------- | --------- |
| AIgilityX-managed cloud | Cloud SaaS | AIgilityX |
| Dedicated managed DB/project | Dedicated, Sovereign VPC | Shared (contract) |
| **Self-hosted Supabase** | Sovereign VPC, Sovereign Private | **Customer/operator** |
| Customer Postgres via ports/adapters | Sovereign VPC, Sovereign Private | Customer |

**Product rule:** Self-hosted Supabase is supported for customers requiring control or isolation, but the operator then owns provisioning, hardening, patching, database maintenance, HA, scalability, backups, DR and monitoring. That is why self-host is **one deployment option**, not the Sovereignty Architecture itself (`SELF_HOST_IS_OPTION_NOT_ARCHITECTURE`).

Long-term sovereign swap seam remains Phase 6 **ports & adapters**.

---

## Fit & claim gates

```ts
import { DeploymentProfileService } from "@/lib/deployment";

const rec = DeploymentProfileService.recommend({
  regulatedSector: true,
  customerVpc: true,
  customerKeyAndIam: true,
  enterpriseSso: true,
});
// → sovereign_cloud_vpc

DeploymentProfileService.mayClaimProfileLive("sovereign_private", {
  contractuallySelected: true,
  sovereigntyAttestedForProfile: false, // blocked
});
```

Readiness vs a profile’s sovereignty targets: `readinessGaps(profileId, posture)` using Phase 8 `assessSovereigntyPosture`.

---

## Explicit non-claims

- Selecting a sovereign-named profile in a CRM does not equal live air-gap.
- Dedicated keys on Dedicated Cloud ≠ full customer KMS unless contracted.
- AIgilityX does not operate the customer’s private plane under Sovereign Private.
