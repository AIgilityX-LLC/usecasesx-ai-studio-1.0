# Navigation current-state audit — UseCasesX™ AI Studio

**Date:** 2026-10-07  
**Scope:** Read-only architecture and navigation inventory. **No routes or components were changed** while producing this document.  
**Primary sources:** `src/components/AppSidebar.tsx`, `src/components/SiteShell.tsx`, `src/lib/nav-integrity.ts`, `src/routeTree.gen.ts`, `src/lib/feature-flags.ts`, `src/lib/usecasex.roles.ts`, `src/hooks/usePlan.ts`, `AGENTS.md` / `CLAUDE.md`.

---

## 1. Technology stack

| Layer | Choice (as configured) |
|-------|------------------------|
| Framework | TanStack Start v1 (`@tanstack/react-start` ^1.168) + React 19 |
| Router | TanStack Router file-based routes (`src/routes/`, generated `src/routeTree.gen.ts`) |
| Build | Vite 7 via `@lovable.dev/vite-tanstack-config` |
| Styling | Tailwind CSS v4 + semantic tokens (`src/styles.css`); shadcn/Radix UI |
| Data / forms | TanStack Query, Zod, `@hookform/resolvers` |
| Backend | Lovable Cloud (Supabase Postgres + Auth + RLS); server logic via `createServerFn` |
| Runtime target | Cloudflare Workers (`nodejs_compat`) for SSR/server functions |
| Package manager | Bun |
| Analytics | Client events via `src/lib/usecasex.tracking.ts` / module analytics (gated by lifecycle flag) |

---

## 2. Front-end application structure

```
src/
  routes/           # File-based routes; __root.tsx + _app.tsx shell
  components/       # UI + SiteShell, AppSidebar, MobileNav, gates
  hooks/            # usePlan, useSupabaseSession, useWorkspaceContext, useRoles
  lib/              # Domain, authz, feature-flags, nav-integrity, tracking
  integrations/supabase/  # Generated clients + auth middleware (do not edit)
  styles.css
```

Signed-in chrome: `SiteShell` → `SidebarProvider` + `AppSidebar` + header + footer.  
Signed-out chrome: same `SiteShell` without sidebar; top nav + `MobileNav` sheet.

---

## 3. Routing architecture

- **Convention:** TanStack Start file routes under `src/routes/`.
- **Layout:** `/_app` (`src/routes/_app.tsx`) wraps almost all product pages in `SiteShell`.
- **Generated tree:** `src/routeTree.gen.ts` — **never hand-edit**; verify with `bun run verify:routes`.
- **Auth pages outside `_app`:** `/auth`, `/demo-login`, `/forgot-password`, `/reset-password`, `/sso` (and similar).
- **Public APIs:** `src/routes/api/public/*`.
- **Integrity:** `src/lib/nav-integrity.ts` + `scripts/check-nav-integrity.mjs` (`bun run check:nav-integrity`).

`EXPECTED_REDIRECTS` in `nav-integrity.ts` still lists `/dashboard` → `/profile` and `/reports` → `/profile`. Live route files for `/dashboard` and `/reports` exist as real page components today — treat that map as **possible stale documentation of redirects**, not proof those URLs 302 today.

---

## 4. Current sidebar / navigation components

| Surface | Component | Audience |
|---------|-----------|----------|
| App shell | `src/components/SiteShell.tsx` | All `_app` pages |
| Signed-in sidebar | `src/components/AppSidebar.tsx` | Authenticated users |
| Sidebar primitives | `src/components/ui/sidebar.tsx` | Collapsible icon mode |
| Signed-out mobile | `src/components/MobileNav.tsx` | Guests, `<lg` |
| Signed-out desktop top nav | Inline in `SiteShell` (`TOP_NAV`) | Guests, `lg+` |
| Account menu | `src/components/AuthNavActions.tsx` | Header actions |
| Breadcrumbs | `src/components/AppBreadcrumb.tsx` | Signed-in header |
| Footer links | `src/components/UseCasesXFooter.tsx` | Marketing + product deep links |
| Founding CTA | `FoundingAccessRequestModal` (header, not a nav route) | Waitlist capture |

**Admin section grouping (current):** Overview · Inbox · Growth · Insights and audit · Platform · Launch and release (collapsible, per-user `localStorage`).

---

## 5. Navigation configuration files

| File | Role |
|------|------|
| `src/components/AppSidebar.tsx` | **Authoritative** signed-in menu (CORE, STUDIO_PRO, INTEGRATIONS, ADMIN_GROUPS, ACCOUNT) |
| `src/components/SiteShell.tsx` | `TOP_NAV` for guests |
| `src/lib/nav-integrity.ts` | `PRIMARY_NAV_TARGETS`, `SIDEBAR_NAV_TARGETS`, `TRANSPARENCY_NAV_TARGETS`, `EXPECTED_REDIRECTS` |
| `scripts/check-nav-integrity.mjs` | CI check against `routeTree.gen.ts` |
| `src/components/UseCasesXFooter.tsx` | Footer link lists (parallel surface) |
| `src/lib/feature-flags.ts` | Flags that hide some sidebar entries |

**Drift note:** `SIDEBAR_NAV_TARGETS` is **not** a complete mirror of `AppSidebar` (e.g. missing `/administration/founding-access`, `/workshops`, `/opportunity-map`, `/demo-scenarios`, `/administration/pilot-milestones`, `/administration/production-data`). `PRIMARY_NAV_TARGETS` also differs from live `TOP_NAV` in `SiteShell`.

---

## 6. Existing routes (high level)

Hundreds of paths exist under `_app` and public roots. Clusters relevant to navigation:

