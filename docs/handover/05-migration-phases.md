# 05 — Migration Phases

Six phases. Each has scope, exit criteria, verification, and rollback. Do not start a phase before
the previous one's exit criteria are green — the whole point is that the core journey never breaks.

The legacy app stays live and unchanged throughout. Cutover is P5.

---

## P0 — Freeze, scaffold, extract domain logic

**Scope**
- Tag the legacy repo (`legacy/v1.0.0-rc.1`) and freeze feature work on it. Bug fixes only.
- Create the monorepo per `03-repo-and-tooling.md`; wire pnpm, Turbo, TS project references, ESLint
  boundaries, Prettier, Vitest, CI skeleton.
- Create `packages/db`: copy the 16 existing migrations verbatim into `packages/db/migrations`,
  generate Supabase types, add the migration linter.
- Create `packages/contracts`: lift every Zod schema from `src/lib/**` (submissions, opportunities,
  scoring, portfolio, roadmap, workshops, pilot, canvas, exports) and export inferred types.
- Create `packages/domain`: lift the pure logic — `domain/**`, scoring, roadmap, portfolio model and
  filters, opportunity map, deliverables compose/export, report model/narrative/CSV contract,
  pagination, authz (editions, roles, flags, catalogue, permission-service), fair use, i18n report
  language. Strip every framework import.
- Port `tests/unit/**` (≈458 tests) onto the new import paths.

**Exit criteria**
- `pnpm lint && pnpm typecheck && pnpm test && pnpm build` green from a clean clone.
- Ported unit test count ≥ legacy count; zero skipped tests.
- `packages/domain` has no dependency on `next`, `react`, `hono`, `@supabase/*` (boundary rule proves it).
- Hello-world deploys succeed on both Vercel and Railway from `main`.

**Verification**: `pnpm test -- --coverage` (domain ≥ 80% lines), `pnpm lint`, CI green.
**Rollback**: nothing shipped; discard the branch.

---

## P1 — API service on Railway

**Scope**
- Hono app with `/v1`, `@hono/zod-openapi`, generated `openapi.json` + `packages/api-client`.
- Middleware chain: correlation-id → structured logging → JWKS bearer verification → membership and
  role loading → workspace scope guard → rate limit → audit emitter.
- Two Supabase clients: user-scoped (RLS applies) as the default, service-role behind an explicit
  role check for privileged operations only.
- Endpoint groups, in this order:
  1. `/v1/public/*` — catalogue search, facets, use-case detail, collections, taxonomy, sitemap feed.
  2. `/v1/me` — profile, workspaces, memberships, entitlements.
  3. `/v1/workspaces/:id/**` — opportunities, studio use cases, scorecards, portfolios, roadmap,
     boards, saved items, workshops, deliverables, reports, exports.
  4. `/v1/admin/**` — submissions review/publish, audit, observability, pilot, production data,
     release candidate, requests triage. All role-gated via `has_role()`.
  5. `/v1/hooks/*` — Stripe, email events, cron. Signature-verified before processing.
- Jobs: cron endpoints for pilot reminders, evidence-gap watchdog, launch checks, alert thresholds,
  secured by `CRON_HOOK_SECRET` and a Railway cron schedule.
- Port the abuse shield: per-user and per-workspace AI fair-use limits, burst limits, prompt-injection
  filtering, storage MIME/size/TTL enforcement, signed-URL access re-verification.

**Exit criteria**
- Every legacy `*.functions.ts` has a mapped endpoint or a recorded decision to drop it.
- OpenAPI committed, client generated, contract-drift check green.
- Cross-workspace abuse suite passes against a real preview database.
- `/healthz` and `/readyz` wired to Railway probes; p95 endpoint latency < 400 ms on seeded data.

**Verification**: `pnpm test --filter api`, `pnpm test:rls`, `pnpm test:contracts`, load smoke on the
20 hottest endpoints.
**Rollback**: API is not yet consumed by anything user-facing; redeploy the previous Railway image.

---

## P2 — Next.js shell on Vercel

**Scope**
- App Router skeleton: `(marketing)`, `(auth)`, `(public)`, `(app)`, `(admin)` route groups per
  `06-route-map.md`.
- Supabase SSR auth: sign-in/up, forgot/reset password, callback, session refresh, sign-out hygiene
  (cancel queries → clear cache → sign out → replace-navigate).
- App shell: SiteShell equivalent — sidebar, workspace switcher, command palette, breadcrumbs,
  feedback form, consent banner, toasts.
