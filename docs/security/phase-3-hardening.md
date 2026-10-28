# Phase 3 — Security hardening

**Branch intent:** Harden multi-tenant isolation, secrets boundary, authn/authz **before** architecture sophistication.  
**Rule:** Do not claim live Enterprise capabilities that are flag-gated or not built. OWASP multi-tenant risks addressed: cross-tenant leakage, impersonation, broken isolation, IDOR.

## Tenant identity (database)

| Concept | UseCasesX SoT |
| ------- | ------------- |
| `tenant_id` (product language) | **`organization_id` + `workspace_id`** — do not rename columns |
| `created_by` / `created_at` / `updated_at` | Present on most V2 business tables; inventory: `docs/security/tenant-column-inventory.md` |
| `updated_by` | **PARTIAL** — many tables lack it; additive backfill is a follow-up, not a mass rewrite in this phase |

**RLS:** Every exposed `public` table must keep RLS + grants in the same migration (`AGENTS.md` §5). Isolation is enforced in Postgres via membership helpers (`docs/architecture/tenancy-rls-design.md`), not React.

## Cross-tenant attack tests

| Attack | Suite |
| ------ | ----- |
| A → B portfolio / opportunity / board / use case / shares | `tests/cross-workspace-abuse.e2e.ts` |
| A → B project, use case, KPI (benefit), attachment (evidence), portfolio, report | `tests/cross-tenant-attack-matrix.e2e.ts` (**new**) |
| Tenancy provisioning / membership | `tests/tenancy-isolation.e2e.ts` |
| RLS isolation | `tests/rls-isolation.e2e.ts` |

All must fail for Tenant B even with a valid session and forged IDs. Run: `bun run test:cross-tenant` (needs demo credentials).

## Secrets (3.2)

| Secret class | Boundary |
| ------------ | -------- |
| Service-role / DB credentials | `*.server.ts` / `client.server.ts` only |
| AI provider / Lovable gateway | `gateway.server.ts` / email server modules |
| SMTP / payment / integration tokens | Server handlers + GitHub Secrets — never `VITE_*` |

Gate: `bun run check:client-secrets` (pattern names only; no values printed).

## Enterprise authentication (3.3)

| Capability | Status | Evidence |
| ---------- | ------ | -------- |
| OIDC / SAML SSO | **PARTIAL (live behind flag)** | `docs/v2/enterprise-identity-v2.md`, `CAPABILITY_SSO`, `/sso` |
| Microsoft Entra / Okta | **PARTIAL** | Configure as Supabase Auth IdP + `organization_sso_configs` — not hard-coded vendors in app |
| MFA (TOTP) | **NOT STARTED (product UI)** | Enable via Supabase Auth MFA; Account → Security today = password / session sign-out |
| Session policy | **PARTIAL** | Password rotation for platform accounts; global/local sign-out on `/account/security` |
| Login history | **NOT STARTED** | Needs append-only table + Auth hooks — deferred (additive migration later) |
| Account lockout / rate limit | **PARTIAL** | AI fair-use + observability rate-limit metrics; Auth lockout = Supabase project Auth settings (human) |

Roadmap detail: `docs/security/enterprise-authn-roadmap.md`.

## Authorization (3.4)

| Layer | Status |
| ----- | ------ |
| Launch RBAC (Owner/Admin/Contributor/Viewer/Facilitator) | **DONE** — `src/lib/authz/roles.ts` |
| Platform Super Admin | **DONE** — `user_roles` / `PLATFORM_ADMIN_ROLES` |
| Enterprise catalogue (Portfolio Admin, Approver, Auditor, …) | **DONE (mapping)** — `src/lib/authz/enterprise-roles.ts` maps onto workspace roles + bundles |
| Scoped permissions | **DONE** — `scoped-permissions.ts` |
| RBAC + ABAC (business unit + value threshold) | **DONE (library)** — `src/lib/authz/abac.ts` + unit tests; wire into decide server fns per feature PR |

**Do not** store the enterprise catalogue as a second role table in this phase.

## Explicit non-claims

- MFA enrollment UI is not shipped as “live Enterprise MFA.”
- Login history / full Auth lockout dashboards are not shipped.
- `updated_by` is not backfilled across all tables in this PR.
- ABAC is enforced only where callers invoke `assertCanApproveUseCase` (extend at decide boundaries next).
