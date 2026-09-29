# V2-18 — Enterprise identity, localization and sovereignty

**Status:** Implemented (capability-flagged) · **Date:** 2026-09-24  
**SRS:** FR-16 (support access), FR-18 (localization/sovereignty), Security §SSO/SCIM

## Audit decisions (what shipped vs deferred)

| Capability | Decision | Rationale |
|---|---|---|
| SSO OIDC/SAML | **Ship** behind `sso` / `CAPABILITY_SSO` | Uses existing Supabase Auth identity stack; per-org config + domain discovery + JIT |
| SCIM | **Defer** (`SCIM_STATUS.supported = false`) | No safe tenant-scoped SCIM lifecycle on current identity stack; deprovision risk |
| i18n EN + AR RTL | **Ship** | English baseline + Arabic UI/report chrome; free text never auto-translated |
| Tenant data region + AI routes | **Ship** | Declared policy on `organizations`; AI gateway enforces route allow-list |
| Air-gapped deployment | **Document only** | Abstractions interfaces exist; **do not claim support** until offline-tested |
| Break-glass / support access | **Ship** | Time-bound grants; operator keeps own identity; impersonation prohibited |

## Schema

Migration: `supabase/migrations/20260923340000_v2_18_enterprise_identity.sql`

- `organizations.data_region`, `allowed_ai_provider_routes`, `preferred_locale`
- `organization_sso_configs` — protocol, domains, JIT, provider slug/metadata
- `support_access_grants` + `has_support_access(user, workspace)`

## Surfaces

- `/sso` — domain discovery → IdP redirect → JIT membership
- `/auth` — link to SSO
- `/account/organization` — `EnterpriseIdentityPanel` (policy, SSO, support grants)
- `LocaleProvider` — `dir`/`lang` on `<html>` for EN/AR

## Enablement

```bash
CAPABILITY_SSO=true
VITE_CAPABILITY_SSO=true
```

IdP must still be registered in the project's Auth provider settings (Supabase dashboard). The app stores domain allow-list + JIT policy only.

## Tests

`tests/unit/enterprise-identity-v2-18.test.ts` — JIT allow-list, AI route denial, grant expiry, AR RTL coverage.
