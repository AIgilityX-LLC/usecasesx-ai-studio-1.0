# UseCasesX™ threat model

**Audience:** Engineering, Security, Enterprise Design Partners  
**Method:** Attacker mindset across product surfaces (STRIDE-informed)  
**Scope:** Authentication → third-party integrations (see inventory below)  
**Companion docs:** [security-controls.md](./security-controls.md) · [security-test-cases.md](./security-test-cases.md) · [security-baseline.md](./security-baseline.md)

---

## 1. Assets & trust boundaries

| Asset | Why it matters |
| ----- | -------------- |
| Tenant workspace data (use cases, scores, evidence, exports) | Core IP / regulated content |
| Organization membership & roles | Authorization root |
| AI prompts / completions / provider keys | Confidential + cost abuse |
| Audit / evidence trails | Compliance integrity |
| Platform admin plane | Cross-tenant power |
| Cron / webhook secrets | Privileged maintenance |

**Trust boundaries:** Browser → TanStack Start SSR/server fns → Lovable Cloud (Postgres + Auth + Storage) → AI gateway / optional openai-compatible endpoints → external webhooks/cron.

Assumption: RLS + `requireSupabaseAuth` + server-side role re-checks are the primary enforcement; UI never decides authorization alone.

---

## 2. Surface inventory

| Surface | Entry | Primary risks |
| ------- | ----- | ------------- |
| Authentication | Supabase Auth, SSO (OIDC/SAML), demo login | Credential stuffing, SSO misconfig, demo wipe abuse |
| Authorization | `user_roles`, `has_role`, workspace RPCs, entitlements | Broken access control, privilege escalation |
| Multi-tenancy | `organization_id` / `workspace_id` + RLS | Tenant breakout / IDOR |
| API endpoints | `createServerFn`, `/api/public/*` | IDOR, injection, CSRF (cookie paths), mass assignment |
| Database / RLS | Postgres policies + grants | Policy gaps, SECURITY DEFINER misuse |
| Storage | Buckets + signed URLs | Unrestricted upload, IDOR via path, long-lived URLs |
| Edge/server functions | Server handlers, hooks | SSRF, secret leak, auth bypass |
| AI integrations | Gateway + engines | Prompt injection (integrity), SSRF via `base_url`, fair-use bypass |
| File uploads | Storage policy | Malware/polyglot, path traversal |
| Report exports | CSV/JSON/PDF streams | Over-disclosure, throttle bypass |
| Admin | Platform admin server fns | Privilege escalation, SSRF via engine config |
| Webhooks / cron | `/api/public/hooks/*` | Auth bypass, replay |
| Third-party | Email, AI providers, IdP | Token theft, SSRF, supply chain |

---

## 3. Threat scenarios (attacker mindset)

### T-AUTH — Authentication

| ID | Scenario | Severity | Status |
| -- | -------- | -------- | ------ |
| T-AUTH-1 | Steal session / bearer token from XSS or logs | High | Mitigated: CSP baseline, redaction; residual XSS watch |
| T-AUTH-2 | Abuse demo reset / persona APIs without secret | **Critical** | **Remediated:** timing-safe secret + `DEMO_RESET_ENABLED` in prod; email-suffix auth removed; artifact list gated |
| T-AUTH-3 | SSO domain allow-list bypass / JIT into wrong org | High | Controls in `enterprise/sso`; verify continuously |

### T-AUTHZ / TENANT — Authorization & multi-tenancy

| ID | Scenario | Severity | Status |
| -- | -------- | -------- | ------ |
| T-AUTHZ-1 | IDOR: swap `workspaceId` / `portfolioId` / evidence path | Critical | Mitigated: RLS + server re-check; storage path parse + UC membership |
| T-AUTHZ-2 | Privilege escalation via mass-assigned `role` / `organization_id` | High | Mitigated: Zod allowlists; `pickAllowed` / forbidden-key helper added |
| T-AUTHZ-3 | Org-wide access broader than workspace membership (AR-2) | Medium | Accepted risk (documented); Enterprise may tighten |

### T-API — Public HTTP & server fns

| ID | Scenario | Severity | Status |
| -- | -------- | -------- | ------ |
| T-API-1 | Cron hooks gated on publishable key | Critical | Fixed earlier (CRON_HOOK_SECRET) |
| T-API-2 | Roadmap export with stolen bearer + foreign portfolio UUID | High | Mitigated: RLS client + `authorizeExport` |
| T-API-3 | CSRF on cookie-authenticated mutating routes | Medium | Bearer-oriented server fns reduce risk; document residual |

