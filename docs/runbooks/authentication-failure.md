# Runbook — Authentication failure

**Symptoms:** Users cannot sign in / stay signed in; SSO or password flows fail; elevating errors in auth logs.  
**Related:** Identity sovereignty; security event logging SLO.

## Immediate

1. Reproduce with a non-privileged test account (never use production owner MFA as the only probe).
2. Check `/api/public/ready` — `dependency_auth` / env presence.
3. Confirm Auth provider status (managed Auth / IdP for Enterprise SSO).
4. Search logs for `level":"security"` and failed sign-in spikes (`logSecurityEvent`).

## Triage

| Pattern | Likely cause | Action |
| ------- | ------------ | ------ |
| All users, all methods | Auth service or clock skew | Provider status; verify Worker time |
| One org SSO only | SSO config / domain allow-list | Review `organization_sso_configs` with org admin |
| Demo / pilot only | Credential rotation | Rotate demo secrets; do not widen policies |
| Session drops mid-journey | Cookie / SameSite / multi-domain | Check security headers + app origin |

## Mitigation

- Prefer fixing IdP metadata / domain allow-lists over bypassing auth.
- If break-glass support is needed, use time-bound `support_access_grants` — never impersonation.
- Emit security signals; append audit events for admin remediations.

## Close-out

- Confirm sign-in for Lite (if applicable), Pro, and one Enterprise SSO tenant.
- Rotate any exposed credentials; document correlation ids.
