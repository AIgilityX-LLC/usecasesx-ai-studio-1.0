# 06 — Route Map: 115 TanStack routes → Next.js App Router

Legend — **Render**: `static` (SSG/ISR) · `server` (RSC dynamic) · `client` (server shell + client
island). **Auth**: `public` · `session` (signed in) · `admin` (platform/workspace admin role).
**Index**: whether search engines should index it.

Naming: legacy `_app.foo.bar.tsx` → `/foo/bar`. Legacy `$id` → `[id]`. Route groups in parentheses
add no URL segment.

## Root, auth, and system routes

| Legacy | Next.js | Render | Auth | Index |
|---|---|---|---|---|
| `index.tsx` | `(marketing)/page.tsx` → `/` | static | public | ✅ |
| `auth.tsx` | `(auth)/auth/page.tsx` | client | public | ❌ |
| `forgot-password.tsx` | `(auth)/forgot-password/page.tsx` | client | public | ❌ |
| `reset-password.tsx` | `(auth)/reset-password/page.tsx` | client | public | ❌ |
| `demo-login.tsx` | `(auth)/demo-login/page.tsx` | client | public | ❌ |
| `__root.tsx` | `app/layout.tsx` | — | — | — |
| `_app.tsx` | `(app)/layout.tsx` (shell + session gate) | — | session | ❌ |
| `sitemap[.]xml.ts` | `app/sitemap.ts` | static | public | — |
| `og.use-case.$slug.ts` | `app/og/use-case/[slug]/route.tsx` (`ImageResponse`) | server | public | — |
| `c.$token.tsx` | `(public)/c/[token]/page.tsx` (shared collection) | server | public | ❌ |
| `p.$token.tsx` | `(public)/p/[token]/page.tsx` (shared portfolio/report) | server | public | ❌ |
| `_app.invite.$token.tsx` | `(public)/invite/[token]/page.tsx` | client | public | ❌ |
| `_app.workshops.join.$token.tsx` | `(public)/workshops/join/[token]/page.tsx` | client | public | ❌ |
| `api/public/usecasex/*` | `apps/api` `/v1/public/*` | — | public | — |

> The three token routes must stay **public** and SSR-capable — they are the sharing mechanism. Never
> place them behind the session layout.

## Marketing, legal, and content (static / ISR, indexable)

`about`, `how-it-works`, `getting-started`, `pricing`, `editions`, `enterprise`, `pro`,
`founding-access-terms`, `faq`, `resources`, `insights`, `patterns`, `api-integration`, `contact`,
`support`, `terms`, `privacy`, `acceptable-use`, `ai-notice`, `entitlement`, `demo-scenarios`.

→ `(marketing)/<slug>/page.tsx`, `export const metadata` per page, `revalidate = 3600`.

## Public discovery (indexable, server-rendered)

| Legacy | Next.js | Render | Notes |
|---|---|---|---|
| `_app.discover.tsx` | `(public)/discover/page.tsx` | server | search + facets via `searchParams` |
| `_app.repository.tsx` | `(public)/repository/page.tsx` | server | canonical catalogue listing |
| `_app.use-cases.$slug.tsx` | `(public)/use-cases/[slug]/page.tsx` | static+ISR | `generateStaticParams`, OG image, JSON-LD |
| `_app.collections.index.tsx` | `(public)/collections/page.tsx` | static+ISR | |
| `_app.collections.$slug.tsx` | `(public)/collections/[slug]/page.tsx` | static+ISR | |
| `_app.categories.index.tsx` | `(public)/categories/page.tsx` | static | |
| `_app.categories.$type.$slug.tsx` | `(public)/categories/[type]/[slug]/page.tsx` | static+ISR | taxonomy landing |
| `_app.sectors.$sector.tsx` | `(public)/sectors/[sector]/page.tsx` | static+ISR | |
| `_app.segments.$segment.tsx` | `(public)/segments/[segment]/page.tsx` | static+ISR | |
| `_app.compare.tsx` | `(public)/compare/page.tsx` | client | comparison analytics events |
| `_app.roi-calculator.tsx` | `(public)/roi-calculator/page.tsx` | client | lead capture |

ISR revalidation is triggered by the API on publish/unpublish (`revalidatePath` via a signed
Next.js Route Handler), so approving a submission makes the public page appear without a redeploy.

## Signed-in journey — `(app)` group, `session`, all `noindex`

