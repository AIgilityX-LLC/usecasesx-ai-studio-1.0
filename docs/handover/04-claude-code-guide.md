# 04 — Driving Claude Code on This Codebase

Claude Code is fast but it will happily "helpfully" break the invariants that keep this product
launchable. The contract below is what makes it safe.

## Step 1 — Put a `CLAUDE.md` at the new repo root

Copy this verbatim into `CLAUDE.md`. Claude Code reads it automatically on every session.

```markdown
# CLAUDE.md — UseCasesX™ engineering contract

## Architecture (fixed — do not change without the tech lead)
- Monorepo: apps/web (Next.js App Router, Vercel) · apps/api (Hono, Railway) · packages/{domain,contracts,db,api-client,ui,config}
- Database/Auth/Storage: Supabase. RLS is the authoritative tenancy boundary.
- pnpm + Turborepo. TypeScript strict. Tailwind v4 semantic tokens. shadcn/Radix primitives.

## Hard rules
1. packages/domain must contain zero framework imports (no next, react, hono, @supabase/*).
2. apps/web never imports the service-role key or apps/api source. It calls packages/api-client.
3. Every API handler validates input with a Zod schema from packages/contracts.
4. Every authenticated handler verifies the bearer token AND the workspace scope. A UI guard is not authorization.
5. Roles live only in public.user_roles, checked via has_role(). Never on profiles.
6. Plan/edition checks go through useEntitlement/usePlan/RequirePlan/Can (web) and resolveEntitlements (api). Never inline `plan === 'pro'`.
7. Migrations are additive. Every CREATE TABLE public.x is followed, in the same migration, by GRANT → ENABLE ROW LEVEL SECURITY → CREATE POLICY.
8. Never hardcode colors in components (no text-white, bg-black, bg-[#hex]). Use semantic tokens.
9. Never edit generated files: packages/db/src/types.ts, packages/api-client/generated/**, openapi.json.
10. Governance-relevant actions emit an append-only audit event. Never UPDATE or DELETE audit rows.
11. Secrets are read from process.env inside handlers only, and only in apps/api. Never log them.
12. Do not add another router, CSS framework, ORM, or backend.

## Definition of Done for every change
pnpm lint && pnpm typecheck && pnpm test && pnpm build all pass; new tables have RLS tests; UI changes have
Playwright evidence; report changed files, migrations, tests, risks, and rollback.

## Commands
pnpm dev | pnpm dev:api | pnpm test | pnpm test:rls | pnpm test:e2e | pnpm lint | pnpm typecheck | pnpm build
```

## Step 2 — Working style

- **One phase per branch, one surface per PR.** Claude Code degrades badly on 40-file PRs. Cap at
  ~15 files or one route group.
- **Always give it the contract files to read first.** Start prompts with an explicit read list
  (`packages/contracts/src/use-case.ts`, `docs/handover/06-route-map.md`, the legacy file being
  ported). Without this it invents shapes.
- **Port with the tests first.** For every domain module: copy the legacy `tests/unit/*.test.ts`,
  make it compile against the new import path, watch it fail, then port the implementation.
- **Parallelise with subagents** for independent work: "spawn one agent per taxonomy route" is fine;
  "spawn one agent per layer of the same feature" is not.
- **Never let it write migrations unreviewed.** Require the SQL in the PR description, reviewed by the
  tech lead, before it is applied to any shared database.
- **Make it prove things.** Ask for the command output, not a claim. "Exit code 0 with `Error` in the
  output is a failed verification" belongs in your review vocabulary.

## Step 3 — Guardrails that catch it automatically

Add these so the rules are enforced, not just documented:

1. `eslint-plugin-boundaries` — encodes the import rules in rule form.
2. A custom ESLint rule (or `no-restricted-syntax`) banning `plan ===`, `edition ===`,
   `role === 'admin'` outside `packages/domain/src/authz/**`.
3. `no-restricted-imports` blocking `@/lib/supabase/admin` outside `apps/api`.
4. Tailwind lint rule banning raw color utilities (`text-white`, `bg-black`, `bg-[#`).
5. `scripts/check-migrations.mjs` — parses each new migration for the GRANT/RLS/POLICY quartet and
   fails on unrecorded destructive statements.
6. `scripts/check-contract-drift.mjs` — regenerates OpenAPI and the client, fails if the committed
   output differs.
7. `scripts/check-metadata.mjs` — every `page.tsx` exports `metadata` or `generateMetadata` with a
   unique title/description; authenticated segments assert `robots: { index: false }`.
8. A pre-commit hook running lint-staged + typecheck on changed packages.

## Step 4 — Review checklist per PR

- [ ] Does it touch `packages/domain`? Then it must have unit tests and no framework imports.
- [ ] New endpoint? Zod schema, auth middleware, scope guard, audit event, OpenAPI entry, test.
- [ ] New table? GRANT + RLS + policies in the same migration, plus an RLS isolation test.
- [ ] New UI? Loading, empty, error, and unauthorised states all present. No dead CTA.
- [ ] Entitlement-gated? Gate in the UI **and** re-checked in the API.
- [ ] Metadata unique; authenticated pages `noindex`.
- [ ] Secrets untouched by client code; nothing new logged.
- [ ] Rollback described in the PR body.

## Step 5 — Anti-patterns to reject on sight

| Symptom | Why it is wrong |
|---|---|
| `createClient(url, SERVICE_ROLE)` in `apps/web` | leaks bypass-RLS credentials to the render tier |
| API handler reads `workspaceId` from the body and trusts it | tenancy bypass |
| `if (user.plan === 'pro')` in a component | bypasses the entitlement service |
| `DELETE FROM` / `DROP` in a migration | destructive without a recorded exception |
| Business logic added directly in a route handler | belongs in `packages/domain` |
| `useEffect` + `fetch` for initial page data | use RSC or TanStack Query with a server prefetch |
| New table with policies but no GRANT | PostgREST returns permission errors at runtime |
| Audit row updated to "correct" it | audit is append-only; write a new event |
