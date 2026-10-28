# Sovereignty Control Plane — architecture

## Purpose

Turn the Sovereignty Architecture™ (eight dimensions) and deployment profiles into **enforceable, configurable policy** with one evaluation service. UI and feature modules must not invent their own residency / AI / break-glass conditionals.

```
Web UI / BFF
    │  asks allow/deny
    ▼
SovereigntyControlPlane.evaluate(policy, subject)
    │
    ├── DataResidencyPolicy
    ├── RetentionPolicy
    ├── IdentitySovereigntyPolicy
    ├── AIProviderPolicy
    ├── StorageSovereigntyPolicy
    ├── EncryptionPolicy
    ├── AdministratorAccessPolicy
    ├── AuditSovereigntyPolicy
    └── ExportPolicy
            │
            ▼
     PolicyDecision { effect, reason, clause }
```

## Layers

| Layer | Responsibility |
| ----- | -------------- |
| **Dimensions** (`src/lib/sovereignty/`) | Product vocabulary & posture maturity |
| **Profiles** (`src/lib/deployment/`) | Who operates which plane |
| **Control plane** (`…/control-plane/`) | Configurable policy + evaluation |
| **Legacy bridge** | `overlayLegacyTenantPolicy` from V2-18 `dataRegion` / AI routes |

## Non-goals

- Encoding GDPR, PDPL, ITAR, etc. as `if (law === …)` branches.
- Replacing RLS — row isolation stays in Postgres policies.
- Claiming BYOK / air-gap live when only capability flags are set.

## Call-site rules

1. Server handlers and server functions call `SovereigntyControlPlane.evaluate` (or a typed helper).
2. UI may **display** policy and decisions; it must not re-implement deny rules for security-sensitive paths.
3. Reasons are machine codes (`region_prohibited`), never statute citations.
4. Unknown future policy fields are additive (`version: 1`); bump version when breaking.

## Persistence (forward)

Store `SovereigntyPolicy` JSON per organization (additive migration when wired). Until then, build from `defaultSovereigntyPolicy` + `overlayLegacyTenantPolicy` + optional pack id.