| Legacy | Next.js | Render |
|---|---|---|
| `_app.dashboard.tsx` | `(app)/dashboard/page.tsx` | client |
| `_app.onboarding.tsx` | `(app)/onboarding/page.tsx` | client |
| `_app.submit.tsx` | `(app)/submit/page.tsx` | client |
| `_app.my-use-cases.tsx` | `(app)/my-use-cases/page.tsx` | client |
| `_app.opportunities.index.tsx` / `.new` / `.$id` | `(app)/opportunities/{page,new/page,[id]/page}.tsx` | client |
| `_app.ai-use-case-studio.tsx` | `(app)/studio/page.tsx` | client |
| `_app.studio.tsx` | `(app)/studio/layout.tsx` | — |
| `_app.studio.portfolio.tsx` | `(app)/studio/portfolio/page.tsx` | client |
| `_app.studio.use-case.$id.index.tsx` | `(app)/studio/use-case/[id]/page.tsx` | client |
| `…$id.wizard` / `.value` / `.scorecard` / `.feasibility` / `.data-readiness` / `.blueprint` / `.sarpi` / `.advisorx` / `.c3g-governance` | `(app)/studio/use-case/[id]/<tab>/page.tsx` | client |
| `…$id.deliverables` / `.deliverable.$type` | `(app)/studio/use-case/[id]/deliverables/{page,[type]/page}.tsx` | client |
| `_app.feasibility` / `.data-readiness` / `.blueprint` / `.decision` / `.impact-assessment` | `(app)/<slug>/page.tsx` | client |
| `_app.opportunity-map.tsx` | `(app)/opportunity-map/page.tsx` | client |
| `_app.quick-wins.tsx` | `(app)/quick-wins/page.tsx` | client |
| `_app.portfoliox.tsx` | `(app)/portfolio/page.tsx` | client |
| `_app.roadmap.tsx` | `(app)/roadmap/page.tsx` | client |
| `_app.reports.tsx` | `(app)/reports/page.tsx` | client |
| `_app.boards.index` / `.$boardId` / `.collections` | `(app)/boards/{page,[boardId]/page,collections/page}.tsx` | client |
| `_app.workshops.index` / `.$id` | `(app)/workshops/{page,[id]/page}.tsx` | client |
| `_app.advisorx` / `_app.advisory` | `(app)/advisorx/page.tsx`, `(app)/advisory/page.tsx` | client |
| `_app.governance` / `_app.sarpi` / `_app.cyberx.c3g.intake` | `(app)/governance/page.tsx`, `(app)/sarpi/page.tsx`, `(app)/cyberx/c3g/intake/page.tsx` | client |
| `_app.handoffs.tsx` | `(app)/handoffs/page.tsx` | client |
| `_app.module-analytics.tsx` | `(app)/module-analytics/page.tsx` | client |
| `_app.pilot.tsx` | `(app)/pilot/page.tsx` | client |
| `_app.data-rights.tsx` | `(app)/data-rights/page.tsx` | client |
| `_app.profile.tsx` | `(app)/profile/page.tsx` | client |
| `_app.account.*` (index, organization, team, security, data) | `(app)/account/{page,organization,team,security,data}/page.tsx` | client |

## Admin — `(admin)` group, `admin` role, `noindex`

| Legacy | Next.js |
|---|---|
| `_app.admin-submissions.tsx` | `(admin)/admin/submissions/page.tsx` |
| `_app.admin-audit.tsx` | `(admin)/admin/audit/page.tsx` |
| `_app.admin-observability.tsx` | `(admin)/admin/observability/page.tsx` |
| `_app.admin-waitlist.tsx` | `(admin)/admin/waitlist/page.tsx` |
| `_app.administration.tsx` | `(admin)/administration/layout.tsx` |
| `_app.administration.analytics` / `.feedback` / `.requests` / `.pilot` / `.launch-checks` / `.launch-learning` / `.production-data` / `.production-readiness` / `.release-candidate` | `(admin)/administration/<slug>/page.tsx` |

Gate the whole group in `(admin)/layout.tsx`: server-side `has_role()` check against the API, and
re-check the role in every `/v1/admin/*` handler. The layout gate is UX, not security.

## New routes to add for Pro

| Route | Purpose |
|---|---|
| `(app)/billing/page.tsx` | current plan, seats, invoices, payment method |
| `(app)/billing/checkout/return/page.tsx` | post-checkout confirmation + entitlement refresh |
| `(marketing)/pricing/page.tsx` (rebuild) | live plans from the API, not hardcoded |
| `(auth)/mfa/page.tsx` | TOTP enrolment + recovery codes |
| `(auth)/sso/page.tsx` | email-domain → SSO discovery, IdP redirect |
| `(admin)/administration/billing/page.tsx` | subscription and entitlement overrides |
| `(admin)/administration/email/page.tsx` | delivery log, bounces, suppression |
| `app/api/revalidate/route.ts` | signed ISR invalidation from the API |
| `app/robots.ts` | replaces `public/robots.txt` |

## Checklist per migrated route

- [ ] `metadata` or `generateMetadata` with a unique title (<60) and description (<160), plus
      `openGraph` and `twitter`; `robots: { index: false }` for `(app)` and `(admin)`.
- [ ] `loading.tsx`, `error.tsx`, and empty state present.
- [ ] Auth requirement matches this table exactly — no public route inside `(app)`.
- [ ] Entitlement gate via `RequirePlan`/`Can`, mirrored by an API check.
- [ ] Every nav link resolves (`pnpm check:nav-integrity`).
- [ ] Responsive at 360 px; keyboard reachable; focus visible.
