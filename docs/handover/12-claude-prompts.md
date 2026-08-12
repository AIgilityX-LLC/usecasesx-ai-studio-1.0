# 12 — Claude Code Prompt Library

Copy-paste prompts, in execution order. Rules for all of them:

- Run one prompt per branch. Do not batch across phases.
- Every prompt assumes `CLAUDE.md` from `04-claude-code-guide.md` is at the repo root.
- Always end with: *"Report changed files, migrations, tests run with output, unresolved risks, and the
  rollback plan. Do not claim done until lint, typecheck, test and build all pass."*
- Where a prompt says READ, make Claude actually read those files before writing.

---

## P0 — Scaffold and extract

**P0.1 — Monorepo scaffold**
> Create a pnpm + Turborepo monorepo with `apps/web` (Next.js 15 App Router, TypeScript strict,
> Tailwind v4, shadcn), `apps/api` (Hono, Node 22), and `packages/{domain,contracts,db,api-client,ui,config}`.
> Set up shared tsconfig with project references, ESLint 9 flat config with `eslint-plugin-boundaries`
> enforcing: `packages/domain` imports nothing from `apps/*`, `next`, `react`, `hono`, `@supabase/*`;
> `apps/web` never imports `apps/api`; only `apps/api` may import the service-role client. Add Prettier,
> Vitest, and a GitHub Actions `ci.yml` with install/lint/typecheck/unit/build jobs. No app code yet —
> both apps render a hello world.

**P0.2 — Database package**
> READ the legacy `supabase/migrations/` directory. Create `packages/db`: copy every migration file
> verbatim into `packages/db/migrations` preserving names and order, add `db:types` to generate
> Supabase types into `packages/db/src/types.ts`, and write `scripts/check-migrations.mjs` that fails
> when (a) files are out of timestamp order, (b) a `CREATE TABLE public.*` is not followed in the same
> file by GRANT, ENABLE ROW LEVEL SECURITY and at least one CREATE POLICY, or (c) a destructive
> statement (DROP/DELETE FROM/TRUNCATE/destructive ALTER) appears without a matching entry in
> `docs/release/migration-manifest-2026-08-14.md`. Wire it into CI. Do not modify any migration SQL.

**P0.3 — Contracts package**
> READ every Zod schema in the legacy `src/lib/**`. Move them into `packages/contracts/src`, grouped by
> domain (use-case, submission, opportunity, scoring, portfolio, roadmap, workshop, canvas, pilot,
> export, billing). Export both the schema and the inferred type for each. Keep validation messages
> identical — they are user-facing. Add unit tests covering one accept case and every reject branch per
> schema, including boundary values.

**P0.4 — Domain extraction (run once per module group, not all at once)**
> READ legacy `src/lib/<module>/**` and its tests in `tests/unit/<module>*.test.ts`. Port the module to
> `packages/domain/src/<module>` with zero framework imports: no React, no Next, no Hono, no Supabase.
> Any data access becomes an injected interface parameter, not an import. Port the tests first, watch
> them fail, then port the implementation until green. Do not change behaviour or rename exported
> functions. Module groups, in order: `authz` (editions, roles, flags, catalogue, permission-service),
> `scoring`, `pagination`, `portfolio`, `roadmap`, `opportunity-map`, `report` (model, narrative, CSV
> contract), `deliverables`, `workshops` + `canvas`, `pilot`, `fair-use`, `report-language`.

**P0.5 — Test parity audit**
> Compare the legacy `tests/unit/**` inventory against the ported tests in `packages/**`. Produce
> `docs/handover/test-parity.md` listing every legacy test file, its new location, and status
> (ported / intentionally dropped with reason / missing). Then port everything marked missing. The
> ported test count must be greater than or equal to the legacy count, with zero skipped tests.

---

## P1 — API service

**P1.1 — API bootstrap and middleware chain**
> In `apps/api`, build a Hono app mounted at `/v1` with `@hono/zod-openapi`. Middleware in this order:
> correlation-id (accept `x-correlation-id`, else generate), structured JSON request logging (never log
> tokens, secrets, or full email addresses), CORS from an `ALLOWED_ORIGINS` allow-list with an OPTIONS
> handler, bearer JWT verification against Supabase JWKS using the issuer from OIDC discovery (cached,
> rotation-safe), membership+role loading onto context as `{ userId, claims, workspaceIds, roles }`, a
> `requireWorkspace(param)` scope guard that 403s and emits an audit event on mismatch, and a
> configurable rate limiter. Expose `/healthz` and `/readyz` (checks DB + JWKS). Provide two Supabase
> client factories: user-scoped (default) and service-role (privileged, must not be importable from
> `apps/web`). Include tests for each middleware, including a tampered token and a cross-workspace id.