| Cluster | Example paths |
|---------|----------------|
| Discovery / repository | `/repository`, `/use-cases/$slug`, `/discover`, `/patterns`, `/collections/*`, `/categories/*`, `/compare`, `/insights`, `/quick-wins`, `/roi-calculator` |
| Studio / portfolio | `/studio`, `/studio/use-case/$id/*`, `/my-use-cases`, `/boards`, `/boards/$boardId`, `/roadmap`, `/portfoliox` |
| Opportunities / workshops | `/opportunities`, `/opportunities/$id`, `/opportunity-map`, `/workshops`, `/workshops/$id`, `/workshops/join/$token` |
| Suite shells | `/sarpi`, `/advisorx`, `/cyberx/c3g/intake`, `/handoffs`, `/governance`, `/feasibility`, `/data-readiness`, `/blueprint` |
| Account / plan | `/account`, `/account/security`, `/account/data`, `/account/team`, `/entitlement`, `/profile`, `/pro`, `/onboarding` |
| Pilot | `/pilot`, `/pilot/apply`, `/pilot/portal` |
| Admin / ops | `/administration/*`, `/admin-*`, `/reviews`, `/reports`, `/module-analytics` |
| Marketing | `/`, `/how-it-works`, `/editions`, `/pricing`, `/enterprise`, `/advisory`, `/contact`, `/launch`, … |
| Auth | `/auth`, `/demo-login`, `/sso`, password reset |
| Share tokens | `/c/$token`, `/p/$token`, `/invite/$token` |

Full generated list: `src/routeTree.gen.ts` (`fullPath` entries).

---

## 7. Authentication implementation

- **Provider:** Supabase Auth (`@supabase/supabase-js`).
- **Client:** `src/integrations/supabase/client.ts` (generated — do not edit).
- **Session hook:** `src/hooks/useSupabaseSession.ts`.
- **Primary UI:** `/auth` — `signInWithPassword` / optional signup (`SIGNUPS_ENABLED` currently `false` in `src/routes/auth.tsx`); supports `redirect` + `intent` search params.
- **Also:** `/pro` sign-in, `/demo-login` personas, magic link / OTP patterns elsewhere, `/sso`.
- **Server functions:** `requireSupabaseAuth` middleware; bearer attached via `attachSupabaseAuth` in `src/start.ts`.
- **Shell behaviour:** No session → guest top nav; session present → sidebar.

---

## 8. Authorization / RBAC implementation

| Mechanism | Location | Behaviour |
|-----------|----------|-----------|
| Platform roles table | `user_roles` + `has_role()` (DB) | RLS + server checks |
| Client role hook | `src/lib/usecasex.roles.ts` (`useRoles`) | Reads `user_roles` |
| Plan hook admin | `usePlan().isAdmin` | Any of `ADMIN_TIER_ROLES` |
| UI role gate | `RequireRoles` | Route wrappers |
| UI plan gate | `RequirePlan` | Tier upgrade / sign-in prompts |
| Capability flags | `src/lib/authz/flags.ts` + `CLIENT_CAPABILITY_FLAGS` | Enterprise capabilities |
| Workspace membership | `useWorkspaceContext` / `getWorkspaceContextFn` | Org + workspace + role |

**Sidebar admin visibility:** `item.admin` → shown only if `usePlan().isAdmin` (ADMIN_TIER_ROLES).  
**Sidebar Pro badge:** `item.pro && !isPro` shows a “Pro” chip but **still navigates** (soft gate). Hard gates are per-route `RequirePlan` / RLS where present.

---

## 9. Workspace / tenant architecture

- Tenant data owned by **organization + workspace** with RLS.
- Context: `useWorkspaceContext` → `getWorkspaceContextFn` (`src/lib/workspace.functions.ts`).
- Feature flag `PUBLIC_LAUNCH_FEATURES.tenancyV2` (default OFF) for workspace switcher / member management UI.
- Demo sample copies and boards are workspace-scoped (`demo_sample_copies`, `use_case_boards`, etc.).

---

## 10. Supabase integration

Present throughout:

- Auth, profiles, `user_roles`, repository `use_cases`, studio/boards, opportunities, admin queues, analytics tables.
- Server handlers use authenticated client or service role inside `*.server.ts` / server fns.
- High-risk generated files listed in `CLAUDE.md` § high-risk — do not edit.

---

## 11. Current user roles

From `src/lib/usecasex.roles.ts` `AppRole`:

`admin` · `moderator` · `contributor` · `viewer` · `super_admin` · `ai_hub_admin` · `usecasex_admin` · `content_manager` · `reviewer` · `editor` · `user`

**Admin-tier (sidebar `admin: true` + many admin pages):**  
`admin`, `moderator`, `super_admin`, `ai_hub_admin`, `usecasex_admin`, `content_manager`, `reviewer` (`ADMIN_TIER_ROLES` / `PLATFORM_ADMIN_ROLES`).

**Notable stricter page:** `/administration/platform-admins` requires `super_admin` only.

Workspace launch roles (product): Owner, Admin, Contributor, Viewer, Facilitator — enforced via entitlement/workspace APIs, not the sidebar `admin` flag.

---

## 12. Feature flags

`src/lib/feature-flags.ts`:

| Flag | Env | Sidebar effect |
|------|-----|----------------|
| `PUBLIC_LAUNCH_FEATURES.studio` | `VITE_PUBLIC_STUDIO_ENABLED` | Hides AI Use Case Studio when `"false"` |
| `myUseCases` | `VITE_PUBLIC_MY_USE_CASES_ENABLED` | Hides My Use Cases |
| `boards` | `VITE_PUBLIC_BOARDS_ENABLED` | Hides Use Case Boards |
| `lifecycleAnalytics` | `VITE_PUBLIC_LIFECYCLE_ANALYTICS_ENABLED` | Hides Module Analytics; gates event persist |
| `tenancyV2` | `VITE_TENANCY_V2_ENABLED` | Tenancy UI (default off) |
| `ENTERPRISE_VALUE_FEATURES.*` | various | Enterprise value capabilities |
| `CLIENT_CAPABILITY_FLAGS` | `VITE_CAPABILITY_*` | Opportunity map, workshops, SSO, etc. |

Integrations group in sidebar is **hard-disabled in UI** (`pointer-events-none`), independent of flags.

---

## 13. Plan / subscription gating logic

- Plans: `lite` | `pro` | `enterprise` (`usePlan`; profiles.`plan_type`).
- Pro set: `pro`, `enterprise`, `sovereign`.
- `RequirePlan min="pro"|"enterprise"` on many Studio/suite pages; **admins bypass** plan checks in UI.
- Sidebar `pro: true` = badge only unless the destination also uses `RequirePlan`.
- Founding Access is **request + admin approve** (modal / `/administration/founding-access`), not self-serve claim.

---

## 14. Admin-only functionality (product admin)

