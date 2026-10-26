# Pack-versus-repo conflict report

**Audit date:** 2026-10-23 (reworked against pack on disk)  
**Pack:** `docs/refactor/prompt-pack.md` (Phases 0–13)  
**Baseline:** `docs/refactor/baseline.md`  
**Rule:** Read-only except this report. No source / CLAUDE.md edits.

**Standing SoT (every replacement / amendment):**

| Concern | Only source |
|---------|-------------|
| Navigation registry | **`src/lib/navigation/enterprise-nav.ts`** (platform ops: `src/lib/navigation/platform-admin-nav.ts`) |
| Permission / action vocabulary | **`src/lib/authz/scoped-permissions.ts`** (nav visibility capabilities remain in `src/lib/authz/nav-capabilities.ts`; do not invent a third permission module) |

Do **not** create or revive `src/config/navigation/*`. The pack’s suggested path is superseded by the files above.

---

## Verdict counts (must equal 14 phase rows)

| Verdict | Count | Phases |
|---------|------:|--------|
| **SKIP** (DONE — do not re-run) | **8** | 0, 2, 3, 5, 7, 9, 10, 11 |
| **REPLACEMENT PROMPT** (PARTIAL) | **6** | 1, 4, 6, 8, 12, 13 |
| **RUN WITH AMENDMENT** | **0** | — |
| **BLOCKED** | **0** | — |
| **NOT STARTED** (status only; none left without a verdict above) | **0** | — |
| **Total rows** | **14** | Phase 0 … Phase 13 |

---

## Classic vs enterprise sidebar (live default)

| Question | Answer |
|----------|--------|
| **Code default** | Classic is live when `VITE_ENTERPRISE_NAVIGATION_V2_ENABLED` is unset or not `"true"`. `PUBLIC_LAUNCH_FEATURES.enterpriseNavigationV2` in `src/lib/feature-flags.ts` defaults **OFF**. |
| **Flag that switches** | `VITE_ENTERPRISE_NAVIGATION_V2_ENABLED=true` → `AppSidebar` renders `EnterpriseSidebar`; otherwise `ClassicAppSidebar` (plus in-session `EnterpriseNavBoundary` fallback to classic on render error). |
| **Lovable tip today** | Flag was set **ON** in committed `.env` at `e64fbd9` (“Enabled EnterpriseNavV2 flag”) — preview shows enterprise chrome; product default in `.env.example` remains OFF for controlled rollout. |
| **Does classic read `enterprise-nav.ts`?** | **No.** Classic embeds parallel arrays in `src/components/ClassicAppSidebar.tsx`. |
| **Classic parallel arrays** | `CORE`, `STUDIO_PRO`, `INTEGRATIONS`, `ADMIN_GROUPS` (Overview / Inbox / Growth / Insights and audit / Platform / Launch and release), `ACCOUNT`. |
| **Phase 13 vs migrate** | **Phase 13 does not retire classic** — it *requires* classic to remain operational when the flag is OFF (rollback path). **Phase 1 remainder must migrate classic** so it **reads from `src/lib/navigation/enterprise-nav.ts`** (and platform items from `platform-admin-nav.ts`) and stops owning parallel arrays. Retiring classic entirely is a **post-soak follow-up after Phase 13**, not Phase 13 itself. |

---

## Phase status table (one row per pack phase)