**P1.2 — Public endpoints**
> READ `packages/contracts` and the legacy public API routes. Implement `/v1/public/*`: catalogue search
> with keyword relevance ranking, facets (tags, domains, industries, countries, gov functions),
> use-case detail by slug, collections, taxonomy, sectors, segments, and a sitemap feed. These are
> unauthenticated: use the publishable-key client, project only safe columns, never return PII, cap page
> size, and rely on `TO anon` policies for published+public rows only. Add integration tests proving an
> unpublished or private row is never returned.

**P1.3 — Authenticated workspace endpoints (one prompt per resource)**
> READ `packages/contracts/src/<resource>.ts`, `packages/domain/src/<resource>/**`, and the legacy
> `src/lib/<resource>*.functions.ts`. Implement `/v1/workspaces/:workspaceId/<resource>` CRUD plus the
> listed domain actions, using the user-scoped client so RLS applies, `requireWorkspace`, Zod validation
> from contracts, keyset pagination from `packages/domain/src/pagination`, and an audit event for every
> governance-relevant mutation. Add integration tests including a cross-workspace denial case and a
> pagination boundary case. Resources, in order: opportunities, studio use cases, scorecards,
> portfolios, roadmap, boards, saved items, collections, workshops, canvas, deliverables, reports,
> exports, handoffs.

**P1.4 — Admin endpoints and the privileged publish path**
> Implement `/v1/admin/*` for submissions review and publish, audit reads, observability, requests
> triage with SLA, pilot management, production-data audit, and release-candidate checks. Every handler
> must verify the caller's role with the **user-scoped** client via `has_role()` before touching the
> service-role client — never use the admin client to decide whether the caller is an admin. Publishing
> calls the existing `public.publish_use_case_submission` SECURITY DEFINER function. Emit an audit event
> with the correlation id for every action. Add tests proving a Contributor and a Viewer get 403 on every
> admin route.

**P1.5 — Abuse shield**
> READ the legacy AI boundary, fair-use, and storage-policy modules and their tests. Port into
> `apps/api`: per-user and per-workspace AI fair-use limits with burst windows (Pro 60/user/day, burst
> 8/min; Lite 5/user/day, burst 3/min), prompt-injection filtering with output schema validation,
> per-task timeouts of 30–60 s with at most one retry on transient failure only, storage MIME/extension
> /size enforcement, signed URLs with short TTLs, and access re-verification of the parent record before
> minting any URL. Every limit hit and denial emits an audit event. Add tests for each limit and denial path.

**P1.6 — Webhooks and cron**
> Implement `/v1/hooks/stripe`, `/v1/hooks/email`, and `/v1/jobs/*`. Verify HMAC signatures over the
> **raw** body with a timing-safe compare and a replay window before parsing or writing anything. Cron
> endpoints require a `CRON_HOOK_SECRET` header compared timing-safely. All handlers are idempotent,
> keyed on the provider event id. Add tests for a valid call, a tampered signature, a replayed event,
> and a missing secret.

**P1.7 — OpenAPI and typed client**
> Generate `openapi.json` from the Zod-OpenAPI routes, commit it, and generate a typed fetch client into
> `packages/api-client`. Add `scripts/check-contract-drift.mjs` that regenerates both and fails CI if the
> committed output differs. The client must accept an access-token provider function rather than reading
> any storage itself.

---

## P2 — Web shell

**P2.1 — App Router skeleton and design system**
> READ legacy `src/styles.css`, the Tailwind config, and `src/components/ui/**`. Create the App Router
> structure with route groups `(marketing)`, `(auth)`, `(public)`, `(app)`, `(admin)`, each with
> `layout.tsx`, `loading.tsx`, `error.tsx`, and `not-found.tsx`. Port the design tokens into a Tailwind
> v4 preset with semantic tokens only, port the shadcn primitives, and wire Sora/Manrope typography plus
> the brand assets. No hardcoded color utilities anywhere — add a lint rule that bans `text-white`,
> `bg-black`, and `bg-[#`.

**P2.2 — Supabase SSR auth**
> Implement cookie-based Supabase auth with `@supabase/ssr`: sign in, sign up, forgot password, reset
> password, callback, session refresh in middleware, and sign-out that cancels in-flight queries, clears
> the query cache, signs out, then history-replaces to `/auth`. The `(app)` and `(admin)` layouts check
> the session server-side and redirect unauthenticated users, preserving the intended path as a
> validated same-origin relative path only. Google OAuth `redirect_uri` must be a public same-origin
> callback URL, never a protected route. The header affordance must reflect session state — a signed-in
> user sees an account menu, not "Sign in".

