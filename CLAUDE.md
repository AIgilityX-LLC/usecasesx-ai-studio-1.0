# CLAUDE.md — Repository Operating Guide

Operational companion to `AGENTS.md`. `AGENTS.md` sets _what_ the standard is; this file documents _where things live and how to run them_ in this repo. If they conflict, the stricter rule wins.

---

## Stack (as configured)

- **Framework**: TanStack Start v1 (React 19, Vite 7). SSR/server functions target Cloudflare Workers (`nodejs_compat`).
- **Styling**: Tailwind CSS v4 via `@tailwindcss/vite`, tokens in `src/styles.css`.
- **UI**: shadcn/ui + Radix primitives.
- **Data**: TanStack Query, Zod validation, `@hookform/resolvers`.
- **Backend**: Lovable Cloud (Supabase — never named to end users).
- **Package manager**: Bun (see `bunfig.toml`).
- **Tests**: Playwright + a set of `.e2e.ts` scripts run via `bun`.

---

## Package scripts (from `package.json`)

| Command                       | Purpose                                                                                                              |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `bun run dev`                 | Cleans dev artifacts then `vite dev` (dev server is auto-supervised in Lovable sandbox — do not run manually there). |
| `bun run build`               | Verifies route tree then `vite build`.                                                                               |
| `bun run build:dev`           | Same, `--mode development`.                                                                                          |
| `bun run preview`             | Preview a production build.                                                                                          |
| `bun run lint`                | ESLint over the repo.                                                                                                |
| `bun run format`              | Prettier write.                                                                                                      |
| `bun run verify:routes`       | `scripts/verify-route-tree.mjs` — guards `routeTree.gen.ts`.                                                         |
| `bun run check:nav-integrity` | `scripts/check-nav-integrity.mjs` — no dead nav.                                                                     |
| `bun run check:compare`       | `scripts/check-compare-analytics.mjs`.                                                                               |
| `bun run test:e2e`            | Playwright end-to-end via `scripts/run-e2e.mjs`.                                                                     |
| `bun run test:smoke`          | Production smoke: `tests/production-smoke.e2e.ts`.                                                                   |
| `bun run test:navbar`         | `tests/navbar.spec.ts`.                                                                                              |
| `bun run test:mobile`         | `tests/mobile-responsive.spec.ts`.                                                                                   |
| `bun run test:rls`            | `tests/rls-isolation.e2e.ts`.                                                                                        |

Typecheck: prefer `tsgo` over `tsc --noEmit`.

---

## Repository layout

```
src/
  routes/                    File-based routing. __root.tsx + _app.tsx are the shell.
  routes/api/public/*        External HTTP surface (webhooks, cron, public reads).
  routeTree.gen.ts           GENERATED — never edit.
  components/                UI + shadcn primitives under components/ui/.
  hooks/                     useSupabaseSession, useEntitlement, usePlan, etc.
  lib/                       Domain logic. *.functions.ts = createServerFn wrappers.
  lib/ops/control-plane/     Reliability SLOs, health, metrics, structured logging.
  lib/sovereignty/           Sovereignty Architecture™ (8 dimensions, posture, Zero Trust).
  lib/deployment/            Four deployment profiles + operator responsibility matrix.
  lib/*.server.ts            Server-only helpers. Never imported from client code.
  integrations/supabase/     GENERATED clients + auth middleware. Never edit.
  router.tsx, server.ts, start.ts, styles.css
docs/                        Product/architecture/security/test docs.
scripts/                     Build & QA scripts (route verify, nav integrity, seeds).
supabase/config.toml         GENERATED. Do not edit.
tests/                       Playwright + e2e specs.
public/                      Static assets, robots.txt.
```

Routes worth knowing (already implemented):

- `src/routes/__root.tsx` — global head/meta.
- `src/routes/_app.tsx` — signed-in shell (`SiteShell`).
- Core journey routes: `_app.discover`, `_app.repository`, `_app.ai-use-case-studio`, `_app.studio.use-case.$id.*`, `_app.feasibility`, `_app.portfoliox`, `_app.roadmap`, `_app.blueprint`, `_app.advisorx`, `_app.governance`, `_app.sarpi`.
- Deliverables workspace scaffolding: `_app.studio.use-case.$id.deliverables.tsx`, `.deliverable.$type.tsx` (+ `src/lib/deliverables.{ts,data,export}.ts`).
- Admin: `_app.admin-*`, `_app.administration`.
- Public API: `src/routes/api/public/usecasex/*`.

---

## High-risk files — do not edit

- `src/routeTree.gen.ts`
- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/client.server.ts`
- `src/integrations/supabase/auth-middleware.ts`
- `src/integrations/supabase/auth-attacher.ts`
- `src/integrations/supabase/types.ts`
- `.env` (Supabase URL/keys)
- `supabase/config.toml`

---

## Migration workflow

1. Draft SQL. Every `CREATE TABLE public.<t>` must be followed by `GRANT` → `ENABLE ROW LEVEL SECURITY` → `CREATE POLICY` in the same migration.
2. Add narrow grants: `authenticated` + `service_role` by default; `anon` only for genuinely public tables.
3. Additive only. No destructive drops/renames without a staged plan.
4. Apply through the Lovable Cloud migration tool. Never modify reserved schemas (`auth`, `storage`, `realtime`, `supabase_functions`, `vault`).
5. Verify RLS with `bun run test:rls`.

---

## Server-function pattern

```ts
// src/lib/foo.functions.ts — thin wrapper only
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const doFoo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // process.env.* is read here, not at module scope
    return context.supabase.from("...").select("*").eq("id", data.id);
  });
```

Rules recap: no runtime helpers at module scope; never call a protected server fn from a public-route `loader` (SSR prerender has no session).

---

## Prohibited shortcuts (repo-specific)

- Installing/using `react-router-dom` or `BrowserRouter`.
- Creating `src/pages/`, `src/routes/_app/index.tsx`, or an `App.tsx` route switcher.
- Editing generated files listed above.
- Adding a Supabase Edge Function for app-internal logic (use `createServerFn`).
- Storing user roles anywhere other than `user_roles`.
- Inline plan/role checks — always go through `useEntitlement`/`usePlan`/`RequirePlan`/`Can`/`has_role`.
- Hardcoded Tailwind color utilities in components.

---

## Definition of Done (repo checklist)

1. `bun run lint`
2. `tsgo` typecheck
3. `bun run build` (route tree verify + build)
4. Relevant `bun run test:*` specs
5. Browser evidence for UI changes
6. `bun run test:rls` for any new table
7. Report changed files · migrations · tests · evidence · risks · rollback plan.

See `AGENTS.md` §6 for the full DoD text.