### T-INJECT — Injection / XSS / deserialization

| ID | Scenario | Severity | Status |
| -- | -------- | -------- | ------ |
| T-XSS-1 | `dangerouslySetInnerHTML` on ComingSoon features | High | **Remediated:** plain text render |
| T-INJ-1 | SQL/PostgREST filter injection | Medium | Parameterized client; avoid string-built filters |
| T-DESER-1 | `JSON.parse` of model tool args | Medium | Failure → `invalid_output`; no `eval` |

### T-SSRF — Server-side request forgery

| ID | Scenario | Severity | Status |
| -- | -------- | -------- | ------ |
| T-SSRF-1 | Platform admin sets AI `base_url` to cloud metadata / RFC1918 | **Critical** | **Remediated:** `assertSafeOutboundUrl` on upsert, test, and gateway fetch |

### T-STORAGE — Uploads & signed URLs

| ID | Scenario | Severity | Status |
| -- | -------- | -------- | ------ |
| T-STOR-1 | Upload exe / disallowed MIME | High | Mitigated: bucket policy MIME/size/ext |
| T-STOR-2 | Path `../` or cross-user evidence key → signed URL | Critical | Mitigated: `parseEvidencePath` + RLS read |
| T-STOR-3 | Overlong signed URL TTL → shareable capability | Medium | Short TTLs in policy |

### T-AI — AI abuse

| ID | Scenario | Severity | Status |
| -- | -------- | -------- | ------ |
| T-AI-1 | Fair-use / cost exhaustion | High | Fair-use counters + provider 429 |
| T-AI-2 | Prompt injection altering tool JSON | Medium | Structured tools; no secrets in prompts logged |
| T-AI-3 | Workspace key exfiltration via logs | High | Envelope encryption; redaction patterns expanded |

### T-ADMIN / WEBHOOK / LOG

| ID | Scenario | Severity | Status |
| -- | -------- | -------- | ------ |
| T-ADMIN-1 | Non-admin calls engine/key APIs | Critical | `requirePlatformAdmin` on mutations |
| T-HOOK-1 | Replay cron delivery | Medium | Optional timestamp + delivery id |
| T-LOG-1 | Secrets in structured logs | High | `redactRecord` + expanded sensitive keys |

### T-BIZ / RATE

| ID | Scenario | Severity | Status |
| -- | -------- | -------- | ------ |
| T-BIZ-1 | Export / AI spam | Medium–High | Export throttle events + AI fair-use |
| T-RATE-1 | Unauthenticated public catalogue scrape | Low | Accepted (public content); CORS configurable |

---

## 4. Abuse cases mapped to STRIDE

| STRIDE | Examples in UseCasesX |
| ------ | --------------------- |
| Spoofing | Stolen bearer; forged cron secret |
| Tampering | Mass assignment; policy JSON without eval |
| Repudiation | Missing audit on support/export (controls require events) |
| Information disclosure | Verbose health; demo artifacts; log leakage |
| Denial of service | AI/export flood; large uploads |
| Elevation of privilege | Demo email auth (removed); admin SSRF |

---

## 5. Residual / accepted risks

See also [security-review-2026-08-11.md](./security-review-2026-08-11.md) AR-1…AR-5.

| Risk | Rationale |
| ---- | --------- |
| Org-scoped vs strict workspace membership | Product tenancy model; staged change |
| Public catalogue CORS `*` when unset | Read-only published content |
| Portfolio share capability URLs | Unguessable token + redacted projection |
| Process-local webhook idempotency | Durable dedupe still DB-backed for critical paths |

---

## 6. Remediation log (this pass)

| Finding | Severity | Fix |
| ------- | -------- | --- |
| AI engine `base_url` SSRF | Critical | `src/lib/security/outbound-url.ts` + gateway/engines enforcement |
| Demo reset email-suffix / ungated artifact list | Critical/High | `demo-auth.ts`; POST + password; prod enable flag |
| ComingSoonGate HTML injection | High | Remove `dangerouslySetInnerHTML` |
| Incomplete secret redaction keys | High | Expand `SENSITIVE_KEY_PATTERNS` |
| Mass-assignment helper gap | High (defense) | `mass-assignment.ts` allowlist utilities |

Automated tests: `tests/unit/security-outbound-url.test.ts` (+ updated demo e2e gates).