| Pack phase | Your internal ID(s) | Status | Evidence (files, commits, docs) | What's missing (PARTIAL only) | Verdict |
|------------|---------------------|--------|----------------------------------|-------------------------------|---------|
| **Phase 0** — Protect / repository audit | NAV-DOC | **DONE** | `docs/architecture/navigation-current-state.md` (2026-10-07 + 2026-10-08 addendum); risks/debt/recommendations §A–E | — | **SKIP** |
| **Phase 1** — Enterprise IA / central nav config | NAV-1 | **PARTIAL** | Registry + types in `src/lib/navigation/enterprise-nav.ts` (`ENTERPRISE_NAV_SECTIONS`); platform split `platform-admin-nav.ts`; integrity derives from enterprise sections (`nav-integrity.ts`); commits `0660910`, `2ba720b`. Pack path `src/config/navigation/*` **must not** be created. | `docs/architecture/navigation-target-state.md` missing; classic still owns `CORE` / `STUDIO_PRO` / `INTEGRATIONS` / `ADMIN_GROUPS` / `ACCOUNT`; target IA gaps vs pack (e.g. richer Govern/Intelligence/Assess items) not fully mapped in a target-state doc | **REPLACEMENT PROMPT** |
| **Phase 2** — Role / capability-aware navigation | NAV-2 | **DONE** | `src/lib/authz/nav-capabilities.ts`; `src/lib/authz/scoped-permissions.ts` (V2 action vocabulary); `docs/security/rbac-navigation-matrix.md`; `RequireCapability` on `/reviews`, `/reports`, `/admin-observability`, `/module-analytics`; commit `0660910`; unit tests under `tests/unit/nav-capabilities*` | — | **SKIP** |
| **Phase 3** — Sidebar UI (enterprise chrome) | NAV-4-UI | **DONE** | `src/components/enterprise-nav/{EnterpriseSidebar,SidebarSection,SidebarItem,SidebarSubmenu,WorkspaceSwitcher,UserMenu,NavCommandTrigger}`; `AppSidebar` switch; progressive disclosure + storage keys in `enterprise-nav.ts`; commit `2ba720b`; regression report 2026-10-12 | — | **SKIP** |
| **Phase 4** — Organization & workspace context | NAV-6 | **PARTIAL** | `docs/architecture/workspace-navigation-context.md`; `WorkspaceSwitcher` / `WorkspaceUrlSync`; `useWorkspaceContext` / server membership checks | `VITE_TENANCY_V2_ENABLED` still default OFF; member-management / full tenancy UI consumers incomplete; counts/pages not fully workspace-scoped everywhere | **REPLACEMENT PROMPT** |
| **Phase 5** — Platform admin separation | NAV-3 | **DONE** | `docs/architecture/platform-admin-separation.md` (implemented); `/platform-admin/*` + legacy `/administration/*` redirects; `platform-admin-nav.ts`; isolation tests / regression report | — | **SKIP** |
| **Phase 6** — Integrations hub | — | **PARTIAL** | Enterprise section `integrations` in `enterprise-nav.ts` omits disabled stub rows (`flag: capFlag("integrations")`); suite routes still exist | No Integrations Hub page/cards (SARPI / AdvisorX / C3G / SovereignIQ catalogue); classic still lists `INTEGRATIONS` disabled rows; no single hub route | **REPLACEMENT PROMPT** |
| **Phase 7** — Command palette | — | **DONE** | `src/lib/navigation/command-palette.ts`; `NavCommandTrigger`; Ctrl/Cmd+K; nav + actions + entity search helpers; RBAC via nav capabilities | — | **SKIP** |
| **Phase 8** — Contextual module navigation | CTX-0…CTX-4 | **PARTIAL** | `docs/ux/contextual-navigation-migration.md` (Phase 0 inventory **done**; Studio nested routes exist as chip strip) | No shared ContextualNav layout; Portfolio/Pilot contextual chrome not migrated; ROI/roadmap still global sidebar hubs | **REPLACEMENT PROMPT** |
| **Phase 9** — Domain-model review | — | **DONE** | `docs/architecture/usecasesx-domain-model-review.md` (read-only; Mermaid ERD; no schema changes) | — | **SKIP** |
| **Phase 10** — Reports hub | — | **DONE** | `docs/architecture/reports-hub.md` (implemented); single sidebar Reports → `/reports`; `src/lib/reports/reports-hub.ts` | — | **SKIP** |
| **Phase 11** — Navigation analytics | NAV-ANALYTICS | **DONE** | `docs/analytics/navigation-events.md`; `src/lib/telemetry/navigation-analytics.ts`; `nav.variant_active` / `nav.render_error` | — | **SKIP** |
| **Phase 12** — Enterprise QA / regression | — | **PARTIAL** | `docs/testing/navigation-regression-report.md` (unit 719, nav-integrity, Playwright 43 pass / 4 skip, build PASS) | Live RLS / dual-tenant proof still **BLOCKED** (`Invalid login credentials`); several signed-in matrix cells unit-only | **REPLACEMENT PROMPT** |
| **Phase 13** — Controlled release | NAV-4-FLAG | **PARTIAL** | Flag `enterpriseNavigationV2` / `VITE_ENTERPRISE_NAVIGATION_V2_ENABLED`; `docs/releases/enterprise-navigation-v2-rollout.md`; classic retained for OFF; commit `e64fbd9` enabled flag on Lovable tip | Full staged % rollout (internal → founding → pilots → 10/50/100) not evidenced; classic still parallel (must be migrated under Phase 1 before retirement); post-soak classic removal not done | **REPLACEMENT PROMPT** |

