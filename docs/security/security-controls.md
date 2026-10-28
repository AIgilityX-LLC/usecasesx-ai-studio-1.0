# UseCasesX™ security controls catalogue

Maps threat-model findings to **preventive / detective / corrective** controls. Prefer enforcing in server boundaries — never disable product features solely to hide gaps.

---

## 1. Authentication

| Control | Type | Implementation |
| ------- | ---- | -------------- |
| Supabase Auth only | P | Generated clients; no custom credential stores |
| No anonymous sign-up / no email auto-confirm | P | Auth project settings (baseline) |
| OAuth redirect same-origin | P | `window.location.origin` callback |
| Server fn auth middleware | P | `requireSupabaseAuth` |
| Demo maintenance secret | P | `demoResetAuthorized` — timing-safe `DEMO_PERSONA_PASSWORD` + `DEMO_RESET_ENABLED` in production |
| HIBP leaked-password protection | P | Auth setting (baseline review) |

## 2. Authorization & multi-tenancy

| Control | Type | Implementation |
| ------- | ---- | -------------- |
| RLS on every public table | P | Migrations: GRANT → ENABLE RLS → POLICY |
| Roles in `user_roles` + `has_role()` | P | Never roles on `profiles` |
| Server re-check of workspace/org | P | `requireOrgManager`, `authorizeExport`, storage issuers |
| Platform admin gate | P | `requirePlatformAdmin` / `is_admin_tier` |
| Entitlements centralization | P | `useEntitlement` / `RequirePlan` + server re-check |
| Mass-assignment allowlists | P | Zod input validators; `pickAllowed` / `FORBIDDEN_TENANT_WRITE_KEYS` |

## 3. API & webhooks

| Control | Type | Implementation |
| ------- | ---- | -------------- |
| Cron secret (not publishable key) | P | `isAuthorizedCron` / `isAuthorizedCronHook` |
| Timing-safe secret compare | P | `timingSafeEqual` |
| Optional webhook replay window | P | `assertWebhookFresh` + `claimWebhookDeliveryId` |
| Public CORS allow-list env | P | `PUBLIC_API_CORS_ORIGINS` |
| Security response headers | P | `SECURITY_HEADERS` / `withSecurityHeaders` |
| Roadmap export authz | P | Bearer → `getUser` → portfolio workspace → `authorizeExport` |

## 4. Database / RLS

| Control | Type | Implementation |
| ------- | ---- | -------------- |
| Tenant columns on rows | P | `organization_id` / `workspace_id` |
| Anon write grants absent | P | Migration discipline |
| Definer EXECUTE tightened | P | Revoke PUBLIC/anon where unsafe |
| RLS isolation tests | D | `bun run test:rls` |

## 5. Storage & uploads

| Control | Type | Implementation |
| ------- | ---- | -------------- |
| MIME / size / extension policy | P | `validateUpload` / `BUCKET_POLICIES` |
| Safe object names | P | `safeObjectName` |
| Evidence path schema | P | `parseEvidencePath` (UUID/UUID/file, no `..`) |
| Authz before signed URL | P | `issueEvidenceSignedUrl` + RLS read |
| Short signed URL TTL | P | Per-bucket seconds |
| Storage denial audit | D | `recordStorageDenied` |

## 6. AI integrations

| Control | Type | Implementation |
| ------- | ---- | -------------- |
| Server-only provider keys | P | Gateway / engine-crypto; never browser |
| Fair-use quotas | P | `fair-use` + `ai_usage_events` |
| Input Zod bounds | P | Prompt/task length caps |
| Outbound URL SSRF guard | P | `assertSafeOutboundUrl` on engine upsert/test/gateway |
| Sovereignty AI allow-lists | P | Tenant policy / control plane |
| Structured tool outputs | P | No free-form eval of model text |

## 7. Exports & admin

| Control | Type | Implementation |
| ------- | ---- | -------------- |
| Role-aware export formats | P | `report-access` |
| Export throttle / observability | D | `export.throttled` events |
| Admin actions audited | D | `audit_events` |
| Support access time-bound, no impersonation | P | `support-access` + sovereignty admin policy |

## 8. Logging & secrets

| Control | Type | Implementation |
| ------- | ---- | -------------- |
| Structured log redaction | P | `redactRecord` / sensitive key patterns |
| Correlation ids | D | `x-correlation-id` |
| No secret values in health | P | Presence-only env checks |
| Service role dynamic import after auth | P | `supabaseAdmin` pattern |

## 9. Sovereignty / deployment (product controls)

| Control | Type | Implementation |
| ------- | ---- | -------------- |
| Configurable sovereignty policies | P | `SovereigntyControlPlane` |
| Deployment profile claim gates | P | `DeploymentProfileService.mayClaimProfileLive` |
| Gradual maturity (no overnight “sovereign”) | P | Phase 8 maturity ladder |

---

## Control gaps (tracked, not hidden)

| Gap | Severity | Direction |
| --- | -------- | --------- |
| Durable webhook idempotency everywhere | Medium | Prefer DB claim for all hooks |
| Strict workspace membership (vs org) | Medium | Enterprise staged migration |
| App-layer CSRF tokens if cookie sessions expand | Medium | Keep bearer-first |
| Content Security Policy nonce hardening | Low–Medium | Tighten `unsafe-inline` over time |

Do **not** remove demo login, AI engines, or exports to “fix” issues — harden authz and validation instead.