Typical surfaces (RequireRoles / PLATFORM_ADMIN_ROLES unless noted):

- Admin Panel, Requests Inbox, Founding Access, Lead Pipeline, Free Pro Waitlist  
- Pilot Programme / Pilot Milestones  
- AI Engines, Email Delivery  
- Readiness family, Launch Checks, Release Candidate, Production Readiness / Data Audit  
- Submission Review, Submission Audit  
- Platform Admins (**super_admin only**)

---

## 15. AIgilityX internal operational functionality

| Area | Routes / tools |
|------|----------------|
| Launch ops | `/administration/readiness`, `launch-readiness`, `launch-checks`, `release-candidate`, `production-*`, `launch-learning` |
| Growth ops | leads, waitlist, founding-access, pilot admin |
| Platform ops | AI engines, email delivery, platform-admins |
| Observability | `/admin-observability` (export & AI activity; workspace-admin oriented) |
| Demo / QA | `/demo-scenarios`, `/demo-login`, seed scripts, `test:rls`, launch readiness CI |

---

## 16. Customer-facing functionality

| Area | Examples |
|------|----------|
| Public discovery | Repository, patterns, collections, insights, marketing pages |
| Pro workspace | Opportunities, map, workshops, studio, boards, roadmap, reports |
| Account | Settings, security, entitlement, support, pilot mission (participant) |
| Suite handoffs | SARPI / AdvisorX / C3G shells (sidebar currently disabled for Integrations) |

---

## 17–18. Route dependencies & deep-link breakage risks

**High-breakage deep links** (bookmarks, emails, CTAs, footer, OG, invites):

- `/use-cases/$slug`, `/studio/use-case/$id/*`, `/boards/$boardId`  
- `/opportunities/$id`, `/workshops/$id`, `/workshops/join/$token`  
- `/invite/$token`, `/c/$token`, `/p/$token`  
- `/auth?redirect=…&intent=…`  
- Footer aliases that redirect or alias Studio: `/feasibility`, `/data-readiness`, `/blueprint`, `/portfoliox` (see `EXPECTED_REDIRECTS`)  
- Marketing: `/repository`, `/pricing`, `/editions`, `/pro`, `/enterprise`

**Dependencies when renaming/moving nav only:** keep `to` paths stable; update `AppSidebar`, `SiteShell` TOP_NAV, `nav-integrity.ts`, footer, Auth CTAs, email templates, and Playwright specs that assert labels/order.

---

## 19. Mobile navigation

| Mode | Behaviour |
|------|-----------|
| Guest | `MobileNav` sheet (`lg:hidden`) with `TOP_NAV` + Sign in |
| Signed-in | `SidebarTrigger` + shadcn sidebar off-canvas / icon collapse; no separate signed-in `MobileNav` |

---

## 20. Analytics / event tracking tied to navigation

| Signal | Source |
|--------|--------|
| Founding / waitlist CTA | `trackCTAEvent("waitlist_join_clicked", …)` from `SiteShell`; `data-analytics-id="waitlist-cta-nav"` |
| Generic CTA / product events | `src/lib/usecasex.tracking.ts` → Supabase when `lifecycleAnalytics` enabled |
| Module analytics | `trackModuleEvent` / `/module-analytics` |
| Nav integrity | Dev console + CI; not user analytics |
| No dedicated “sidebar_link_clicked” tracker | Menu clicks are ordinary `<Link>` navigations |

---

## Inventory table — current sidebar menu

**Role restriction** = sidebar visibility gate (`admin` / none). Page may still use `RequireRoles` / `RequirePlan`.  
**Plan restriction** = sidebar `pro` badge (soft) and/or known `RequirePlan` on destination.  
**Component** = primary route module under `src/routes/`.

