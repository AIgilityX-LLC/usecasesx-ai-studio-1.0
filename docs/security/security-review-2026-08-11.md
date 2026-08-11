# Security review — 11 August 2026 (pre-launch gate)

Scope: auth/authorization, RLS, exposed Data API surface, public HTTP endpoints,
AI boundary, secrets, storage/export links.

## 1. Security results

| Check                                  | Result                                                               |
| -------------------------------------- | -------------------------------------------------------------------- |
| Lovable security scan                  | 0 critical, 5 warnings (tenancy model + definer functions)           |
| Supabase linter (before)               | 82 issues                                                            |
| Supabase linter (after)                | 31 issues — all accepted (see §4)                                    |
| RLS coverage                           | 100% of `public` base tables have RLS enabled                        |
| `anon` write grants on `public` tables | none                                                                 |
| Secrets in client bundle               | none (only a redaction keyword list and a key-prefix helper matched) |
| Password breach protection (HIBP)      | enabled                                                              |
| Anonymous sign-ups                     | disabled                                                             |
| Auto-confirm email                     | disabled                                                             |

## 2. RLS / authorization evidence

Unauthenticated Data API probes with the publishable key:

```
opportunities        []      portfolios            []
profiles             []      user_roles            []
audit_events         []      use_case_submissions  []
use_cases?select=slug -> [{"slug":"defense-autonomous-isr-drone-analytics"}]   # published only
rpc/ensure_user_workspace -> 42501 permission denied for function
rpc/has_role, rpc/publish_use_case_submission -> PGRST202 (not exposed to anon)
```

Public catalogue endpoints still serve anonymous callers (HTTP 200) while
running as `anon` rather than service role:
`/api/public/usecasex/taxonomy`, `/api/public/usecasex/use-cases`,
`/api/public/usecasex/use-cases/$slug`.

Scheduled maintenance endpoints reject the (public) publishable key:

```
POST /api/public/hooks/evidence-cleanup     (no secret)          -> 401
POST /api/public/hooks/erp-reconciliation   (publishable key)    -> 401
```

## 3. Fixes applied

1. **Privileged endpoint auth (high).** `/api/public/hooks/evidence-cleanup`
   and `/api/public/hooks/erp-reconciliation` authenticated on the _publishable_
   key, which is public by design — any caller could trigger storage deletion
   and ERP reconciliation. Now gated on `CRON_HOOK_SECRET`
   (`Authorization: Bearer …` or `x-cron-secret`) with a constant-time compare
   (`src/lib/cron-auth.server.ts`).
2. **Service role used for public reads (high).** The three public catalogue
   endpoints imported `supabaseAdmin` at module scope and read
   `use_case_feedback`, rating aggregates and taxonomy with RLS bypassed. They
   now use an `anon`-authenticated server client
   (`src/lib/supabase-public.server.ts`); a narrow `TO anon, authenticated`
   SELECT policy exposes only feedback where `is_public AND NOT is_hidden`.
3. **Definer routines callable without signing in (medium).** `EXECUTE` on every
   `public` trigger routine revoked from `PUBLIC`/`anon`/`authenticated`;
   `EXECUTE` on all `SECURITY DEFINER` routines revoked from `PUBLIC`/`anon` and
   granted to `authenticated`/`service_role` only. No `anon`-applicable RLS
   policy references these routines, so public browsing is unaffected.
4. **Auth hardening.** Leaked-password (HIBP) protection enabled; anonymous
   sign-ups and email auto-confirm remain off.

## 4. Accepted-risk register

