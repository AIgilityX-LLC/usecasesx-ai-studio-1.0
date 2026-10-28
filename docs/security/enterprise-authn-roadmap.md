# Enterprise authentication roadmap

Companion to Phase 3 hardening. Prefer Supabase Auth + existing V2-18 seams over a second IdP stack.

## Already in repo

1. **SSO (OIDC/SAML)** — `organization_sso_configs`, `/sso`, JIT domain policy, `CAPABILITY_SSO` (`docs/v2/enterprise-identity-v2.md`).
2. **Entra ID / Okta** — register the IdP in the Supabase Auth dashboard; store domain allow-list + protocol in `organization_sso_configs`. No per-vendor forks.
3. **Account security page** — password change, platform password policy/rotation, sign out this device / everywhere (`/_app/account/security`).
4. **Support access** — time-bound grants; **no impersonation**.

## Human / platform settings (not app code)

1. Enable **Auth rate limits / bot protection** in the Supabase project.
2. Enable **MFA (TOTP)** in Supabase Auth for the project; then add product enroll/verify UI behind a capability flag.
3. Restrict production DB credentials to break-glass operators only.

## Next additive product steps (ordered)

| Step | Deliverable | Notes |
| ---- | ----------- | ----- |
| 1 | MFA enroll/verify UI on `/account/security` | Use `supabase.auth.mfa.*`; flag `CAPABILITY_MFA`; no fake “enabled for all tenants” |
| 2 | `auth_login_events` append-only table | `user_id`, `at`, `ip_hash`, `user_agent_hash`, `result` — RLS: self-read + admin |
| 3 | Session idle timeout hook | Client idle → `signOut({ scope: 'local' })`; document policy days in org settings |
| 4 | Wire ABAC at decide server fns | Call `assertCanApproveUseCase` after scoped `decide` |

SCIM remains deferred (`SCIM_STATUS.supported = false`).