| Current Menu | Current Route | Component | Role Restriction (sidebar) | Plan Restriction | Customer / Internal | Dependencies | Recommended Future Location |
|--------------|---------------|-----------|----------------------------|------------------|---------------------|--------------|------------------------------|
| Dashboard | `/dashboard` | `_app.dashboard.tsx` | — | — (Pro portfolio UI when signed in) | Customer | Session, profile | Customer → Home / Workspace |
| Global Repository | `/repository` | `_app.repository.tsx` | — | — | Customer | Public use_cases, facets | Customer → Discover |
| Discovery Wizard | `/discover` | `_app.discover.tsx` | — | — | Customer | Discover flow | Customer → Discover |
| Opportunities | `/opportunities` | `_app.opportunities.index.tsx` | — | Soft Pro badge; no route RequirePlan | Customer | Workspace opportunities | Customer → Capture |
| Opportunity Map | `/opportunity-map` | `_app.opportunity-map.tsx` | — | Soft Pro; capability flags | Customer | Map server fn | Customer → Capture / Prioritize |
| Workshops | `/workshops` | `_app.workshops.index.tsx` | — | Soft Pro | Customer | Workshop boards | Customer → Capture |
| Quick Wins Matrix | `/quick-wins` | `_app.quick-wins.tsx` | — | — | Customer | Matrix UI | Customer → Prioritize |
| ROI & Mission Value | `/roi-calculator` | `_app.roi-calculator.tsx` | — | — | Customer | Calculator | Customer → Value |
| Deployment Intelligence | `/insights` | `_app.insights.tsx` | — | — | Customer | Insights | Customer → Discover / Insights |
| AI Use Case Studio | `/studio` | `_app.studio.tsx` | — | Flag `studio`; many child RequirePlan | Customer | Studio modules | Customer → Design |
| My Use Cases | `/my-use-cases` | `_app.my-use-cases.tsx` | — | Flag `myUseCases` | Customer | Saved cases | Customer → Design |
| Use Case Boards | `/boards` | `_app.boards.tsx` | — | Flag `boards` | Customer | Boards | Customer → Design / Portfolio |
| Submit a Use Case | `/submit` | `_app.submit.tsx` | — | — | Customer | Submissions | Customer → Contribute |
| Pattern Library | `/patterns` | `_app.patterns.tsx` | — | — | Customer | Patterns | Customer → Discover |
| Demo Scenarios | `/demo-scenarios` | `_app.demo-scenarios.tsx` | — | — | Customer + demo ops | Demo copy fn | Customer → Learn / Demo |
| Portfolio Roadmap | `/roadmap` | `_app.roadmap.tsx` | — | Soft Pro + RequirePlan on page | Customer | RoadmapX | Customer → Roadmap |
| SARPI Readiness | `/sarpi` | `_app.sarpi.tsx` | — | Soft Pro; **Integrations UI disabled** | Customer (suite) | Suite shell | Customer → Integrations (when enabled) |
| AdvisorX Guidance | `/advisorx` | `_app.advisorx.tsx` | — | Soft Pro; **Integrations disabled** | Customer (suite) | Suite shell | Customer → Integrations |
| C3G Governance | `/cyberx/c3g/intake` | `_app.cyberx.c3g.intake.tsx` | — | Soft Pro; **Integrations disabled** | Customer (suite) | Suite shell | Customer → Integrations |
| Suite Handoffs | `/handoffs` | `_app.handoffs.tsx` | — | Soft Pro + RequirePlan; **Integrations disabled** | Customer | Handoff requests | Customer → Integrations |
| Admin Panel | `/administration` | `_app.administration.tsx` | admin-tier | — | Internal | PLATFORM_ADMIN_ROLES | Internal → Overview |
| Requests Inbox | `/administration/requests` | `_app.administration.requests.tsx` | admin-tier | — | Internal | Feedback triage | Internal → Inbox |
| Founding Access | `/administration/founding-access` | `_app.administration.founding-access.tsx` | admin-tier | — | Internal | founding_access_requests | Internal → Inbox |
| Review Inbox | `/reviews` | `_app.reviews.tsx` | — | Soft Pro | Customer (workspace gates) | Gate reviews | Customer → Governance inbox |
| Submission Review | `/admin-submissions` | `_app.admin-submissions.tsx` | admin-tier | — | Internal | Catalogue submissions | Internal → Inbox |
| Lead Pipeline | `/administration/leads` | `_app.administration.leads.tsx` | admin-tier | — | Internal | Leads | Internal → Growth |
| Free Pro Waitlist | `/admin-waitlist` | `_app.admin-waitlist.tsx` | admin-tier | — | Internal | Waitlist | Internal → Growth |
| Pilot Programme | `/administration/pilot` | `_app.administration.pilot.tsx` | admin-tier | — | Internal | Pilot admin | Internal → Growth |
| Pilot Milestones | `/administration/pilot-milestones` | `_app.administration.pilot-milestones.tsx` | admin-tier | — | Internal | Milestones | Internal → Growth |
| Reports | `/reports` | `_app.reports.tsx` | — | — (auth for real data) | Customer | Portfolio reports, exports | Customer → Reporting |
| Export & AI Activity | `/admin-observability` | `_app.admin-observability.tsx` | **none in sidebar** | — | Mixed (workspace admin tooling) | Observability fns | Internal / Workspace Admin → Insights |
| Submission Audit | `/admin-audit` | `_app.admin-audit.tsx` | admin-tier | — | Internal | Audit trail | Internal → Insights |
| AI Engines | `/administration/ai-engines` | `_app.administration.ai-engines.tsx` | admin-tier | — | Internal | Engine config | Internal → Platform |
| Email Delivery | `/administration/email-delivery` | `_app.administration.email-delivery.tsx` | admin-tier | — | Internal | Delivery logs | Internal → Platform |
| Platform Admins | `/administration/platform-admins` | `_app.administration.platform-admins.tsx` | admin-tier (page: **super_admin**) | — | Internal | Platform admin CRUD | Internal → Platform |
| Readiness | `/administration/readiness` | `_app.administration.readiness.index.tsx` | admin-tier | — | Internal | Launch gates | Internal → Launch |
| Production Readiness | `/administration/production-readiness` | `_app.administration.production-readiness.tsx` | admin-tier | — | Internal | Prod probes | Internal → Launch |
| Production Data Audit | `/administration/production-data` | `_app.administration.production-data.tsx` | admin-tier | — | Internal | Data audit | Internal → Launch |
| Launch Checks | `/administration/launch-checks` | `_app.administration.launch-checks.tsx` | admin-tier | — | Internal | QA checks | Internal → Launch |
| Release Candidate | `/administration/release-candidate` | `_app.administration.release-candidate.tsx` | admin-tier | — | Internal | RC record | Internal → Launch |
| Readiness to Launch | `/administration/launch-readiness` | `_app.administration.launch-readiness.tsx` | admin-tier | — | Internal | Checklist | Internal → Launch |
| Pilot Mission | `/pilot` | `_app.pilot.tsx` | — | — | Customer (pilot participant) | Pilot portal data | Customer → Pilot |
| Request Features / Report Bugs | `/support` | `_app.support.tsx` | — | — | Customer | Support requests | Customer → Account / Help |
| Account Settings | `/account` | `_app.account.index.tsx` | — | — | Customer | Profile | Customer → Account |
| Security | `/account/security` | `_app.account.security.tsx` | — | — | Customer | Security settings | Customer → Account |
| My Plan | `/entitlement` | `_app.entitlement.tsx` | — | — | Customer | Entitlements | Customer → Account |
| Module Analytics | `/module-analytics` | `_app.module-analytics.tsx` | — | Flag `lifecycleAnalytics` | Customer / ops | Module events | Customer → Insights (or Internal) |

**Guest top nav (not sidebar):** Home `/`, Explore `/repository`, How it works, Editions, Workshops `/advisory`, Enterprise, Contact — configured in `SiteShell` `TOP_NAV`.

---

## A. Risks

1. **Nav-integrity drift** — `SIDEBAR_NAV_TARGETS` / `PRIMARY_NAV_TARGETS` out of sync with live menus; CI may miss broken new links or fail to catch removals.
2. **Soft vs hard Pro gates** — sidebar shows Pro badge but allows click; some destinations lack `RequirePlan` (e.g. opportunities index).
3. **Admin-tier over-broad for sidebar** — Platform / Launch items visible to any ADMIN_TIER role; only some pages tighten to `super_admin`.
4. **Export & AI Activity** appears without sidebar `admin` flag — any signed-in user sees the link (page may still authorize server-side).
5. **Integrations disabled in UI** while routes and footer links still exist — confusing dual surfaces.
6. **Deep links / footer aliases** (`/feasibility`, `/portfoliox`, etc.) break if Studio paths move without redirects.
7. **Auth redirect / intent** contracts depend on stable pathnames.
8. **Duplicate naming** — Review Inbox vs Submission Review; three “Readiness*” admin pages — operator confusion (paths must stay).
9. **Collapsible Launch group** — icon mode flattens items; expanded mode hides children until opened (UX / discoverability).