**P2.3 — Data layer and entitlements**
> Wire TanStack Query with a server-side prefetch + hydration pattern and the `packages/api-client`
> typed client, attaching the access token from the server session. Implement `useSession`,
> `useWorkspace`, `useEntitlement`, `usePlan`, and the `RequirePlan` / `Can` components, all fed by
> `/v1/me` and resolved through `resolveEntitlements` in `packages/domain`. Add a lint rule banning
> inline `plan ===`, `edition ===`, and `role === 'admin'` comparisons outside
> `packages/domain/src/authz`.

**P2.4 — App shell**
> READ the legacy `SiteShell` and sidebar. Build the `(app)` shell: sidebar navigation with entitlement
> gating, workspace switcher, breadcrumbs, command palette, the "Request features / report bugs" form,
> the consent banner, and toasts. Every nav entry must resolve to a real route — add
> `scripts/check-nav-integrity.mjs` and wire it into CI. Responsive to 360 px, keyboard navigable,
> visible focus rings.

**P2.5 — Metadata, sitemap, OG images**
> Add `metadata` or `generateMetadata` to every page with a unique title under 60 characters and a
> description under 160, plus `openGraph` and `twitter` tags built from `NEXT_PUBLIC_SITE_URL`. `(app)`
> and `(admin)` pages set `robots: { index: false }`. Implement `app/sitemap.ts`, `app/robots.ts`, and an
> `app/og/use-case/[slug]/route.tsx` OG image using `ImageResponse`. Add
> `scripts/check-metadata.mjs` enforcing uniqueness, the length limits, and the noindex rule, and wire it
> into CI.

---

## P3 — Journey parity (one prompt per surface)

**P3.x — Surface port template**
> READ the legacy route file(s) `src/routes/<legacy>`, the matching row in
> `docs/handover/06-route-map.md`, the relevant `packages/domain` module, and the `packages/contracts`
> schemas. Build the Next.js route at the mapped path with the mapped render strategy and auth level.
> Requirements: server-render or prefetch the initial data (no `useEffect` fetching), loading + empty +
> error + unauthorised states, entitlement gates mirrored by the API, unique metadata, keyset pagination
> with a "showing N of M" indicator and a truncation notice where the legacy page had one, and full
> keyboard/contrast accessibility at 360 px. Add a Playwright spec covering the happy path and one
> failure path. Behaviour must match the legacy surface exactly — if you find a legacy behaviour that
> looks wrong, report it instead of silently changing it.

Run this template for, in order: discover/repository search, public use-case detail, opportunities,
submit + admin review + publish + my-use-cases, studio (wizard, value, scorecard, feasibility, data
readiness, blueprint, deliverables, SARPI, AdvisorX, C3G), scoring/compare/quick-wins, opportunity map,
portfolio, roadmap, reports and exports, workshops + Sovereign Public Value Canvas™, advisory and
handoffs, account and profile.

**P3.y — ISR invalidation**
> Add `app/api/revalidate/route.ts` that validates a `REVALIDATE_SECRET` header, then revalidates the
> paths for a published or unpublished use case (detail page, repository, discover, its taxonomy and
> collection pages, sitemap). Call it from the API's publish and unpublish handlers. Add a test proving
> approval makes the public page appear without a redeploy.

---

## P4 — Admin and Pro features

**P4.1 — Administration console**
> Port the admin surfaces to `(admin)`: submissions, audit (with correlation-id search), observability
> (AI usage, rate-limit events, RLS/storage/export denials, threshold alerts), analytics, feedback,
> requests triage with assignment and SLA tracking, pilot management with CSV import and per-row error
> reporting, production-data audit, production readiness, and release candidate status. Gate the group
> server-side with a role check and re-check the role in every API handler. All destructive admin actions
> are confirmed and audited.

**P4.2 — Billing schema**
> READ `docs/handover/07-pro-launch-features.md` section A. Write one additive migration creating
> `billing_plans`, `workspace_subscriptions`, and append-only `billing_events`, each with GRANT →
> ENABLE ROW LEVEL SECURITY → CREATE POLICY in the same migration, exactly as specified. Revoke UPDATE
> and DELETE from `authenticated` on `billing_events`. Seed the Lite, Pro, and Enterprise plan rows with
> INSERT statements in the migration. Add RLS isolation tests: a member of workspace A cannot read
> workspace B's subscription, and no authenticated role can write `workspace_subscriptions`.

