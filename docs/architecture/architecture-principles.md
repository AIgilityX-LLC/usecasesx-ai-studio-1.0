# Architecture Principles — UseCasesX™

Companion to `AGENTS.md` §2. These principles apply to every module and PR.

---

## 1. Modular monolith, one codebase

- Single deployable app hosts Lite, Pro and Enterprise capability.
- No forks per edition. No parallel apps. Differentiation happens through **entitlements** and **feature flags**, never through code duplication.
- Modules have clear seams (see domain list below) but ship together.

## 2. Domain modules

Identity/access · Organization & workspaces · Repository · Opportunities · Studio · Scoring · Portfolios · Opportunity Map · Roadmap · Value · Workshops · Reporting · AI services · Integrations · Administration · Audit · Observability.

Cross-module calls go through explicit interfaces (typed server fns, shared hooks, or query keys) — never by reaching into another module's internals.

## 3. Tenant & workspace ownership

- Every row of tenant data carries workspace/org identifiers.
- RLS enforces isolation. Application code never assumes RLS; it re-checks scope in server-fn handlers.
- Workspace provisioning is centralized (`ensureUserWorkspaceFn`).

## 4. Additive evolution

- Migrations are additive at this stage. Destructive changes require a staged migration + rollback documented in the PR.
- New columns are nullable or have defaults. Backfills happen in a separate step.
- Never rename a live column; add a new one, dual-write, then retire.

## 5. Server boundaries

- **App-internal logic** → `createServerFn` from `@tanstack/react-start`.
- **External HTTP** (webhooks, cron, public reads) → TanStack server routes under `src/routes/api/public/*`. Verify signatures inside the handler.
- **No Supabase Edge Functions** for app-internal logic.
- Files that declare `createServerFn` are thin wrappers only — no runtime helpers, mocks, or config at module scope.

## 6. Data access

- Browser: generated `supabase` client. RLS applies.
- Authenticated server fn: `.middleware([requireSupabaseAuth])`; use `context.supabase`. RLS applies as the user.
- Admin (`supabaseAdmin`) is bypass-RLS and privileged; dynamic-import inside handlers only, after verifying the caller. Never for ordinary reads.

## 7. Entitlements & feature flags

- All plan gating routes through `useEntitlement`/`usePlan`/`RequirePlan`/`Can`.
- Server logic re-verifies plan/role from claims — never trusts the client.
- Flags in `src/lib/feature-flags.ts`; keep them boolean and named after capability, not audience.

## 8. AI services

- Provider-neutral. Prefer the Lovable AI Gateway.
- No provider secret in the browser bundle, in logs, or in public config.
- Prompts, model IDs and defaults live in server-side modules.
- Every AI call is auditable (input hash, model, cost class, workspace).
- Transport resolves through the **AIProvider port** (`src/lib/ports/`) so vendors can be swapped without UI rewrites — see `docs/architecture/ports-and-adapters.md`.

## 9. Auditability

- Governance-relevant actions emit append-only audit events.
- Audit rows carry workspace, actor, subject, action, at, and evidence pointer.
- No mutation of audit history; corrections are new events.

## 10. Frontend architecture

- File-based routing under `src/routes/`. Root shell in `__root.tsx`; signed-in shell in `_app.tsx`.
- Data reads: route loader + `ensureQueryData` + `useSuspenseQuery`. Avoid ad-hoc `useEffect` fetches.
- Tailwind v4 semantic tokens only. shadcn/Radix for primitives. No hardcoded colors.
- Every route has a unique branded `head()`.

## 11. Observability

- Structured logs in server handlers (no secrets).
- Client analytics through `module-analytics` / `usecasex.tracking`; opt-out respected.
- P95 route load target < 2 s on the core journey.

## 12. Future SovereignX integration

- Design assumes future integration points for SARPI, SARN, CyberX C3G, AdvisorX, ConversX.
- Contracts favor typed server fns + JSON payloads over shared tables across products.
- Keep tenant boundaries hard even between suite products.

---

## Forbidden

- Router other than TanStack Router.
- Additional CSS framework or backend.
- Vendor SDK imports from UI/domain code (use `src/lib/ports/` adapters).
- Storing roles anywhere but `user_roles`.
- Per-edition codebase forks.
- Client-side admin decisions.
- Editing generated files listed in `CLAUDE.md`.