---

## B. Technical debt

1. Multiple parallel nav sources: AppSidebar, SiteShell TOP_NAV, footer, nav-integrity lists.
2. Comment in `nav-integrity` claims sync with AppSidebar; evidence shows incomplete sync.
3. `EXPECTED_REDIRECTS` may be stale relative to live dashboard/reports pages.
4. Unused / disabled Integrations still occupy schema and tests.
5. Organic growth: marketing, customer journey, and AIgilityX ops mixed in one sidebar.
6. Feature-flag and plan checks split across sidebar, route wrappers, and RLS — hard to reason about “who can see what”.

---

## C. Refactoring recommendations (navigation only — do not execute yet)

1. **Single nav registry** — one typed config → AppSidebar + nav-integrity + optional mobile map.
2. **Split IA** — Customer journey vs Internal ops (current ADMIN_GROUPS is a start); hide Internal unless admin-tier.
3. **Align soft/hard gates** — either navigate+RequirePlan everywhere or hide Pro links when `!isPro`.
4. **Decide Integrations** — enable, remove from sidebar, or show “Coming soon” without dead routes in primary nav.
5. **Preserve pathnames** — refactor labels/groups only; add redirects if URLs must change.
6. **Refresh** `SIDEBAR_NAV_TARGETS` and `PRIMARY_NAV_TARGETS` before any IA change; extend Playwright navbar/mobile specs.
7. **Clarify** Review Inbox (workspace gates) vs Submission Review (catalogue) in copy only if product agrees — paths unchanged.

---

## D. Files likely to require modification (for a future nav redesign)

- `src/components/AppSidebar.tsx`
- `src/components/SiteShell.tsx`
- `src/components/MobileNav.tsx`
- `src/components/UseCasesXFooter.tsx`
- `src/components/AuthNavActions.tsx` (if account/CTA placement changes)
- `src/lib/nav-integrity.ts`
- `scripts/check-nav-integrity.mjs` (only if contract changes)
- `tests/navbar.spec.ts`, `tests/mobile-responsive.spec.ts`, related e2e
- Possibly `src/components/AppBreadcrumb.tsx` if section labels affect crumbs
- Docs that list menus (`docs/process/source-control-workflow.md` only if process references change)

---

## E. Files that should NOT be modified (for nav IA work)

| File / area | Reason |
|-------------|--------|
| `src/routeTree.gen.ts` | Generated |
| `src/integrations/supabase/**` | Generated / security-sensitive |
| `.env`, `supabase/config.toml` | Secrets / generated |
| Route modules’ **business logic** (`_app.*.tsx` handlers) | Keep behaviour; only wrap/move with redirects if required later |
| RLS migrations / `has_role` | Authz source of truth |
| Server fns that implement features | Not navigation |
| Email templates’ deep links | Unless deliberately versioning URLs with redirects |
| `AGENTS.md` product journey rules | Change only with product decision |

---

*End of audit (2026-10-07). No application routes or components were altered to produce this document; only this markdown file was added.*

---

# Addendum — Server-side enforcement & role semantics (2026-10-08)

**Mode:** Read-only. **No code, routes, or config changed** in this pass; this section only appends evidence to this document.  
**Runtime exercise:** Local app + lite/`user` test account was **not** run → all “lite `user` behaviour” cells are **from code**, labelled **not exercised** unless noted as pure static render (e.g. `RequireRoles` access-denied card).

**Legend — Server-side gate column**

| Token | Meaning |
|-------|---------|
| `requireSupabaseAuth` | Middleware only (session required) |
| `has_role` | Explicit `rpc("has_role", …)` in handler |
| `is_admin_tier` | Explicit `rpc("is_admin_tier", …)` or `requirePlatformAdmin` |
| `assertAnalyticsReader` | `has_role` loop over `super_admin`/`admin`/`ai_hub_admin`/`usecasex_admin` only (`cta-analytics-access.server.ts`) — **narrower** than UI `PLATFORM_ADMIN_ROLES` |
| `observabilityAccess` | Workspace `owner`/`admin` **or** platform admin (`authz.server` `isPlatformAdmin`) |
| `workspace membership` | `resolveSubject` / `workspace_can_manage` / `workspaceRole` / RLS `user_in_workspace` |
| `RLS only` | Client Supabase reads/writes; no createServerFn role assert (policies still apply) |
| **UI-only** | Client `RequireRoles` / `RequirePlan` present, but **no** matching server role/plan assert on the handlers the page calls |

---

## F. Extended sidebar inventory — server gate · lite `user` · backing status

Assumptions for **lite `user`**: signed-in; `profiles.plan_type` / entitlement = lite; sole `user_roles.role` = `user` (not in `ADMIN_TIER_ROLES`); typical auto-provisioned workspace membership as viewer/contributor **if** present — membership itself **not exercised**.

### Priority routes (audited first)

