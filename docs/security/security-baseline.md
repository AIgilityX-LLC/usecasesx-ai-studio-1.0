# Security Baseline — UseCasesX™

Non-negotiable security floor. Applies to Lite, Pro and Enterprise.

---

## 1. Authentication

- Supabase Auth via the generated client. No custom auth flows.
- No anonymous sign-ups. Email auto-confirm stays off unless explicitly requested.
- Social OAuth `redirect_uri` is a same-origin public URL (`window.location.origin[/auth/callback]`), never a protected route.
- Server functions that require a user carry `.middleware([requireSupabaseAuth])`. Bearer token is attached client-side via the middleware registered in `src/start.ts`.

## 2. Authorization

- **Row-Level Security (RLS) is mandatory** on every `public` table.
- Roles live in `public.user_roles` (separate table). Never on `profiles`. Never in localStorage.
- Role checks use the `SECURITY DEFINER public.has_role(_user_id, _role)` function to avoid recursive RLS.
- Every migration that `CREATE TABLE`s in `public` also `GRANT`s to the right roles (`authenticated`, `service_role`; `anon` only when a policy allows anon reads) **in the same file**, before `ENABLE ROW LEVEL SECURITY` + `CREATE POLICY`.

## 3. Secrets

- `SUPABASE_SERVICE_ROLE_KEY`, AI provider keys and any private credential are **server-only**.
- Read `process.env.*` **inside handlers**, never at module scope of a client-imported file.
- Never log, echo, screenshot, or return secrets. Never place them in browser bundles or public config.
- Client uses `import.meta.env.VITE_*` for publishable values only.

## 4. Server boundaries

- App-internal logic → `createServerFn` (bearer-authenticated).
- External HTTP → `src/routes/api/public/*`. Verify signatures / caller identity **before** processing.
- Never call a `requireSupabaseAuth` server fn from a public route `loader` (SSR prerender has no session).

## 5. Admin client discipline

- `supabaseAdmin` bypasses RLS. Import dynamically inside handlers **after** verifying the caller:
  ```ts
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  ```
- Never used to *decide* whether a user is an admin — verify roles first through the user-scoped `context.supabase` and `has_role()`.

## 6. Data protection

- Tenant/workspace scoping on every row. Server handlers re-check scope.
- No PII in analytics events, logs, or client-side stores beyond what the user submitted.
- Exports (PDF/Word) run through server-side generation when they contain multi-tenant data; client-side generation is limited to the caller's own data.

## 7. Migration safety

- Additive only. No destructive drops/renames without a staged plan + rollback in the PR.
- Never touch reserved schemas: `auth`, `storage`, `realtime`, `supabase_functions`, `vault` (no triggers either).
- Never edit auto-generated files: `src/integrations/supabase/{client,client.server,auth-middleware,auth-attacher,types}.ts`, `.env`, `supabase/config.toml`.

## 8. Audit

- Governance-relevant actions emit append-only audit events (workspace, actor, subject, action, timestamp, evidence pointer).
- Audit tables are insert-only for `authenticated`; read policies restricted to admins/auditors.

## 9. Frontend hardening

- No admin decisions based on client-side storage. All authorization is server-verified.
- No hardcoded credentials, tokens, or provider URLs in components.
- CSP-friendly: no inline scripts beyond what the framework emits.

## 10. Verification

Before shipping any security-relevant change:

1. Run `bun run test:rls` and add coverage for the new table/policy.
2. Run the security scan (`security--run_security_scan`) and resolve findings.
3. Verify the route is reachable with the intended roles and blocked otherwise.
4. Confirm no secret appears in the client bundle (`grep` on the built assets).

## 11. Incident posture

- Rotate keys via Lovable Cloud tools; never fabricate placeholder secret values.
- On suspected leak: revoke, rotate, audit access logs, notify per engagement contract.
- Rollback path must accompany every migration and security-relevant change.
