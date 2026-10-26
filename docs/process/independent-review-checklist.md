# Independent review checklist (Codex or equivalent)

Use before human merge. Reviewing agents do **not** merge, push to `main`, create tags, or change GitHub settings.

Mark Pass / Fail / N/A with evidence.

## SoT and scope

- [ ] Nav only via `src/lib/navigation/enterprise-nav.ts` (platform: `platform-admin-nav.ts`)
- [ ] Permissions via `src/lib/authz/scoped-permissions.ts` (+ `nav-capabilities.ts` for visibility)
- [ ] No secrets in source / client bundle / PR text

## Tenant / RLS / migrations

- [ ] No RLS weaken; new tables: `GRANT` → `ENABLE RLS` → `CREATE POLICY` same file
- [ ] Reserved schemas untouched (`auth`, `realtime`, `supabase_functions`, `vault`)
- [ ] `bun run test:migrations` / `test:rls` considered

## AI boundary

- [ ] Provider secrets server-only; humans Apply/Dismiss; fair-use preserved

## Quality gates

- [ ] CI jobs green per `docs/process/ci-cd-quality-gates.md`
- [ ] Critical workflow impact covered or explicitly GAP

Post a short PR comment: Approve for human review / Request changes + residual risks.
