# Handover & Pro-Launch Playbook — UseCasesX™

Deliverable: a documentation set your development team can execute with Claude Code to rewrite the
frontend on Next.js (Vercel), stand up a dedicated API service on Railway, keep Supabase as the
database, and ship the Pro edition.

No application code changes in this step. Everything below is written to `docs/handover/`.

## What the review found (current state)

- 115 route files under `src/routes/`, TanStack Start v1 + React 19, SSR and server functions
  targeting Cloudflare Workers.
- ~90 domain modules in `src/lib/` (repository, opportunities, studio, scoring, portfolio, roadmap,
  pilot, workshops, reports, observability, ops, authz, AI boundary).
- 16 additive Supabase migrations, RLS on tenant tables, roles in `user_roles` with `has_role()`.
- ~458 unit tests plus Playwright suites; `verify:release`, `verify:routes`, `check:nav-integrity`,
  `monitor:launch` scripts already exist.
- Release candidate `v1.0.0-rc.1` is frozen with a NO-GO verdict. Open blockers: canonical host not
  connected, browser P0 suite failing, demo accounts holding platform roles, pilot evidence missing.
- Not built yet: billing/subscriptions, own-domain transactional email, MFA/SSO hardening.

## Documents to be produced

1. `docs/handover/00-README.md` — how to use the playbook, roles, sequencing, glossary.
2. `docs/handover/01-current-state.md` — inventory: routes, domain modules, server functions,
   tables and policies, scripts, tests, known blockers, and what is safe to discard.
3. `docs/handover/02-target-architecture.md` — Next.js App Router on Vercel, Hono/NestJS API on
   Railway, Supabase Postgres + Auth + Storage; request flow, auth token flow, tenancy enforcement,
   where RLS stays authoritative, env/secret matrix per environment, CORS and cookie strategy.
4. `docs/handover/03-repo-and-tooling.md` — monorepo layout (`apps/web`, `apps/api`,
   `packages/domain`, `packages/db`, `packages/contracts`), pnpm/turbo, TypeScript strict config,
   lint/format, CI on GitHub Actions, preview environments.
5. `docs/handover/04-claude-code-guide.md` — how the team drives Claude Code: `CLAUDE.md` contract
   for the new repo, subagent/parallelization patterns, guardrails (never edit generated files,
   additive migrations, no inline plan checks), review checklist per PR.
6. `docs/handover/05-migration-phases.md` — the step-by-step rewrite, each phase with scope, exit
   criteria, verification commands, and rollback:
   - P0 Freeze & extract: lift `src/lib` domain logic into `packages/domain` with no framework
     imports; port Zod schemas into `packages/contracts`.
   - P1 API service on Railway: Hono + typed routes, Supabase JWT verification middleware,
     workspace-scope guard, audit-event emitter, OpenAPI generation, health/readiness probes.
   - P2 Next.js shell on Vercel: route map from the 115 existing routes, server components for
     public discovery, client islands for Studio, TanStack Query against the API, per-route metadata.
   - P3 Journey parity: Discover → Capture → Design → Score → Prioritize → Portfolio → Roadmap →
     Export → Advisory, ported surface by surface with parity tests.
   - P4 Admin & governance: administration console, audit, observability, pilot, production data and
     readiness pages.
   - P5 Cutover: DNS, canonical host, redirects from old URLs, sitemap, SEO parity, decommission.
7. `docs/handover/06-route-map.md` — every current route mapped to its Next.js path, rendering mode
   (static / server / client), auth requirement, entitlement gate, and owning API endpoints.
8. `docs/handover/07-pro-launch-features.md` — the four must-build workstreams, each with data model,
   API surface, UI surface, acceptance criteria, and Claude Code prompts:
   - Billing & subscriptions: Stripe products/prices, checkout, webhooks, `subscriptions` and
     `entitlement_grants` tables, entitlement resolution replacing complimentary Founding Access,
     upgrade/downgrade/cancel, invoices, dunning, proration, trials, seat counting for workspaces.
   - Transactional email: sender domain, templates (invite, reminder, approval, receipt, evidence
     gap), auth email branding, suppression/bounce handling, send audit.
   - Auth hardening + SSO: Google and Microsoft, TOTP MFA with recovery codes, session policy,
     password HIBP, SAML SSO per workspace domain, JIT provisioning and role mapping.
   - Launch blockers: custom domain + canonical host, browser P0 suite repair, demo-account role
     revocation, pilot evidence or recorded waiver, runbook owner fields.
9. `docs/handover/08-database-and-data.md` — schema inventory, migration ordering rules, the
   recorded destructive-statement exception, seed vs production data policy, RLS test method, backup
   and restore ownership, data export/deletion obligations.
10. `docs/handover/09-security-and-compliance.md` — threat model, secret placement per platform, rate
    limiting and abuse shield port, storage MIME/size/TTL rules, audit immutability, privacy and AI
    transparency commitments already shipped that must not regress.
11. `docs/handover/10-testing-and-dod.md` — test pyramid, which existing suites port directly, the
    P0 browser matrix, RLS isolation and cross-workspace abuse tests, billing webhook tests, per-PR
    Definition of Done.
12. `docs/handover/11-deployment-runbook.md` — Vercel project config, Railway service config,
    Supabase environments (dev/preview/staging/prod), migration promotion, env/secret checklist,
    smoke tests after deploy, rollback per platform, monitoring and alerting.
13. `docs/handover/12-claude-prompts.md` — a numbered, copy-paste prompt library (roughly 40 prompts)
    keyed to the phases, each with context files to open, task, constraints, and verification command.
14. `docs/handover/13-timeline-and-risks.md` — sequencing with dependencies, staffing shape, risk
    register with mitigations, and an explicit "do not rewrite these" list where porting beats
    rebuilding.

## Technical notes for the team

- Domain logic in `src/lib/**` is largely framework-agnostic and is the highest-value asset to port;
  `*.functions.ts` wrappers are TanStack-specific and get replaced by API route handlers.
- RLS must remain the authoritative tenancy boundary even after the API service lands; the API adds
  a second scope check, it does not replace policies.
- Supabase JWTs are verified in Railway middleware via JWKS; the service-role key never leaves the
  Railway service and never reaches Vercel client bundles.
- Existing scripts (`verify-release-candidate`, `check-nav-integrity`, `launch-monitor`) port with
  small edits and should be kept as CI gates.
- Entitlements stay centralized: `useEntitlement`/`usePlan`/`RequirePlan` port to the Next.js app,
  backed by billing-derived grants instead of hard-coded complimentary access.

## Out of scope here

No source files, migrations, or configuration are modified in this step. The playbook is the
deliverable; execution happens in the new repository.