**P4.3 — Billing API and Stripe webhooks**
> Implement `/v1/public/plans`, `/v1/workspaces/:id/subscription`, `/v1/workspaces/:id/billing/checkout`,
> `/v1/workspaces/:id/billing/portal`, `/v1/workspaces/:id/billing/seats`, and `/v1/hooks/stripe`.
> Owner/admin only on mutations. The webhook verifies the signature over the raw body, inserts into
> `billing_events` first for idempotency on `stripe_event_id`, then applies state. Handle
> `checkout.session.completed`, `customer.subscription.{created,updated,deleted,paused,resumed}`, and
> `invoice.{paid,payment_failed}`. Extend `resolveEntitlements` in `packages/domain` so complimentary
> Founding Access resolves to Pro entitlements while `complimentary_until > now()`, `past_due` keeps read
> access and blocks creation for 14 days, and downgrade makes data read-only and never deletes it. Add a
> unit test matrix over plan × status × complimentary × role.

**P4.4 — Billing UI**
> Build `(app)/billing` showing the current plan, seat usage, renewal date, invoices, and payment method,
> with actions for upgrade, seat change, portal, and cancel. Rebuild `(marketing)/pricing` from
> `/v1/public/plans` instead of hardcoded copy, and state the Founding Access complimentary end date of
> 31 December 2026. Add a checkout return page that refreshes entitlements before rendering. Cover
> loading, empty, error, and past-due states.

**P4.5 — Transactional email**
> READ `docs/handover/07-pro-launch-features.md` section B. In `apps/api`, add a React Email template
> set and a send helper for the listed templates. One recipient per send, triggered by that recipient's
> action or a specific event for them — no bulk or marketing sends. Record every send in an append-only
> `email_deliveries` table with a hashed recipient, correlation id, template, status, and provider id.
> Derive an idempotency key from the event id plus template name. Handle bounce and complaint webhooks
> into a suppression table and skip suppressed recipients without retrying. Replace the pilot
> link-only flow with real invitation emails. Add an admin email log page.

**P4.6 — Auth hardening**
> Enable HIBP leaked-password protection and a 12-character minimum, keep anonymous sign-ups disabled
> and email confirmation on, add auth-endpoint rate limits with temporary lockout after repeated
> failures, and require a recent login before email change, MFA disable, workspace deletion, or billing
> changes. Add open-redirect protection validating every post-auth `redirect` as a same-origin relative
> path. Add tests for each control.

**P4.7 — MFA (TOTP)**
> Build `/mfa`: enrolment with QR and secret, verification before activation, and ten single-use recovery
> codes hashed at rest. Let workspace owners require MFA for admin roles, enforced in the API on every
> admin route, not just in the UI. Emit audit events for enable, disable, and recovery-code use. Add
> Playwright coverage for enrol, verify, and recovery.

**P4.8 — SAML SSO**
> Add per-organisation IdP configuration (metadata URL or certificate, verified email domains, default
> role on first login, optional JIT provisioning), domain-based discovery at `/sso`, and attribute-to-role
> mapping that is explicit and audited. SCIM deprovisioning is out of scope — record it in the deferred
> register. Verify one real IdP round trip on staging and attach the evidence.

**P4.9 — Launch blockers**
> READ `docs/handover/07-pro-launch-features.md` section D. Work items 1, 2, and 5 only: stabilise the
> Playwright runner in CI (pinned version, containerised browsers, single worker for auth-dependent
> specs, explicit readiness checks, no sleep-based waits), provision deterministic seeded QA accounts per
> environment, then triage all 36 failures into infrastructure / selector drift / real defect. Fix every
> P0-journey failure. Quarantine anything else only with a ticket, named owner, and date; zero quarantined
> P0 specs. Report the exact before/after pass and fail counts.

---

## P5 — Cutover

**P5.1 — Redirect map**
> Produce a complete legacy-URL → new-URL map from `docs/handover/06-route-map.md` and implement it as
> 308 redirects in `next.config.ts`. Every legacy public URL must resolve without a 404, and every
> redirect must land on a page with a matching canonical tag. Add a Playwright spec asserting each
> redirect's status and destination.

**P5.2 — Launch verification harness**
> Write `scripts/verify-launch.mjs` that takes a base URL and asserts, failing with a clear message on
> each: `/readyz` returns 200; the home, discover, and a public use-case page return 200 with unique
> titles, canonical tags matching the canonical host, and reachable `og:image`; `robots.txt` and
> `sitemap.xml` are valid and reference only the canonical host; authenticated routes return `noindex`;
> security headers (CSP, HSTS, nosniff, referrer-policy) are present; and the anonymous access sweep
> returns zero rows for all private tables. Print a pass/fail table and exit non-zero on any failure.

**P5.3 — Go-live**
> Execute `docs/handover/11-deployment-runbook.md` "Release process" steps 1–7 against production, then
> run `scripts/verify-launch.mjs` against `https://usecasesx.aigilityx.com` and paste the full output.
> Do not declare launch complete until every assertion passes, a real sign-up and password-reset email
> have landed in a live inbox with DKIM pass, and the seven runbook owners are recorded by name.
