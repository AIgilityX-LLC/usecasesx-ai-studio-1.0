# 03 — Repository, Tooling, Environments

## Monorepo layout

```text
usecasesx/
  apps/
    web/                    Next.js App Router (Vercel)
      src/app/              route segments — see 06-route-map.md
      src/components/       UI, shadcn primitives under components/ui/
      src/hooks/            useEntitlement, usePlan, useWorkspace, useSession
      src/lib/              client-side glue only (no business rules)
    api/                    Hono service (Railway)
      src/index.ts          server bootstrap
      src/routes/v1/**      versioned endpoints
      src/middleware/       auth (JWKS), scope, ratelimit, audit, correlation
      src/services/**       orchestration that calls packages/domain
      src/jobs/**           cron + queue workers
  packages/
    domain/                 pure business logic, zero framework imports
    contracts/              Zod schemas + inferred types (shared web ⇄ api)
    api-client/             generated typed client from OpenAPI
    db/                     migrations, generated Supabase types, RLS tests
    ui/                     shared design tokens + primitives (optional)
    config/                 eslint, tsconfig, prettier, tailwind presets
  scripts/                  verification, seeding, ops
  docs/                     this playbook + architecture/security/product docs
```

**Import rules enforced by lint:**
- `packages/domain` may not import from `apps/*`, `next`, `react`, `hono`, or `@supabase/*`.
- `apps/web` may not import from `apps/api`; it consumes `packages/api-client`.
- Only `apps/api` may import the service-role client.

## Tooling

| Concern | Choice |
|---|---|
| Package manager | **pnpm** workspaces (Vercel + Railway both first-class) |
| Task runner | **Turborepo** with remote cache |
| Language | TypeScript strict, `noUncheckedIndexedAccess`, `noPropertyAccessFromIndexSignature` |
| Typecheck | `tsgo` (fast) in dev, `tsc -b` in CI for project references |
| Lint | ESLint 9 flat config + `eslint-plugin-boundaries` for the import rules |
| Format | Prettier, enforced in CI |
| Tests | Vitest (unit), Playwright (e2e), `pnpm test:rls` (SQL policy tests) |
| API validation | Zod + `@hono/zod-openapi` |
| Migrations | Supabase CLI (`supabase migration new`, `supabase db push`) |
| Observability | Sentry (web + api), structured JSON logs, Railway metrics |

## Environments

| Env | Web | API | Database |
|---|---|---|---|
| local | `pnpm dev` (:3000) | `pnpm dev:api` (:8787) | Supabase local or a dev project |
| preview (per PR) | Vercel preview URL | Railway PR environment | shared **preview** Supabase project |
| staging | `staging.usecasesx.aigilityx.com` | `api-staging.…` | dedicated staging project |
| production | `usecasesx.aigilityx.com` | `api.usecasesx.aigilityx.com` | production project |

Never point preview or staging at the production database. PR runs create and delete workspaces,
invitations, and portfolios.

## CI pipeline (GitHub Actions)

`ci.yml` on every PR, all jobs required:

1. `install` — pnpm with lockfile frozen, Turbo cache restore.
2. `lint` — eslint + prettier check + boundary rules.
3. `typecheck` — `tsc -b` across the workspace.
4. `unit` — Vitest for `packages/domain`, `packages/contracts`, `apps/api`, `apps/web`.
5. `contracts` — OpenAPI generated output is committed and up to date (fails on drift).
6. `migrations` — SQL lints: ordering, every `CREATE TABLE public.*` followed by GRANT + RLS +
   POLICY, no destructive statement without a recorded manifest exception.
7. `rls` — spins the preview database, runs cross-workspace isolation tests.
8. `e2e` — Playwright P0 suite against the Vercel preview + Railway PR environment.
9. `release-gate` (on `main` / release branches) — `verify:release`, nav integrity, SEO metadata.

Branch protection: no direct pushes to `main`; PRs require 1 review, green CI, and a filled
`PULL_REQUEST_TEMPLATE` section for migrations and rollback.

## Definition of "done" for tooling setup (P0 exit)

- `pnpm i && pnpm build && pnpm test && pnpm lint && pnpm typecheck` green from a clean clone.
- A trivial endpoint deploys to Railway and a trivial page deploys to Vercel from `main`.
- Preview environments spin up automatically on PR and tear down on merge.