| Route | Server-side gate | Lite `user` (code) | Backing | `usecasex.mock.ts`? |
|-------|------------------|--------------------|---------|---------------------|
| `/admin-observability` | `listExportAuditFn` / `aiUsageAnalyticsFn` / `securityAlertsFn`: `requireSupabaseAuth` + **`observabilityAccess`** (workspace owner/admin **or** platform admin). RLS on reportable export/AI/security views. **No** UI `RequireRoles`. | Page chrome renders; tabs call server fns → `authorized: false` → **“Workspace admins only”** card (`NotAuthorized`). **not exercised** | **real** | **no** |
| `/module-analytics` | **No** createServerFn. Client `supabase.from("module_events_reportable")`. Underlying `module_events` RLS: `Users read own module events` (`auth.uid() = user_id OR is_admin_tier`). View is `security_invoker`. | Sign-in prompt if signed out; if signed in → own events only (aggregate of own rows). **not exercised** | **real** | **no** |
| `/entitlement` | **None** (client `useEntitlement` / profiles). | Renders plan cards for lite (tier label, locked modules). **not exercised** | **real** | **no** |
| `/reviews` | `listReviewInboxFn` / `decideGateReviewFn` (via `ReviewInbox`): `requireSupabaseAuth`; decide path uses `resolveSubject` + workspace role; SoD via `assertNotSelfReview` in gate model. RLS on gate tables. **No** UI `RequireRoles`/`RequirePlan`. | Inbox UI; empty if no workspace; otherwise workspace-scoped inbox. **not exercised** | **real** | **no** |
| `/reports` | Mostly client store + Supabase `profiles` / portfolios; export gated by **`canExportReport(workspaceRole)`** (client matrix). Optional `exportBaseline` elsewhere is admin-only. **No** route `RequireRoles`/`RequirePlan`. | Redirect to `/pro` if signed out; if incomplete profile → `/profile`; else report UI from **saved** store + workspace portfolios; exports denied without workspace role. **not exercised** | **real** (local store + live DB; not mock catalogue) | **no** |
| `/opportunities` | `listOpportunitiesFn`: `requireSupabaseAuth` + workspace-scoped server logic; RLS on `opportunities`. No `RequirePlan` on page. | Sign-in empty state if signed out; if signed in → list (may be empty). Soft Pro badge only in sidebar. **not exercised** | **real** | **no** |
| `/opportunity-map` | `getOpportunityMapFn`: `requireSupabaseAuth` only (+ RLS). No `RequirePlan` on page. | Sign-in empty state if signed out; else map from workspace opportunities. **not exercised** | **real** | **no** |
| `/workshops` | `listWorkshopsFn` / `createWorkshopFn`: `requireSupabaseAuth` (+ RLS). No `RequirePlan` on page. | Sign-in empty state if signed out; else workshop list / create. **not exercised** | **real** | **no** |

### `/administration/*` and `/admin-*` (sidebar)

| Route | Server-side gate | Lite `user` (code) | Backing | Mock? |
|-------|------------------|--------------------|---------|-------|
| `/administration` | UI **`RequireRoles(PLATFORM_ADMIN_ROLES)`**. Data mostly **`admin.repository`** (client) → **RLS `is_admin_tier` / has_role policies** on catalogue & taxonomy. `exportBaseline`: `requireSupabaseAuth` + **`is_admin_tier`**. | **Access denied** card (`RequireRoles`). **not exercised** | **real** | **no** |
| `/administration/requests` | UI `RequireRoles`. `getFeedbackQueue` / triage fns: `requireSupabaseAuth` + **`assertAnalyticsReader`** (`has_role` narrow set). RLS on feedback tables. | Access denied. **not exercised** | **real** | **no** |
| `/administration/founding-access` | UI `RequireRoles`. list/approve/reject: `requireSupabaseAuth` + **`requirePlatformAdmin` → `is_admin_tier`**. RLS: `is_admin_tier` on `founding_access_requests` (ops SQL). | Access denied. **not exercised** | **real** | **no** |
| `/admin-submissions` | UI `RequireRoles` (review roles). `reviewSubmission`: `requireSupabaseAuth` + **`has_role` (REVIEW_ROLES)** + **`assertNotSelfReview`**. RLS on submissions. | Access denied. **not exercised** | **real** | **no** |
| `/administration/leads` | UI `RequireRoles`. Pipeline fns: `requireSupabaseAuth` + **`assertAnalyticsReader`**. | Access denied. **not exercised** | **real** | **no** |
| `/admin-waitlist` | UI `RequireRoles`. **`admin.repository` client only** → **RLS**; **no** createServerFn role assert. Closest to **UI + RLS** (not a thin UI-only hole if RLS holds). | Access denied. **not exercised** | **real** | **no** |
| `/administration/pilot` | UI `RequireRoles`. Pilot admin fns: `requireSupabaseAuth` + **`is_admin_tier`** (e.g. invite paths). RLS on `pilot_*`. | Access denied. **not exercised** | **real** | **no** |
| `/administration/pilot-milestones` | UI `RequireRoles`. `listPilotMilestoneApprovalsFn` / `decidePilotMilestoneFn`: `requireSupabaseAuth` + admin-tier checks in pilot module. | Access denied. **not exercised** | **real** | **no** |
| `/admin-audit` | UI `RequireRoles`. `listSubmissionAudit`: `requireSupabaseAuth` + **`has_role` (REVIEW_ROLES)**. | Access denied. **not exercised** | **real** | **no** |
| `/administration/ai-engines` | UI `RequireRoles`. Platform engine CRUD: `requireSupabaseAuth` + **`requirePlatformAdmin` (`is_admin_tier`)**. Workspace keys: **`workspace_can_manage`**. | Access denied. **not exercised** | **real** | **no** |
| `/administration/email-delivery` | UI `RequireRoles`. Email admin fns: `requireSupabaseAuth` + **`assertAnalyticsReader`**. | Access denied. **not exercised** | **real** | **no** |
| `/administration/platform-admins` | UI **`RequireRoles(["super_admin"])`**. Platform-users fns: `requireSupabaseAuth` + **`has_role(..., "super_admin")`**. | Access denied. **not exercised** | **real** | **no** |
| `/administration/readiness` | UI `RequireRoles`. `getLaunchReadinessFn` et al.: `requireSupabaseAuth` + **`is_admin_tier`**. | Access denied. **not exercised** | **real** | **no** |
| `/administration/production-readiness` | UI `RequireRoles`. `getProductionConfigFn`: `requireSupabaseAuth` + **`is_admin_tier`**. | Access denied. **not exercised** | **real** | **no** |
| `/administration/production-data` | UI `RequireRoles`. audit/revoke/sign-off fns: `requireSupabaseAuth` + **`requirePlatformAdmin`**. | Access denied. **not exercised** | **real** | **no** |
| `/administration/launch-checks` | UI `RequireRoles`. QA/launch fns: `requireSupabaseAuth` + **`is_admin_tier`**. | Access denied. **not exercised** | **real** | **no** |
| `/administration/release-candidate` | UI `RequireRoles`. Same QA/readiness fns + **`is_admin_tier`**. | Access denied. **not exercised** | **real** | **no** |
| `/administration/launch-readiness` | UI `RequireRoles`. Same pattern + **`is_admin_tier`**. | Access denied. **not exercised** | **real** | **no** |

