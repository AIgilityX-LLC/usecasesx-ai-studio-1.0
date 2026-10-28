# AGENTS.md — Engineering Standard for UseCasesX™

This file is the single engineering contract for all contributors — Lovable, Claude Code, Codex CLI and human developers. It complements `CLAUDE.md` (repo-specific commands & layout). If the two ever disagree, the stricter rule wins.

---

## 1. Product boundaries

**Product**: UseCasesX™ — Global AI Use Case Repository, AI Opportunity Map and AI Use Case Studio™. Part of the SovereignX AI Suite.

**Editions (one codebase, gated by entitlements)**:

- **Lite** — public discovery, unauthenticated browse of the repository.
- **Pro Founding Access** — registered professional use. Complimentary through **31 December 2026**, subject to fair-use limits.
- **Enterprise** — same codebase and data model, additional roles/features via entitlement flags. Initially sold through paid Enterprise Design Partner engagements.

**Target release**: Lite + Pro Founding Access on **14 August 2026**. Launch a _complete customer journey_, not the full Enterprise catalogue.

**Core journey** (must remain intact end-to-end):
Discover → Capture Opportunity → Design → Score → Prioritize → Portfolio → Roadmap → Export → Advisory.

**Suite handoff direction**:

- SARPI → readiness/value
- SARN & CyberX C3G → governance/risk
- AdvisorX & ConversX → controlled advisory context
- Human advisory → workshops and enterprise engagements

---

## 2. Architecture standard

Enterprise-ready **modular monolith** on TanStack Start v1 (React 19, Vite 7) with Lovable Cloud (Supabase) as the backend. Cloudflare Workers runtime for SSR/server functions. **Do not** split into microservices without a new ADR — see `docs/architecture/modular-monolith.md` and `src/lib/modules/`.

**Modular domains** (do not collapse across boundaries without justification):
Identity & Tenant · Discovery Studio · Use Case Management · Scoring · Portfolio · Value · KPI/Benefits · Workflow & Approvals · Collaboration · AI Matching · Reporting · Integrations · Audit (plus domain/policy kernel and data/AI/storage adapters). Path ownership: `src/lib/modules/catalogue.ts`.

**Non-negotiable rules**:

1. **Tenant/workspace ownership** on every row of tenant data. RLS is mandatory; policies + `GRANT`s in the same migration.
2. **One codebase for Lite/Pro/Enterprise.** No forks, no per-edition apps. Differentiate via entitlements (`useEntitlement`, `usePlan`, `RequirePlan`) and feature flags (`src/lib/feature-flags.ts`).
3. **Additive migrations only** at this stage. No destructive drops, destructive renames, or ownership reassignments without an approved staged migration + rollback plan.
4. **Centralized entitlements** — never inline plan checks; go through `useEntitlement`/`usePlan`/`RequirePlan`/`Can`.
5. **Secure server boundaries** — internal logic via `createServerFn` from `@tanstack/react-start`; external HTTP under `src/routes/api/public/*` with signature verification.
6. **Provider-neutral AI services** — prefer the Lovable AI Gateway. No provider secrets in the browser.
7. **Append-only audit events** for governance-relevant actions.
8. **No separate edition codebases.** Ever.

---

## 3. Coding standards

- **Language**: TypeScript strict. Use `tsgo` for typechecks, not `tsc --noEmit`.
- **Framework**: TanStack Start v1 only. **Do not** introduce `react-router-dom`, `BrowserRouter`, `src/pages/`, or Next/Remix conventions.
- **Routing**: file-based in `src/routes/`. Never edit `src/routeTree.gen.ts`. Root layout is `src/routes/__root.tsx`; app shell is `src/routes/_app.tsx`.
- **Data**: prefer route loaders + `useSuspenseQuery` over `useEffect` fetching.
- **Styling**: Tailwind v4 through `src/styles.css`. Use semantic tokens; never hardcode colors like `text-white`, `bg-black`, or hex classes in components.
- **UI primitives**: shadcn/Radix. Reuse before adding.
- **Server functions**: files declaring `createServerFn` must be thin wrappers. No runtime helpers, config, or mock generators at module scope.
- **Client/server split**: never import `*.server.ts` or `src/integrations/supabase/client.server` from client-imported code. Dynamic-import inside handlers only.
- **Auth**: protected server fns use `.middleware([requireSupabaseAuth])`; do not call them from public route loaders.
- **Error/empty/loading/role-based states** are required on every user-facing surface. No dead CTAs.