- Design system: port `src/styles.css` tokens, Tailwind v4 preset, shadcn primitives, Sora/Manrope
  typography, brand assets.
- Entitlements on the client: `useEntitlement`, `usePlan`, `RequirePlan`, `Can`, fed by `/v1/me`.
- Data layer: TanStack Query provider, server prefetch + hydration, typed client, error boundaries,
  `not-found` and `error` segments at every group root.
- Metadata: per-route `metadata`/`generateMetadata`, canonical URLs, sitemap, `robots.txt`, OG image
  route via `ImageResponse`.

**Exit criteria**
- Sign-in → shell → sign-out works on a Vercel preview against the Railway preview API.
- Every route group has loading, error, empty, and unauthorised states.
- Lighthouse ≥ 90 performance / 100 SEO on the public home and a public use-case page.
- `check:metadata` and nav-integrity checks green.

**Verification**: Playwright smoke (auth, shell, nav), Lighthouse CI, metadata script.
**Rollback**: legacy app still serves the canonical host; the new app is preview-only.

---

## P3 — Core journey parity

Port surface by surface, in journey order, each as its own PR with a parity test:

1. **Discover / Repository** — search with keyword relevance ranking, facets (tags, domains,
   industries, countries, gov functions), saved filter presets, pagination with "showing N of M".
2. **Public use-case detail** — SEO metadata, OG image, structured data, related items.
3. **Capture Opportunity** — `/opportunities/new`, list, detail, submission validation with per-field
   errors, draft recovery.
4. **Submit → review → publish** — user submission, admin queue, approval via the privileged publish
   path, correlation-ID logging end to end, `My Use Cases` with draft/reviewed/published statuses.
5. **Studio** — wizard, value, scorecard, feasibility, data readiness, blueprint, deliverables,
   deliverable detail, SARPI, AdvisorX, C3G governance tabs.
6. **Score & Prioritize** — scorecards, compare, quick wins, Opportunity Map with export.
7. **Portfolio** — PortfolioX, portfolio items, filters, shares, pagination, exports.
8. **Roadmap** — sequencing, dependencies, exports.
9. **Workshops** — workshops, participants, invitations, votes, outcomes, and the Sovereign Public
   Value Canvas™ (7 sections, document attachments, version history, multi-language export).
10. **Reports & Exports** — generated reports, CSV contract, PDF/print layout, export receipts,
    language selection (en/fr/es/de).
11. **Advisory & handoffs** — AdvisorX, suite handoff requests, governance, SARPI.

**Exit criteria per surface**: parity test passes, ported unit tests green, no legacy-only behaviour
left undocumented, accessibility pass (keyboard, focus ring, contrast, 360 px width).
**Exit criteria for the phase**: the full core journey completes end to end on preview with a real
account, and the P0 Playwright suite is green.

---

## P4 — Admin, governance, and Pro features

- Administration console: submissions, audit, observability, analytics, feedback, requests triage
  with SLA, pilot, production data, production readiness, release candidate, launch checks.
- Then the four Pro workstreams from `07-pro-launch-features.md`: **billing**, **email**,
  **auth hardening + SSO**, **launch blockers**.

**Exit criteria**: an admin can review and publish a submission, read the audit trail with correlation
IDs, see AI usage and rate-limit events, run launch checks, and manage a paid subscription lifecycle
from checkout through cancellation.

---

## P5 — Cutover

1. Freeze the legacy app. Snapshot the database and confirm the restore path.
2. Apply any pending migrations to production; verify RLS with `pnpm test:rls` against production
   (read-only assertions) and the cross-workspace suite against staging.
3. Deploy API to Railway production; point `api.usecasesx.aigilityx.com` at it; verify `/readyz`.
4. Deploy web to Vercel production; connect `usecasesx.aigilityx.com` and `www`, set the apex as
   primary so every other host redirects to it.
5. Redirect map: every legacy URL → new URL with `308`. Publish `sitemap.xml`; resubmit in Search
   Console; verify canonical tags and `og:image` on 10 sampled public pages.
6. Run the live verification sequence: `pnpm monitor:launch` against the canonical host, the P0
   Playwright suite signed-in, a real sign-up + password-reset + invitation email to a live inbox,
   and a live Stripe test-mode checkout.
7. Keep the legacy deployment warm for 14 days as the rollback target.

**Rollback**: repoint DNS to the legacy deployment; migrations are additive so the old app keeps
working against the same database. This is why destructive changes are banned until 30 days post-launch.