---

## Replacement prompts (PARTIAL phases only)

Each prompt **must** reuse `src/lib/navigation/enterprise-nav.ts` as the only customer nav registry and `src/lib/authz/scoped-permissions.ts` as the only permission/action vocabulary source (extend `nav-capabilities.ts` for nav visibility only — do not add a new permission package).

### Phase 1 — replacement

> Finish the centralized navigation model **without** creating any `src/config/navigation` tree. Extend **`src/lib/navigation/enterprise-nav.ts`** (and **`platform-admin-nav.ts`** for AIgilityX ops) as the sole registries. Write `docs/architecture/navigation-target-state.md` mapping old menus → these registries. Migrate **`ClassicAppSidebar`** so it **imports and renders from `enterprise-nav.ts` / `platform-admin-nav.ts`** — delete parallel `CORE`, `STUDIO_PRO`, `INTEGRATIONS`, `ADMIN_GROUPS`, `ACCOUNT` arrays. Keep all pathnames and redirects. Authorization decisions stay in **`src/lib/authz/scoped-permissions.ts`** + existing RLS; UI visibility uses `nav-capabilities.ts` only. No DB migration. Run typecheck, lint, `check:nav-integrity`, unit tests.

### Phase 4 — replacement

> Complete Organization/Workspace chrome against the **existing** model in `docs/architecture/workspace-navigation-context.md`. Do not add a `tenants` table. Reuse `WorkspaceSwitcher` / `useWorkspaceContext`. Wire remaining surfaces so lists/counts respect the active workspace. Entitlements/permissions continue through **`scoped-permissions.ts`** / catalogue — do not hard-code roles in JSX. No duplicate switcher. No destructive schema work.

### Phase 6 — replacement

> Build a single **Integrations** destination registered only in **`src/lib/navigation/enterprise-nav.ts`** (one hub route). Implement an Integrations Hub page with cards (SARPI, AdvisorX, CyberX C3G, SovereignIQ, handoffs) using existing entitlement flags — no permanently disabled sidebar rows. Remove classic `INTEGRATIONS` parallel list by consuming the registry (Phase 1). Permissions via **`scoped-permissions.ts`** / existing edition flags. Do not fake live integrations.

### Phase 8 — replacement

> Execute contextual migration per `docs/ux/contextual-navigation-migration.md` starting with Use Case chrome: shared layout + tabs over **existing** `/studio/use-case/$id/*` routes. Do **not** add object tabs to `ENTERPRISE_NAV_SECTIONS`. Demote global ROI/roadmap only after contextual entry points exist. Tab authz from **`scoped-permissions.ts`** / `nav-capabilities.ts`. Preserve bookmarkable URLs.

### Phase 12 — replacement

> Close gaps in `docs/testing/navigation-regression-report.md`: seed demo tenants; green `bun run test:rls` / tenancy / cross-workspace; fill signed-in Playwright matrix. Do not re-implement navigation. No RLS weakening. Report delta only.

### Phase 13 — replacement

> Execute the controlled rollout in `docs/releases/enterprise-navigation-v2-rollout.md` using the **existing** `VITE_ENTERPRISE_NAVIGATION_V2_ENABLED` flag — do not create a second flag framework. Keep classic as OFF-path until soak. Do **not** delete classic until Phase 1 migration is done and soak is green. Then schedule classic removal as a separate change. Monitor `nav.render_error` / `nav.variant_active`.

---

## CLAUDE.md — Navigation Architecture Rules (append once; do not edit CLAUDE.md in this audit)

**Status:** Block is **not** present in `CLAUDE.md` today. Append the following **once** when an operator/prompt is authorized to edit `CLAUDE.md`. Do not add it again.

Corrected text (SRS lifecycle; sidebar groups = navigation grouping only):

