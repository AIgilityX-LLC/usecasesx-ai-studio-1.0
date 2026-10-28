# Private / air-gapped dependency abstractions (V2-18)

**Status:** Design documentation only.  
**Do not claim air-gapped or private-cloud support until a deployment is built and tested offline.**

**Phase 8:** Product sovereignty model (eight dimensions, maturity, posture) lives in `src/lib/sovereignty/` — see `docs/architecture/sovereignty-architecture.md` and ADR 0008. This note remains the **air-gap / private-pack exit criteria**; the Sovereignty Architecture owns customer-facing posture and claim gates.

**Phase 9:** Four deployment profiles (Cloud SaaS → Dedicated → Sovereign VPC → Sovereign Private) live in `src/lib/deployment/`. Self-hosted Supabase is **one backend option** for customer-controlled profiles, not the sole sovereignty architecture — see `docs/architecture/deployment-profiles.md` and ADR 0009.

This note names the seams the application already (or should) depend on so a future private/air-gapped pack can swap implementations without forking product code.

## Seams

| Concern | Current default | Abstraction / seam | Air-gap candidate |
|---|---|---|---|
| **Identity** | Lovable Cloud / Supabase Auth (email, OAuth, optional SAML/OIDC) | Auth client + server middleware (`integrations/supabase/*`); org SSO config in `organization_sso_configs` | Local IdP (OIDC/SAML) with same JIT domain policy; no public IdP callbacks |
| **Object storage** | Supabase Storage buckets (`studio-canvas`, `evidence-items`, …) via `src/lib/storage/*` | Bucket registry + signed URL helpers; path policies | On-prem object store (S3-compatible) behind same signed-URL API |
| **Model endpoint** | Lovable AI Gateway (`src/lib/ai/gateway.server.ts`, `models.ts`) | Provider-neutral tiers/aliases; tenant `allowed_ai_provider_routes` | Local/vetted model endpoint route key `local`; never browser keys |
| **Email** | Platform email / Resend hooks under `src/routes/lovable/email/*` | Delivery health + webhook verification | SMTP relay or offline queue with same template IDs |
| **Telemetry** | `audit_events` / `product_events` (`src/lib/telemetry/*`) | Append-only writers; redaction helpers | Local collector or disabled product events; audit retained on-prem |

## Explicit non-claims

- `data_region = airgap_reserved` is a **declared preference**, not an infrastructure mode.
- `AI_PROVIDER_ROUTES` includes `local` for future routing — it is **not** a live offline model.
- SCIM lifecycle and customer-managed keys remain roadmap items.
- No offline content package, no air-gap installer, and no private-cloud runbook are shipped in this change.

## Exit criteria for a future air-gap claim

1. Identity, storage, model, email and telemetry all resolve to private endpoints with no required internet egress.
2. Offline evaluation of AI eval dataset and RLS denial tests pass in the private environment.
3. Operator runbook + residual risk register signed by Security.