| ID   | Finding                                                                                                                                                      | Decision                                                                                                                                                                                                                                                                    |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AR-1 | `authenticated` can execute `SECURITY DEFINER` helpers (`has_role`, `is_admin_tier`, `workspace_*`, `publish_use_case_submission`, `accept_*_invitation`, …) | Accepted. These are the app's RPC surface; each re-checks `auth.uid()`/role internally and returns only booleans or the caller's own scope. `publish_use_case_submission` raises unless `is_admin_tier(auth.uid())`.                                                        |
| AR-2 | `user_in_workspace` / `user_can_access_use_case` resolve access org-wide, not per `workspace_members` row                                                    | Accepted for launch. The tenant boundary is the organization; workspaces are a grouping inside a tenant. Tightening to strict membership is a behaviour change for Lite/Pro and needs a staged migration + membership backfill. Tracked for Enterprise design-partner work. |
| AR-3 | `pg_trgm`/extensions installed in `public`                                                                                                                   | Accepted. Platform-managed; relocating requires index rebuilds. No data exposure.                                                                                                                                                                                           |
| AR-4 | Public catalogue endpoints allow `*` CORS                                                                                                                    | Accepted. Read-only published content, no credentials accepted.                                                                                                                                                                                                             |
| AR-5 | Portfolio share links are capability URLs (unguessable UUID token)                                                                                           | Accepted. Server verifies revocation/expiry and returns a redacted projection with no tenant identifiers or internal notes.                                                                                                                                                 |

## 5. AI boundary

All AI entry points are `createServerFn` + `requireSupabaseAuth`, with Zod input
bounds (string/array length caps), per-task server-side prompts, structured
output validation, fair-use quota checks before the provider call
(`fair_use_exceeded`) and usage logging in `ai_usage_events`.
`LOVABLE_API_KEY` is read server-side only.

## 6. Security gate

PASS — no critical finding open; all private tables enforce RLS; unauthenticated
cross-tenant reads return no rows; no secret in the client bundle; privileged
scheduled endpoints require a server-only shared secret.

## Addendum — storage TTLs, export authorization, AI abuse controls (2026-08-11, part 2)

### Storage

- `src/lib/storage/storage-policy.ts` is the single policy: per-bucket MIME
  allowlist, byte cap, and signed-URL TTL (evidence 60 s, avatars 300 s —
  previously 3600 s). Extension/MIME mismatch is rejected, object names are
  sanitised, and `parseEvidencePath` rejects traversal and absolute paths.
- Private evidence URLs are no longer signed in the browser.
  `createEvidenceSignedUrlFn` re-checks the caller's access to the parent use
  case through their RLS-scoped client, then mints the URL server-side.

### Exports and reports

- `authorizeExport` (`report-access.server.ts`) re-resolves role, workspace
  membership and edition from the database, applies the `reports.generate`
  entitlement, then the format matrix. Called by every CSV/PDF helper via
  `authorizeReportExportFn`, and by the streaming roadmap export route — a
  valid bearer token alone no longer produces a file (403 otherwise).

### AI endpoints

- Burst limits (60 s rolling window, counting successes _and_ failures) sit in
  front of the existing 24 h fair-use budget; overridable via
  `AI_BURST_PER_USER_PER_MINUTE` / `AI_BURST_PER_WORKSPACE_PER_MINUTE`.
- All untrusted input is sanitised and fenced (`src/lib/ai/sanitize.ts`) at the
  single `AIService.run` choke point, with a system-prompt notice that fenced
  content is data. Outputs remain schema-validated before use.

### Evidence

- `bun run tests/cross-workspace-abuse.e2e.ts` — 28/28 controls held
  (anon reads, cross-tenant reads/writes, workspace re-parenting, share-link
  scoping and revocation).
- `tests/unit/storage-policy.test.ts` + `tests/unit/ai-abuse-controls.test.ts`
  — 26 tests. Full unit suite 238 pass / 0 fail. Lint 0 errors, typecheck and
  build clean. No secret name appears in `dist/client`.

### Accepted risks (unchanged)

- Share links remain capability-based by design: possession of a live token
  grants the redacted read-only projection only, never table access.
- Avatars stay in a private bucket with 300 s signed URLs; a copied URL is
  valid for that window.