**UI vs server mismatch (notable):** several Inbox/Growth pages use UI `PLATFORM_ADMIN_ROLES` (includes `moderator`, `content_manager`, `reviewer`) while server `assertAnalyticsReader` only accepts `super_admin`/`admin`/`ai_hub_admin`/`usecasex_admin`. Those mid-tier roles can **open** the UI but get **Forbidden** from the server fn — **not exercised**.

### Remaining sidebar customer / account items (lighter pass)

| Route | Server-side gate | Lite `user` (code) | Backing | Mock? |
|-------|------------------|--------------------|---------|-------|
| `/dashboard` | Client session + profile; no admin server fn | Redirect `/pro` if signed out; else dashboard. **not exercised** | **real** | **no** |
| `/repository` | Public/catalogue reads (anon/auth RLS) | Full browse. **not exercised** | **real** | **no** |
| `/discover` | Discover flow (client + APIs) | Wizard. **not exercised** | **real** | **no** |
| `/quick-wins` | Client/matrix | Matrix UI. **not exercised** | **real** | **no** |
| `/roi-calculator` | Client calculator | Calculator. **not exercised** | **real** | **no** |
| `/insights` | Insights data | Insights. **not exercised** | **real** | **no** |
| `/studio` | Studio modules; many children `RequirePlan` + server auth | Studio entry; deep Pro children soft/hard gated. **not exercised** | **real** | **no** |
| `/my-use-cases` | Client `useUseCaseXPro` store; redirect signed-out → `/pro` | Shortlist from **local store**, not `MOCK_USE_CASES`. **not exercised** | **real** (local persisted store) | **no** |
| `/boards` | Boards server fns / RLS (workspace) | Boards when flag on. **not exercised** | **real** | **no** |
| `/submit` | Submission createServerFn + auth | Submit form. **not exercised** | **real** | **no** |
| `/patterns` | Patterns / content governance | Pattern library. **not exercised** | **real** | **no** |
| `/demo-scenarios` | `copyDemoScenarioFn` etc.: auth + workspace / admin checks | Demo list + copy. **not exercised** | **real** | **no** |
| `/roadmap` | **UI `RequirePlan min=pro`** (admins bypass). Server: Roadmap fns `requireSupabaseAuth` + tenancy — **no plan assert** → mark **UI-only (plan)**. | Upgrade / lock card (not admin). **not exercised** | **real** | **no** |
| `/sarpi` | Suite shell; Integrations nav disabled | Shell / guidance. **not exercised** | **stub / shell** | **no** |
| `/advisorx` | Head title “Coming Soon” | Coming soon shell. **not exercised** | **stub** | **no** |
| `/cyberx/c3g/intake` | Head title “Coming Soon” | Coming soon shell. **not exercised** | **stub** | **no** |
| `/handoffs` | **UI `RequirePlan min=pro`**. Server handoff fns auth + tenancy — **UI-only (plan)**. | Upgrade card. **not exercised** | **real** | **no** |
| `/pilot` | Pilot participant fns (auth; admin paths separate) | Pilot mission UI for participants. **not exercised** | **real** | **no** |
| `/support` | `submitFeedback`: `requireSupabaseAuth` only | Support form. **not exercised** | **real** | **no** |
| `/account` | Profile client / auth | Account settings. **not exercised** | **real** | **no** |
| `/account/security` | Security settings | Security page. **not exercised** | **real** | **no** |

**Explicit mock check:** `_app.reports.tsx` and `_app.my-use-cases.tsx` **do not** import `usecasex.mock.ts`. Repo-wide route modules for these paths are clean; remaining mock imports are elsewhere (`MockUseCaseCard`, public API taxonomy helpers, `usecasex.admin` types).

---

## G. V2-03 output and tenancyV2 switcher

### V2-03 — **was run** (2026-09-22)

Evidence: `docs/v2/prompt-pack-execution-log.md` row V2-03 **DONE**.

| Kind | Paths |
|------|--------|
| Lifecycle module | `src/lib/lifecycle/{states,map,transitions,apply,audit,canvas-sections,index}.ts` |
| Permissions | `src/lib/authz/scoped-permissions.ts` (scoped perms + Enterprise bundles; launch workspace roles preserved) |
| Docs | `docs/v2/lifecycle-status-map.md`, execution log |
| SQL migration named V2-03 | **None** — lifecycle/permissions are application-layer; later V2-04+ migrations exist separately |

Gate UI was **explicitly deferred** in V2-03 (later V2-10 delivered gates / `/reviews`).

### tenancyV2 switcher UI

- Flag: `PUBLIC_LAUNCH_FEATURES.tenancyV2` ← `VITE_TENANCY_V2_ENABLED === "true"` (`src/lib/feature-flags.ts`), **default OFF**.
- Comment: gates “workspace switcher, member management”; data foundation before UI.
- **Code reference search:** `tenancyV2` appears **only** in `feature-flags.ts` — **no component reads the flag**. There is **no** workspace-switcher / member-management UI wired to it.
- When enabled today: **no observable UI change** (flag is inert until a consumer is added). When disabled (default): same.

---

## H. Role semantics (`app_role` × 11)

`user_roles` schema (`docs/migration/full-schema.sql`): columns `id`, `user_id`, `role`, `created_at` — **no `workspace_id` / `organization_id`**. **Global** platform role grants (`UNIQUE (user_id, role)`).

Customer **workspace** roles live separately on `workspace_members.role` (`owner` \| `admin` \| `contributor` \| `facilitator` \| `viewer`) — see `src/lib/authz/roles.ts`.

