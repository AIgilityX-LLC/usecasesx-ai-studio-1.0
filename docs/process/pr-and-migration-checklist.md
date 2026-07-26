# PR & Migration Checklist

Copy the relevant section into your PR body. Do not delete unchecked items — reviewers must see them.

---

## A. Every PR

- [ ] Bounded to one prompt or one defect. If not, split.
- [ ] Linked PROMPT-NN and (if applicable) risk ID from release board §7.1.
- [ ] Lovable tracked branch confirmed = `main` (or the branch named in the latest Decision Log). See `source-control-workflow.md` §3.
- [ ] Conventional Commit subject; body explains *what* and *why*.
- [ ] `bun run lint` green.
- [ ] `tsgo` typecheck green.
- [ ] `bun run build` green (route tree verify runs inside this).
- [ ] `bun run check:nav-integrity` green.
- [ ] `bun run check:compare` green (if compare/portfolio touched).
- [ ] Narrow Playwright spec run and green for the changed journey.
- [ ] No new dead CTA, no new "coming soon" surface claiming Enterprise is live.
- [ ] Responsive at 360 / 768 / 1280 px verified (screenshots for UI changes).
- [ ] Loading, empty, error, and role-based states present on any user-facing surface changed.
- [ ] No secret added to source, `.env` (beyond generated Supabase fields), or client bundle.
- [ ] Rollback path stated (usually "revert commit").

## B. UI PR extras

- [ ] Screenshots at 360, 768, 1280 attached.
- [ ] Focus ring visible on new interactive elements; keyboard walk-through described.
- [ ] axe-core zero criticals on the changed route.
- [ ] Route `head()` unique: title < 60 chars, description < 160 chars, og/twitter tags set.

## C. Server function PR extras

- [ ] File declaring `createServerFn` is a thin wrapper — no runtime helpers or config at module scope.
- [ ] No `*.server.ts` or `client.server` import from client-imported modules.
- [ ] Protected fn uses `.middleware([requireSupabaseAuth])`.
- [ ] Not called from a public route `loader` (SSR/prerender has no session).
- [ ] Input validated with Zod inside `.inputValidator()`.
- [ ] `process.env.*` read inside `.handler()`, not at module scope.

## D. Migration PR extras

- [ ] Migration file only (plus generated types if strictly required). No mixed feature+SQL PRs unless the feature cannot compile without the migration.
- [ ] **Additive only.** No `DROP TABLE`, no destructive `DROP COLUMN`, no destructive rename, no ownership reassignment. If destructive: staged plan link in `docs/architecture/data-migration-plan.md` and Decision Log approval attached.
- [ ] Every new `public.<table>` includes, in order, in the same migration:
  - [ ] `CREATE TABLE`
  - [ ] `GRANT` scoped to the roles policies allow (`authenticated`, `service_role`; `anon` only if a policy allows anon reads)
  - [ ] `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
  - [ ] `CREATE POLICY ...`
- [ ] `service_role` grants present for any table server handlers touch.
- [ ] No changes to reserved schemas (`auth`, `storage`, `realtime`, `supabase_functions`, `vault`).
- [ ] No edits to generated files: `src/integrations/supabase/{client,client.server,auth-middleware,auth-attacher,types}.ts`, `.env`, `supabase/config.toml`, `src/routeTree.gen.ts`.
- [ ] Roles stored only in a dedicated `user_roles` table (never on `profiles`).
- [ ] `bun run test:rls` green.
- [ ] Rollback path: additive → "revert commit"; destructive → link to staged rollback in the plan doc.
- [ ] Second reviewer required if migration touches auth, RLS, entitlements, or audit pipeline.

## E. Release-branch merge (into `release/2026-08-14` or `main` at launch)

- [ ] P0 only (during freeze).
- [ ] Launch commander approval recorded in release board §7.2.
- [ ] Full test matrix green: `test:e2e`, `test:smoke`, `test:navbar`, `test:mobile`, `test:rls`.
- [ ] Tag prepared: `v2026.08.14-launch` or `v2026.08.14+hotfix-N`.
