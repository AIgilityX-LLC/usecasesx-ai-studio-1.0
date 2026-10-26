# Independent review checklist (reviewing agent)

Use this when Codex (or another agent) reviews a PR **before** human approval. The reviewing agent does **not** merge, push to `main`, create tags, or change GitHub settings. There is **no** automated AI-review workflow — this is a manual agent pass.

Mark each item Pass / Fail / N/A with evidence (file:line or test name). Failures block human approval.

## Scope and SoT

- [ ] Change stays within declared domains; no drive-by refactors.
- [ ] Customer nav changes only touch **`src/lib/navigation/enterprise-nav.ts`** (and consumers). Platform ops: **`platform-admin-nav.ts`**. No new menu arrays / no `src/config/navigation/*` (see `docs/refactor/baseline.md` §3.1).
- [ ] Permission / action vocabulary only via **`src/lib/authz/scoped-permissions.ts`**. Nav visibility via `nav-capabilities.ts` only.
- [ ] Entitlements via `useEntitlement` / `usePlan` / `RequirePlan` / `Can` — no inline plan/role checks in JSX.

## Tenant isolation & RLS

- [ ] Every touched tenant table retains workspace/org ownership semantics.
- [ ] No RLS weaken, drop, or `USING (true)` expansion without explicit security sign-off.
- [ ] New tables: `GRANT` → `ENABLE ROW LEVEL SECURITY` → `CREATE POLICY` in the **same** migration; `service_role` grants if server handlers touch the table.
- [ ] Reserved schemas untouched: `auth`, `storage`, `realtime`, `supabase_functions`, `vault`.
- [ ] Relevant isolation tests green or explicitly deferred with risk ID (`test:rls`, tenancy, cross-workspace).

## Secrets & server boundaries

- [ ] No secret in source, client bundle, logs, or PR text. `process.env.*` secrets only inside server handlers.
- [ ] No import of `*.server.ts` / `client.server` from client graphs.
- [ ] Protected server fns use `requireSupabaseAuth`; not called from public-route loaders.
- [ ] Public HTTP under `src/routes/api/public/*` verifies signatures / caller identity before work.

## Authz (AGENTS.md)

- [ ] Roles only in `user_roles`; never on `profiles`.
- [ ] Server re-checks claims; UI visibility is not authorization.
- [ ] AI path respects `docs/architecture/ai-boundary.md`: gateway server-only; humans Apply/Dismiss; no provider secrets in browser.

## Migration safety

- [ ] Additive only unless staged plan + rollback documented.
- [ ] Migration timestamp after current head (`docs/refactor/baseline.md` §6).
- [ ] Rollback note present in PR template.

## AI-boundary rules (AGENTS.md / ai-boundary)

- [ ] No new ad-hoc provider `fetch` from UI or thin wrappers at module scope.
- [ ] Fair-use / audit provenance preserved for new AI tasks.

## Definition of Done evidence

- [ ] Lint / typecheck / build / nav-integrity / relevant tests cited in PR.
- [ ] No fake Enterprise claims or dead CTAs introduced.
- [ ] Independent review checkbox in PR template can be checked after this pass.

## Output

Reviewing agent posts a short comment: verdict (Approve for human review / Request changes), Fail items with paths, and residual risks.