| `app_role` | Staff vs customer (how code treats it) | Evidence |
|------------|----------------------------------------|----------|
| `super_admin` | **AIgilityX / platform staff** | `ADMIN_TIER_ROLES`; platform-admins page + `has_role(..., "super_admin")` |
| `ai_hub_admin` | **Platform staff** | `ADMIN_TIER_ROLES`; `is_admin_tier` SQL set |
| `usecasex_admin` | **Platform staff** | Same |
| `admin` | **Platform staff** (also listed in narrower `authz/roles.ts` `PLATFORM_ADMIN_ROLES` for `isPlatformAdmin`) | `ADMIN_TIER_ROLES`; `useRoles().isAdmin` |
| `moderator` | **Platform staff** (admin-tier sidebar / CMS); **not** in `assertAnalyticsReader` / `isPlatformAdminRole` narrow lists | `ADMIN_TIER_ROLES`; `PLATFORM_ADMIN_ROLES` in `platform-admin.ts` |
| `content_manager` | **Platform staff** (admin-tier) | Same |
| `reviewer` | **Platform staff** (admin-tier + submission review) | `ADMIN_TIER_ROLES`; `REVIEW_ROLES` |
| `contributor` | **Legacy / catalogue-ish platform enum**, **not** workspace Owner/Contributor; **not** in `ADMIN_TIER_ROLES`. Workspace contributor is `workspace_members.role` | Enum in `usecasex.roles.ts`; `permissions.ts` EDITOR_ROLES |
| `viewer` | Same pattern — platform enum; workspace viewer is membership | Not in `ADMIN_TIER_ROLES` |
| `editor` | Platform enum → permission tier “editor” in `permissions.ts`; **not** admin-tier sidebar | `permissions.ts` EDITOR_ROLES |
| `user` | Default / lowest platform tier in `permissions.ts` (`tierForRoles` → `"user"`) | Not admin-tier |

### How `user_roles` rows are created

| Path | Creates `user_roles`? |
|------|------------------------|
| `handle_new_user` trigger | **No** — inserts `profiles` only |
| Founding Access approve | Sets plan/entitlement; **does not** insert `user_roles` (server approve path) |
| Seed scripts | **Yes** — e.g. `scripts/seed/create-superadmin.mjs`, `demo-accounts.mjs`, `demo-personas.mjs` upsert into `user_roles` |
| Platform Admins UI | **Yes** — `platform-users.server.ts` mutates `user_roles` (super_admin only) |
| Production data revoke grant | Can **remove** platform grants via ops fns |

---

## I. Contradictions vs `docs/v2/current-state-audit.md` and `docs/v2/ui-audit.md`

| Prior gap | Source | Status now | Evidence |
|-----------|--------|------------|----------|
| Ungated admin-sounding routes in nav / weak admin gates | V2-01 + July audits (sidebar visibility) | **Still open (sidebar)** | `/reviews`, `/reports`, `/admin-observability` lack `admin: true` in `AppSidebar` — any authenticated user **sees** the links. Pages: observability **has** server `observabilityAccess`; reports/reviews are workspace-scoped, not platform-admin. |
| Mock data on `/reports` and `/my-use-cases` | July `route-inventory` / `dead-and-duplicate` / V2 mock leakage note | **Fixed** for those routes | No `usecasex.mock` import in `_app.reports.tsx` / `_app.my-use-cases.tsx`; data from store + Supabase |
| Dead CTAs (“Send to advisor” / “Add to Portfolio” against mocks) | `docs/audit/2026-07-25/dead-and-duplicate.md` | **Fixed / removed** (as described) | Those strings **absent** from current `_app.reports.tsx` / `_app.my-use-cases.tsx` |
| Self-approval in `reviewSubmission` | V2-01 SEC-02 / SoD | **Fixed** | `assertNotSelfReview(submission.user_id, userId)` in `submissions.functions.ts` (~179); shared helper in `submissions.ts`; also used in gates model |
| `docs/v2/ui-audit.md` | Requested for contradiction list | **File does not exist** | Glob / path miss; closest: `docs/audit/2026-07-25/*`, `docs/v2/current-state-audit.md` |
| Cross-tenant RLS live denial | V2-01 SEC-01 | **Still open** (not re-run this session) | Not executed here |
| Mock leakage residual (`usecasex.mock.ts` present) | V2-01 §3 | **Still open as residual file** | File still exists; **not** wired into `/reports` or `/my-use-cases` |

---

## J. Sidebar items visible to **both** admin-tier and plain authenticated users

`AppSidebar` visibility: `(!item.admin || isAdmin)` (`isAdmin` = any `ADMIN_TIER_ROLES` via `usePlan`).  
Items **without** `admin: true` appear for **every** signed-in user (subject to feature flags). Admins see those **plus** all `admin: true` items.

### Full shared set (non-`admin` sidebar targets)

**Core / Studio / Integrations / Account:**  
`/dashboard`, `/repository`, `/discover`, `/opportunities`, `/opportunity-map`, `/workshops`, `/quick-wins`, `/roi-calculator`, `/insights`, `/studio`, `/my-use-cases`, `/boards`, `/submit`, `/patterns`, `/demo-scenarios`, `/roadmap`, `/sarpi`, `/advisorx`, `/cyberx/c3g/intake`, `/handoffs`, `/pilot`, `/support`, `/account`, `/account/security`, `/entitlement`, `/module-analytics` (if `lifecycleAnalytics` flag).

### Groups called out in the request

**Inbox group — shared with plain users**

| Item | `admin` flag | Notes |
|------|--------------|-------|
| Review Inbox `/reviews` | **none** (`pro: true` badge only) | Same link for admins and plain users |
| Requests Inbox, Founding Access, Submission Review | `admin: true` | Admin-only |

**Insights and audit — shared with plain users**

| Item | `admin` flag | Notes |
|------|--------------|-------|
| Reports `/reports` | **none** | Shared |
| Export & AI Activity `/admin-observability` | **none** | Shared link; **server** still denies non–workspace-admin |
| Submission Audit `/admin-audit` | `admin: true` | Admin-only |

Integrations group is still rendered but **`pointer-events-none`** for everyone (including admins) in the sidebar UI.

---

## K. Could not verify

1. **Runtime** behaviour with a real lite / `user`-only account (no local login this session) — all lite cells **not exercised**.
2. **Live RLS** row counts / denial on the target hosted DB for every table named above (policies cited from schema/docs + code paths).
3. **`docs/v2/ui-audit.md`** — missing; July 2026 audit pack used as proxy.
4. Whether every `admin.repository` write path is covered by live `is_admin_tier` policies on the **current** cloud DB (schema dump vs live drift).
5. Exact default `workspace_members.role` for a brand-new lite user after signup (depends on provisioning triggers/seeds not traced end-to-end here).
6. Whether enabling `VITE_TENANCY_V2_ENABLED` alone changes any SSR/loader behaviour beyond the unused flag constant (no consumers found).

---

*End of 2026-10-08 addendum. Application code untouched; this markdown file only.*