```markdown
# UseCasesX Navigation Architecture Rules

UseCasesX is an enterprise AI Use Case Management and AI Investment Decision platform.

## Product lifecycle (canonical — SRS)

The product lifecycle is defined by `docs/v2/srs-prd-v2.md` §6 and must not be shortened in navigation docs:

Discover → Capture → Design → Evidence → Score → Review → Prioritize → Approve/Hold/Reject → Roadmap → Deliver → Measure → Scale/Retire

Sidebar section labels (Discover, Design, Assess & Prioritize, Portfolio, Govern & Assure, Intelligence, Reports, Integrations, Administration, Help) are **navigation grouping only**. They organize destinations; they are not a substitute for the SRS lifecycle. Object-level stages (Evidence, Score, Deliver, Measure, etc.) belong in contextual navigation inside Use Case / Portfolio / Pilot surfaces.

## Navigation registry and permissions

- The only customer navigation registry is `src/lib/navigation/enterprise-nav.ts`.
- Platform operations navigation is `src/lib/navigation/platform-admin-nav.ts`.
- Do not create `src/config/navigation/*` or duplicate menu arrays in components (including classic chrome — consume the registries).
- The only permission / action vocabulary source is `src/lib/authz/scoped-permissions.ts`. Nav visibility capabilities live in `src/lib/authz/nav-capabilities.ts`. Do not invent a third permission module.

## Navigation Principles

1. Do not add a global sidebar item simply because a new feature is created.
2. Global sidebar items represent major user destinations, not individual functions.
3. Prefer contextual navigation inside Use Cases, Portfolios, Pilots, and Opportunities.
4. Customer-facing UseCasesX and AIgilityX platform administration must remain separated (`/platform-admin/*`).
5. Navigation visibility must respect authentication, authorization, capability, workspace, subscription entitlement, and feature flags.
6. UI visibility is never an authorization control.
7. Backend authorization and Supabase RLS remain authoritative.
8. Use stable navigation IDs rather than labels.
9. Do not duplicate route definitions or menu registries.
10. Do not hard-code role checks throughout UI components; prefer capabilities / scoped permissions.
11. Preserve backward-compatible routes during refactoring wherever practical.
12. Never weaken tenant data isolation.
13. New modules must first choose a **navigation group** (Discover, Design, Assess & Prioritize, Portfolio, Govern & Assure, Intelligence, Reports, Integrations, Administration, Help) — without claiming that group is the full SRS lifecycle.
14. AIgilityX operational tools belong in Platform Administration, not normal customer navigation.
15. A feature inside a Use Case should normally become a contextual tab, not a global navigation item.
16. Navigation must remain usable on desktop, tablet, and mobile.
17. Follow existing project technologies and design-system components unless architectural change has been explicitly approved.
18. Run type checking, linting, and relevant tests after material changes.
19. Do not perform destructive database migrations without explicit approval.
20. Enterprise vs classic chrome is controlled only by `VITE_ENTERPRISE_NAVIGATION_V2_ENABLED`; classic must consume the same registries until it is formally retired after soak.
```

---

## Recommended run order (remaining work only)

1. Operator: DB snapshot CSVs + `docs/refactor/recovery.md` tag.
2. **SKIP** Phases 0, 2, 3, 5, 7, 9, 10, 11.
3. **Phase 1** replacement (registry + classic migration + target-state doc).
4. **Phase 4** → **Phase 6** → **Phase 8** (sequential; do not parallelize edits to `enterprise-nav.ts`).
5. **Phase 12** (RLS / signed-in matrix) when demo credentials exist.
6. **Phase 13** replacement (staged rollout); classic removal only after Phase 1 + soak.
7. Append CLAUDE.md rules block once (operator-approved edit).

**Anti-parallelism:** Phases 1, 6, 8, and 13 must not edit `enterprise-nav.ts` / sidebar components in parallel.

---

## Open security items (unchanged from prior audit)

| Item | Status | Evidence |
|------|--------|----------|
| Cross-tenant RLS test (R-SEC-01) | **OPEN** | `docs/v2/risk-register.md`; `go-no-go.md`; Phase 12 still blocked on demo credentials |
| `user_roles` write policy | **OPEN** (pending live CSV) | `docs/migration/full-schema.sql` “Admins manage roles” FOR ALL |
| Event-table insert policies | **OPEN** (pending live CSV) | `audit_events` / `product_events` authenticated INSERT |
| `ai_engines` column exposure | **OPEN** (pending live CSV) | authenticated SELECT `USING (true)` in schema dump |

Migrations: any new SQL must timestamp after `20260929180000`; **you** review and apply — never the agent.
