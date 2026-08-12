# 09 — Security and Compliance

The split into two deployment targets adds attack surface: a public API origin, a second secret store,
and a token that now crosses origins. Everything below is a launch requirement, not a hardening
backlog.

## Non-negotiables

1. **RLS is the boundary.** The API's scope guard is a second line, never a replacement. Policies stay
   on, and cross-workspace isolation is proven against the database directly.
2. **`SUPABASE_SERVICE_ROLE_KEY` exists only on Railway.** It must never appear in `apps/web`, in a
   `NEXT_PUBLIC_*` variable, in a log line, in a client bundle, or in a screenshot. Add a CI grep that
   fails the build if the literal name appears outside `apps/api`.
3. **Roles only in `user_roles`, checked via `has_role()`.** Any client-supplied role, plan, or
   workspace id is untrusted input.
4. **Every privileged handler re-verifies the role**, using the user-scoped client, before touching the
   admin client. Never use the admin client to decide whether the caller is an admin.
5. **Every input validated with Zod** — body, query, params, headers you branch on. Bounds on strings,
   arrays, and numbers; format checks on emails and URLs.
6. **Append-only audit** for governance actions. No updates, no deletes.
7. **No secrets in the browser.** Provider AI keys, Stripe secret, email API key, cron secret all live
   server-side and are read inside handlers.

## Token and session security

- Bearer tokens, not cross-site cookies. The Supabase session cookie stays first-party to the web
  origin; the token is attached server-side or via a same-origin proxy route.
- Verify JWTs against Supabase JWKS with the issuer from OIDC discovery. Cache keys with a TTL and
  handle key rotation. Reject `alg: none`, wrong issuer, wrong audience, or expired tokens.
- Short access-token lifetime with refresh rotation. Revoke on password change and MFA change.
- Sign-out: cancel in-flight queries → clear the client cache → `signOut()` → history-replace to
  `/auth`. Skipping any step leaks protected state or produces a 401 storm.

## API surface controls

| Control | Requirement |
|---|---|
| CORS | Explicit origin allow-list (prod, staging, Vercel preview pattern). No wildcard with credentials. `OPTIONS` returns 204 with matching headers. |
| Rate limits | Per-user and per-workspace, per route class. AI: Pro 60/user/day + burst 8/user/min; Lite 5/user/day + burst 3/min. Auth endpoints limited separately. |
| Payload limits | Max body size per route; reject oversized uploads before buffering. |
| Idempotency | Required on all mutating webhook and billing endpoints. |
| Webhooks | HMAC over the **raw** body, timing-safe compare, replay window, verify before any parsing or write. |
| Cron | `CRON_HOOK_SECRET` header, timing-safe compare, no side effects on failure. |
| Errors | Client sees a stable code + safe message. Stack traces and provider bodies stay in server logs. |
| Enumeration | No "user not found" distinction on auth or invitation lookup. Constant-time-ish responses. |

## Web app controls

- CSP with nonces (script-src, no `unsafe-inline` for scripts), `frame-ancestors 'none'`,
  `Strict-Transport-Security` with preload, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, and a restrictive `Permissions-Policy`.
- No `dangerouslySetInnerHTML` on user or AI content. Sanitise server-side if rich text is required.
- Open-redirect protection: post-auth `redirect` params must validate as same-origin relative paths.
- Public token routes (`/c/[token]`, `/p/[token]`, `/invite/[token]`, `/workshops/join/[token]`) use
  high-entropy tokens, are revocable, have an expiry, and are `noindex`.
- Never return PII from a public endpoint or a shared-token page beyond what the sharer intended.

## AI boundary

- Provider-neutral gateway in `apps/api`. Model IDs, prompts, and defaults live server-side.
- Prompt-injection defences on all untrusted input: instruction stripping, delimiting, output schema
  validation. Treat model output as data, never as instructions or as code to execute.
- Fair-use enforcement server-side, producing rate-limit audit events.
- Every AI call is auditable: input hash, model, latency, cost class, workspace, correlation id.
  Never log raw prompt content containing tenant data.
- Time-box every task (30–60 s) with at most one retry on transient failure. Every AI surface degrades
  to manual entry so the core journey survives an outage.

## Compliance surfaces (already built — port, do not regress)

- Terms, Privacy, Acceptable Use, AI Notice, Founding Access Terms, Entitlement pages.
- Data rights: export request and deletion request with a 30-day grace period, both audited.
- Cookie/analytics consent banner with a preference centre; analytics respect opt-out.
- AI decision-support notices near every AI entry point.
- Founding Access complimentary end date (31 December 2026) stated consistently in UI, terms, and
  entitlement resolution.

## Pre-launch security verification

- [ ] Automated dependency scan; no critical or high advisories unresolved.
- [ ] Secret scan across history; rotate anything ever committed.
- [ ] Anonymous access sweep: every private table returns zero rows unauthenticated.
- [ ] Cross-workspace abuse suite green (read, write, export, storage, AI).
- [ ] Authz matrix green for Owner, Admin, Contributor, Viewer, Facilitator.
- [ ] Audit immutability test green (update/delete denied at grant level).
- [ ] Storage: MIME/size rejection, signed-URL TTL, access re-verification, download audit entries.
- [ ] Rate limits observed under load; limit events land in observability.
- [ ] Stripe webhook rejects a tampered signature; cron rejects a wrong secret.
- [ ] Security headers verified on the live canonical host.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` absent from the web bundle (grep the build output).
- [ ] Penetration-test findings triaged; no open critical.
