# UseCasesX™ security test cases

Executable and manual cases aligned to [threat-model.md](./threat-model.md).  
Automated suites live under `tests/unit/*` and `tests/*.e2e.ts`.

Legend: **A** = automated · **M** = manual / staged · **P** = Playwright/e2e

---

## Authentication

| ID | Case | Type | Expect |
| -- | ---- | ---- | ------ |
| TC-AUTH-01 | Unauthenticated call to `requireSupabaseAuth` server fn | A/P | 401 / reject |
| TC-AUTH-02 | Demo reset with wrong password | A | `demoResetAuthorized` false |
| TC-AUTH-03 | Demo reset in production without `DEMO_RESET_ENABLED` | A | false even if password matches |
| TC-AUTH-04 | Demo artifact list without password | A | server fn rejects |
| TC-AUTH-05 | SSO JIT with non-allowlisted domain | A | `mayJitProvision` false |

## Authorization / IDOR / tenant breakout

| ID | Case | Type | Expect |
| -- | ---- | ---- | ------ |
| TC-AUTHZ-01 | RLS cross-tenant SELECT | P | `bun run test:rls` empty/denied |
| TC-AUTHZ-02 | Export portfolio UUID outside membership | P/M | 403/404 |
| TC-AUTHZ-03 | Evidence signed URL for foreign path | A/M | deny + storage denied event |
| TC-AUTHZ-04 | `parseEvidencePath` with `../` or non-UUID | A | null |
| TC-AUTHZ-05 | Non-admin `saveEngineFn` | M | platform admin required |
| TC-AUTHZ-06 | Mass-assignment of `organization_id` / `plan` | A | `assertNoForbiddenKeys` / Zod drop |

## Injection / XSS / CSRF

| ID | Case | Type | Expect |
| -- | ---- | ---- | ------ |
| TC-XSS-01 | ComingSoonGate renders HTML entities as text | A/M | no script execution (`<img onerror>` stays text) |
| TC-INJ-01 | Oversized AI prompt / array | A | Zod reject |
| TC-CSRF-01 | Cross-origin POST without bearer to mutating public API | M | 401 |

## SSRF

| ID | Case | Type | Expect |
| -- | ---- | ---- | ------ |
| TC-SSRF-01 | `assertSafeOutboundUrl("https://169.254.169.254/")` | A | deny |
| TC-SSRF-02 | `assertSafeOutboundUrl("https://127.0.0.1/")` | A | deny |
| TC-SSRF-03 | `assertSafeOutboundUrl("http://api.openai.com")` | A | https_required |
| TC-SSRF-04 | Engine upsert schema with private host | A | Zod throw |
| TC-SSRF-05 | Gateway fetch with unsafe endpoint | A/M | upstream failure, no fetch to metadata |

## Storage / uploads

| ID | Case | Type | Expect |
| -- | ---- | ---- | ------ |
| TC-STOR-01 | Upload `application/octet-stream` to evidence | A | `validateUpload` deny |
| TC-STOR-02 | Oversized file | A | deny |
| TC-STOR-03 | Extension/MIME mismatch | A | deny |
| TC-STOR-04 | Signed URL TTL ≤ policy | A | `signedUrlTtl` |

## AI / rate limit / logging

| ID | Case | Type | Expect |
| -- | ---- | ---- | ------ |
| TC-AI-01 | Fair-use exceeded returns `fair_use_exceeded` | A | service failure kind |
| TC-AI-02 | Redaction of `key_ciphertext` / `client_secret` | A | `[redacted]` |
| TC-RATE-01 | Export throttle outcome recorded | A/M | observability event |

## Webhooks

| ID | Case | Type | Expect |
| -- | ---- | ---- | ------ |
| TC-HOOK-01 | Cron without secret | P | 401 |
| TC-HOOK-02 | Cron with publishable key only | P | 401 |
| TC-HOOK-03 | Stale `X-Webhook-Timestamp` | A | replay reject |
| TC-HOOK-04 | Duplicate `X-Webhook-Id` | A | duplicate reject |

## Admin / business logic

| ID | Case | Type | Expect |
| -- | ---- | ---- | ------ |
| TC-ADMIN-01 | Support grant with impersonation flag | A | sovereignty / support deny |
| TC-ADMIN-02 | Break-glass beyond max hours | A | deny |
| TC-BIZ-01 | Sovereignty evaluate denies prohibited AI provider | A | control plane deny |

---

## Automation map

| Suite | Covers |
| ----- | ------ |
| `tests/unit/security-outbound-url.test.ts` | SSRF, demo auth, mass-assignment, redaction |
| `tests/unit/storage-policy.test.ts` | Upload policy / path parse |
| `tests/unit/sovereignty-control-plane.test.ts` | Policy evaluation / admin impersonation ban |
| `tests/unit/ops-control-plane.test.ts` | Health (no secret values) |
| `tests/unit/enterprise-identity-v2-18.test.ts` | SSO / support access |
| `tests/demo-reset-endpoint.e2e.ts` | Demo gate + RLS on reset log |
| `tests/rls-isolation.e2e.ts` | Tenant isolation |

Run focused:

```bash
bun test tests/unit/security-outbound-url.test.ts tests/unit/storage-policy.test.ts
bun run test:rls
```