---

## 4. Security baseline

Full detail in `docs/security/security-baseline.md`. Highlights:

- RLS enabled on every `public` table; policies + explicit `GRANT`s in the same migration.
- Roles stored in a separate `user_roles` table with a `SECURITY DEFINER has_role()` function. Never on `profiles`.
- Secrets (`SUPABASE_SERVICE_ROLE_KEY`, AI provider keys) never appear in browser code, logs, screenshots, or public config. Read `process.env.*` only inside server handlers.
- Webhooks under `/api/public/*` verify signatures before processing.
- Never touch reserved schemas: `auth`, `storage`, `realtime`, `supabase_functions`, `vault`.
- Never edit auto-generated files: `src/integrations/supabase/{client,client.server,auth-middleware,auth-attacher,types}.ts`, `.env`, `supabase/config.toml`.

---

## 5. Migration rules

- Additive only until further notice. Every `CREATE TABLE public.<t>` is followed by `GRANT` → `ENABLE ROW LEVEL SECURITY` → `CREATE POLICY` in that order.
- Tune `GRANT`s to policies. Add `anon` grants only for genuinely public tables.
- Include `service_role` grants for any table touched by server handlers.
- No destructive column/table changes without a staged plan documented in the PR and a rollback path.
- Do not seed production data from application code. Seed via SQL migration or scripts under `scripts/seed/`.

---

## 6. Testing & Definition of Done

Before claiming completion:

1. **Typecheck** passes (`tsgo`).
2. **Build** passes (`bun run build`).
3. **Lint** passes (`bun run lint`).
4. Relevant Playwright specs pass (`bun run test:e2e`, or the narrow spec for the changed journey).
5. The affected journey is exercised end-to-end (browser evidence when UI changes).
6. RLS is verified for any new table (`bun run test:rls`).
7. Report: **changed files · migrations/policies · tests · evidence · unresolved risks · rollback/forward-fix · recommended next prompt ID**.

---

## 7. Entitlements & roles

Launch roles: **Workspace Owner, Workspace Admin, Contributor, Viewer, Facilitator**. Advanced Enterprise roles are reserved and gated behind feature flags.

Any plan check must resolve through `useEntitlement`/`usePlan`. Gate UI with `<RequirePlan>` / `<Can>`. Gate server logic by re-checking claims in the server function, never trusting the client.

---

## 8. Accessibility & UX

- Executive-grade, evidence-oriented visual language.
- WCAG 2.1 AA target: color contrast, focus rings, keyboard nav, ARIA on interactive elements.
- Responsive down to 360 px width.
- No fake production data, no placeholder metrics, no UI implying planned Enterprise capability is live.
- Every route needs its own unique `head()` (title < 60 chars, description < 160 chars, og/twitter tags).

---

## 9. Prohibited shortcuts

- Introducing another router, another CSS framework, or another backend.
- Splitting domains into networked microservices (or per-domain databases) without an accepted ADR — stay a modular monolith (`docs/architecture/modular-monolith.md`).
- Dropping tables, weakening RLS, or bypassing entitlements for convenience.
- Storing roles on `profiles`.
- Hardcoding colors, secrets, or provider URLs in components.
- Adding routes that link to nothing, or nav entries with no target.
- Editing auto-generated files listed in §4.
- Claiming a task is done without running the checks in §6.

---

## 10. Related documents

- `CLAUDE.md` — repo layout, commands, high-risk files
- `docs/product/release-2026-08-14.md` — launch scope
- `docs/architecture/architecture-principles.md`
- `docs/architecture/domain-boundaries.md` — domain/repository layer
- `docs/architecture/ai-boundary.md` — provider-neutral AI services & fair use
- `docs/architecture/auditability-and-instrumentation.md` — audit events, product/activation events, privacy redaction

- `docs/security/security-baseline.md`
- `docs/PRE_BETA_RELEASE_CHECKLIST.md`, `docs/PRE_BETA_TEST_PLAN.md`
