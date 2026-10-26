# Pre-refactor baseline — UseCasesX AI Studio 1.0

**Audit date:** 2026-10-23  
**Branch:** `fix/nav-2-corrective` @ `e64fbd93e4d3f2292b742300b52e033c97011d63`  
**Rule:** Read-only. No source/config/migration/env/DB writes. Artifacts only under `docs/refactor/` and `scripts/audit/`.

---

## 1. Git

| Item | Value |
|------|-------|
| Current branch | `fix/nav-2-corrective` |
| HEAD | `e64fbd9` — *Enabled EnterpriseNavV2 flag* |
| Tracking | `origin/fix/nav-2-corrective` (in sync) |

### Remotes (`git remote -v`)

| Remote | URL |
|--------|-----|
| `lovable` | `https://github.com/AIgilityX-LLC/usecasesx-ai-studio-1.0.git` |
| `origin` | `https://github.com/AIgilityX-LLC/ai-usecasesx-studio-1.0.git` |

> Note: GitHub reports that `origin` (`ai-usecasesx-studio-1.0`) has moved to `old-ai-usecasesx-studio-1.0`. Lovable preview tracks the `lovable` remote.

### Divergence: `origin/main...lovable/main`

```
git rev-list --left-right --count origin/main...lovable/main
→ 0	36
```

| Side | Meaning |
|------|---------|
| Left (`origin/main` only) | **0** |
| Right (`lovable/main` only) | **36** |

**Verdict:** Remotes are **out of sync**. `origin/main` (`8e9067a`) is a strict ancestor of `lovable/main` (`e64fbd9`). Not a conflicting fork (no unique commits on `origin/main`), but **lovable is 36 first-parent commits ahead**. Do not assume the two remotes are interchangeable.

### Last 20 first-parent commits on `origin/main`

```
8e9067a Replace Gratis auto-grant with reviewed Founding Access request flow.
7590273 Merge Lovable remote main before publishing local V2/nav updates.
e0f9812 Ship V2 foundation, auth-aware landing nav, and repository grant fix for Lovable sync.
673ab58 Fix board status inserts and Lovable service-role secret fallback.
0e9b994 Commit browser-safe Supabase env for Lovable Vite builds.
b3d95d7 Rebuild landing and auth UI for Lovable sync.
98f86cc Point app config at the new Supabase project and stop tracking local env secrets.
5c8b3de stop tracking .env
8829705 fix(security): implement SELECT_SCALARS to safely query use_cases
40a2ff6 Add integration configuration from remix
6602422 Solved search & known issue bugs
4468b24 Seeded sample tenants
00bd7ab Added waiver panel to Readiness
326e388 Update plan
c21c92c Added session timeout guard
53dd131 Added Pro pricing page & published
0a2d68c Added pilot portal dashboard
79b3cb8 Enabled Studio with free gemini
af8a596 Enhanced studio & engine admin
d9ec80b Update plan
```

### Last 20 first-parent commits on `lovable/main` (actual preview tip)

```
e64fbd9 Enabled EnterpriseNavV2 flag
6cf0ae5 Upgraded source-map-js to 1.2.2
89699b6 Fixed security findings
eaf94ec Audience growth strategy
a643d88 Unblock CI: format tree, soften artifact quota, skip secret-backed Playwright.
dd74816 Fix CI lint and navbar hero gate after nav merge.
9b458ae Fix CI gates: sync migration manifest and clear typecheck blockers.
101ab69 Merge lovable/main into fix/nav-2-corrective for sync.
2ba720b Ship enterprise navigation v2 behind feature flag for Lovable sync.
0660910 feat(nav): capability-aware navigation (wip)
8e9067a Replace Gratis auto-grant with reviewed Founding Access request flow.
… (continues shared history with origin/main)
```

---

## 2. Build health (baseline every later prompt is compared against)

**Tooling note:** `bun` / `bunx` / `tsgo` were **not on PATH** in this audit environment. Typecheck used local `tsc --noEmit`. Unit tests (`bun test tests/unit`) were **NOT RUN**. Prefer restoring Bun before Prompt 1 so later prompts can compare apples-to-apples.

| Check | Command used | Result | Counts / notes |
|-------|--------------|--------|----------------|
| Typecheck | `.\node_modules\.bin\tsc.cmd --noEmit` | **PASS** | Exit 0. (`tsgo` preferred by AGENTS.md but unavailable — pre-existing tooling gap.) |
| Lint | `.\node_modules\.bin\eslint.cmd .` | **FAIL** | **371 problems (13 errors, 358 warnings)**. 12 errors auto-fixable (`--fix`). **Pre-existing.** |
| Unit tests | `bun test tests/unit` | **NOT RUN** | Bun binary missing. **Pre-existing tooling gap** — do not treat as product failure. |
| `verify:routes` | `node scripts/verify-route-tree.mjs` | **PASS** | `routeTree.gen.ts OK (170 route files verified)` |
| `check:nav-integrity` | `node scripts/check-nav-integrity.mjs` | **PASS** | `51 nav targets + 27 redirects resolve` |
| Build | `NODE_OPTIONS=--max-old-space-size=6144` + `npx --no-install vite build` (after route verify) | **PASS** | Exit 0; `✓ built in 9m 25s` |

### Lint errors (pre-existing) — exact files

| File | Issue |
|------|-------|
| `src/integrations/supabase/previewAuthStorage.ts` | `prefer-const` (`timer`) — **note: under generated/integrations tree; do not “fix” casually** |
| `src/lib/evidence/evidence.functions.ts` / `evidence.server.ts` | `prefer-const` (`query`) |
| `src/lib/founding-access.server.ts` | 11× `prettier/prettier` indentation |

Logs archived under `scripts/audit/{typecheck,lint,build,verify-routes,nav-integrity}.log` (where produced).

---

## 3. Single sources of truth

### 3.1 Navigation

| Concern | Owner (canonical) | Parallel / duplicate lists |
|---------|-------------------|----------------------------|
| Enterprise sidebar registry (NAV-1 intent) | **`src/lib/navigation/enterprise-nav.ts`** | Components under `src/components/enterprise-nav/*` must import from here only |
| Platform-admin nav | **`src/lib/navigation/platform-admin-nav.ts`** | Separate by design (platform vs workspace) |
| Command palette entries | **`src/lib/navigation/command-palette.ts`** | Must stay aligned with enterprise registry |
| Nav integrity targets / redirects | **`src/lib/nav-integrity.ts`** (`PRIMARY_NAV_TARGETS`, `SIDEBAR_NAV_TARGETS`, `TRANSPARENCY_NAV_TARGETS`, `EXPECTED_REDIRECTS`) | CI: `scripts/check-nav-integrity.mjs` |
| Classic sidebar (flag OFF / fallback) | **`src/components/ClassicAppSidebar.tsx`** | **DUPLICATE:** still embeds its own menu arrays — parallel to `enterprise-nav.ts` |
| Guest top nav | **`src/components/SiteShell.tsx`** (`TOP_NAV`) | Separate surface (signed-out) |
| Mobile guest nav | **`src/components/MobileNav.tsx`** | Separate surface |
| Sidebar chrome switch | **`src/components/AppSidebar.tsx`** | Selects classic vs enterprise via `PUBLIC_LAUNCH_FEATURES.enterpriseNavigationV2` |

**Flag:** More than one file defines signed-in menus: `enterprise-nav.ts` **and** `ClassicAppSidebar.tsx`. Acceptable only while the flag supports rollback; any refactor must not invent a third registry.

### 3.2 Roles, permissions, capabilities

| Concern | Owner | Notes / duplication |
|---------|-------|---------------------|
| App roles (`user_roles` enum mapping) | `src/lib/authz/roles.ts`, `src/lib/usecasex.roles.ts` | **DUPLICATE risk:** two role modules — authz package vs legacy `usecasex.roles` |
| Scoped permissions (V2-03) | **`src/lib/authz/scoped-permissions.ts`** | Canonical for lifecycle-scoped actions |
| Nav capabilities | **`src/lib/authz/nav-capabilities.ts`** | Route → capability map for enterprise nav |
| Legacy action↔tier matrix | **`src/lib/permissions.ts`** | Still used by UI/`Can`; overlaps conceptually with scoped-permissions |
| Permission service / subject | `src/lib/authz/permission-service.ts`, `src/lib/authz.server.ts` | Server subject resolution |
| Capability flags (defaults) | `src/lib/authz/flags.ts` | Merged with env in feature-flags / authz.server |
| Entitlement catalogue | `src/lib/authz/catalogue.ts`, `src/lib/entitlements.ts` | Editions centralized in `authz/editions.ts`; `entitlements.ts` re-exports + commercial helpers |

### 3.3 Plans and entitlements

| Concern | Owner |
|---------|-------|
| Plan hook | **`src/hooks/usePlan.ts`** |
| Entitlement hook | **`src/hooks/useEntitlement.ts`** |
| Route/UI gates | **`src/components/RequirePlan.tsx`**, **`src/components/Can.tsx`**, **`src/components/RequireRoles.tsx`** |
| Feature / launch flags | **`src/lib/feature-flags.ts`** (`PUBLIC_LAUNCH_FEATURES`, `CLIENT_CAPABILITY_FLAGS`, `ENTERPRISE_VALUE_FEATURES`) |
| Edition ranking / founding | **`src/lib/authz/editions.ts`** (re-exported via `entitlements.ts`) |

### 3.4 Lifecycle states

| Concern | Owner |
|---------|-------|
| Canonical states / transitions | **`src/lib/lifecycle/*`** (`states.ts`, `transitions.ts`, `map.ts`, `apply.ts`, `audit.ts`, `canvas-sections.ts`, `index.ts`) |
| Doc map | `docs/v2/lifecycle-status-map.md` |

No second lifecycle package found under `src/`.

### 3.5 Supabase clients and env names

| Client | File | Env |
|--------|------|-----|
| Browser / SSR user client | `src/integrations/supabase/client.ts` (**generated — do not edit**) | `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` with `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` fallback |
| Service-role admin | `src/integrations/supabase/client.server.ts` (**generated**) | `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` **or** `DB_SERVICE_ROLE_KEY` |
| Auth middleware | `src/integrations/supabase/auth-middleware.ts`, `auth-attacher.ts` | Generated |
| Types | `src/integrations/supabase/types.ts` | Generated — **not** live schema truth |
| Anon public catalog helper | `src/lib/supabase-public.server.ts` | `SUPABASE_URL` + publishable/anon key |
| **Ad-hoc clients (duplication)** | `src/lib/use-cases.functions.ts`, `collections.functions.ts`, `insights.functions.ts`, `og-image.server.ts`, `public-catalog.server.ts`, `sitemap-sources.server.ts`, several `api/public/*` routes | Create extra `createClient(...)` instead of always using integrations helpers |

### 3.6 Design tokens and theme

| Concern | Owner |
|---------|-------|
| Tokens + theme | **`src/styles.css`** (`@theme inline`, `:root`, `.dark`, oklch) |
| Reference copy (docs only) | `docs/reference/usecasesx-studio/...` — **ignored by lint**; not runtime |

No second production token file under `src/`.

### 3.7 Shared UI primitives

| Concern | Owner |
|---------|-------|
| Buttons, cards, inputs, etc. | **`src/components/ui/*`** (shadcn/Radix) |
| Empty | `src/components/EmptyState.tsx` |
| Loading | `src/components/LoadingSkeleton.tsx` (+ `ui/skeleton.tsx`) |
| Error | `src/components/ui-kit/ErrorState.tsx` |
| Stub / coming soon | `src/components/ModuleStub.tsx`, `src/components/ComingSoonGate.tsx` — **parallel “unavailable” primitives** (called out in older Phase B plans to consolidate) |

---

## 4. Generated and protected files (never hand-edit)

From `CLAUDE.md` / `AGENTS.md` / `docs/architecture/2026-07-25/high-risk-files.md`:

| Path | Reason |
|------|--------|
| `src/routeTree.gen.ts` | Router plugin generated |
| `src/integrations/supabase/client.ts` | Generated |
| `src/integrations/supabase/client.server.ts` | Generated |
| `src/integrations/supabase/auth-middleware.ts` | Generated |
| `src/integrations/supabase/auth-attacher.ts` | Generated |
| `src/integrations/supabase/types.ts` | Generated — stale vs live DB |
| `.env` | Secrets / Lovable Cloud managed |
| `supabase/config.toml` | Lovable Cloud managed |

Also treat as high-blast-radius (edit only with plan + tests): `src/router.tsx`, `src/server.ts`, `src/start.ts`, `src/routes/__root.tsx`, `src/routes/_app.tsx`, entitlement/permission surfaces listed in §3.

Reserved DB schemas (never touch): `auth`, `storage`, `realtime`, `supabase_functions`, `vault`.

---

## 5. Database

**No write access. No schema guessed from `types.ts` or migrations.**

Live DB was rebuilt from `docs/migration/full-schema.sql` plus later patches and is known to differ from both migrations and generated types.

### Operator action required

1. Run **`scripts/audit/db-snapshot.sql`** in the Supabase SQL editor (sections 01–12).
2. Export each result set as CSV into **`docs/refactor/db-snapshot/`** using the filenames listed in the SQL header.
3. Return here before any refactor prompt that claims schema knowledge.

**STOP for database:** awaiting your CSV dumps. Do not proceed with schema-dependent prompts until those files exist.

---

## 6. Migrations on disk (`supabase/migrations/`)

| # | Filename |
|---|----------|
| 1 | `20260907155028_fix_anon_read_use_cases.sql` |
| 2 | `20260907160000_anon_read_use_cases.sql` |
| 3 | `20260923120000_v2_04_versioned_core_model.sql` |
| 4 | `20260923140000_v2_05_evidence_foundation.sql` |
| 5 | `20260923160000_v2_06_opportunity_intake.sql` |
| 6 | `20260923180000_v2_08_solution_design.sql` |
| 7 | `20260923200000_v2_09_scoring_engine.sql` |
| 8 | `20260923220000_v2_10_decision_gates.sql` |
| 9 | `20260923240000_v2_11_governance_preview.sql` |
| 10 | `20260923260000_v2_12_dependencies_scenarios.sql` |
| 11 | `20260923280000_v2_14_roadmap_brief.sql` |
| 12 | `20260923300000_v2_15_workshop_mode.sql` |
| 13 | `20260923320000_v2_17_ai_feedback.sql` |
| 14 | `20260923340000_v2_18_enterprise_identity.sql` |
| 15 | `20260923360000_v2_19_content_governance.sql` |
| 16 | `20260923360100_v2_19_pattern_template_seed.sql` |
| 17 | `20260929120000_v2_19_anon_use_cases_column_grants.sql` |
| 18 | `20260929180000_founding_access_requests.sql` |

**Incomplete history:** folder is **not** a full history of the live DB (built from `docs/migration/full-schema.sql` + patches).

**Latest migration timestamp (every new migration must come after):**  
`20260929180000` → `20260929180000_founding_access_requests.sql`

---

## 7. Environment variables the code reads

### Client / Vite (`import.meta.env` — `VITE_` or DEV)

| Variable | Where | Client? |
|----------|-------|---------|
| `VITE_SUPABASE_URL` | `integrations/supabase/client.ts`, public catalog/sitemap helpers | Yes |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | same | Yes |
| `VITE_SUPABASE_PROJECT_ID` | committed `.env` / example (build) | Yes |
| `VITE_SITE_URL` | `src/lib/seo.ts` | Yes |
| `VITE_DEMO_PASSWORD` | `src/routes/demo-login.tsx` | Yes — **demo credential surface; treat carefully** |
| `VITE_PUBLIC_STUDIO_ENABLED` | `feature-flags.ts` | Yes |
| `VITE_PUBLIC_MY_USE_CASES_ENABLED` | `feature-flags.ts` | Yes |
| `VITE_PUBLIC_BOARDS_ENABLED` | `feature-flags.ts` | Yes |
| `VITE_PUBLIC_LIFECYCLE_ANALYTICS_ENABLED` | `feature-flags.ts` | Yes |
| `VITE_TENANCY_V2_ENABLED` | `feature-flags.ts` | Yes |
| `VITE_ENTERPRISE_NAVIGATION_V2_ENABLED` | `feature-flags.ts` | Yes (currently `true` on Lovable tip) |
| `VITE_ERP_BENEFIT_VERIFICATION` | `feature-flags.ts` | Yes |
| `VITE_CAPABILITY_*` | `feature-flags.ts` (opportunity map, workshop, stage gates, permission bundles, multi-entity, integrations, SSO, full audit) | Yes |
| `DEV` | various | Yes (Vite built-in) |

### Server-only (`process.env` — must not appear in client bundles)

| Variable | Where | Notes |
|----------|-------|-------|
| `SUPABASE_URL` | clients, server fns, seeds, e2e | Server + SSR |
| `SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_ANON_KEY` | server helpers | Publishable |
| `SUPABASE_SERVICE_ROLE_KEY` / `DB_SERVICE_ROLE_KEY` | `client.server.ts`, seeds, e2e | **Secret** |
| `LOVABLE_API_KEY` | AI gateway, email send | **Secret** |
| `LOVABLE_SEND_URL` | email | Server |
| `CRON_HOOK_SECRET` | `cron-auth.server.ts` | **Secret** |
| `AI_ENGINE_KEY_SECRET` | `engine-crypto.server.ts` | **Secret** |
| `FOUNDING_ACCESS_UNTIL` | `authz.server.ts` | Server |
| `CAPABILITY_*` (non-VITE) | `authz.server.ts` | Server mirrors of capability flags |
| `CYBERX_C3G_HANDOFF_URL` | governance server | Server |
| `ERP_BENEFIT_VERIFICATION` | erp-reconciliation.server | Server |
| `PUBLIC_API_CORS_ORIGINS` | hardening | Server |
| `ALERT_WEBHOOK_URL` | ops / email health | Server |
| `DEMO_PERSONA_PASSWORD` / `DEMO_ADMIN_PASSWORD` / `DEMO_SEED_PASSWORD` / `SMOKE_DEMO_PASSWORD` | demo/seed/e2e | **Secret-ish** |
| `SAMPLE_TENANT_PASSWORD` | sample-tenants seed | Secret-ish |
| `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD` / `SUPERADMIN_NAME` | create-superadmin | Secret |
| `AI_FAIR_USE_PER_USER_PER_DAY` / `AI_FAIR_USE_PER_WORKSPACE_PER_DAY` | fair-use | Server |
| `AI_BURST_PER_USER_PER_MINUTE` / `AI_BURST_PER_WORKSPACE_PER_MINUTE` | fair-use | Server |
| `NODE_ENV` | config.server | Server |
| `E2E_*` / `SMOKE_*` / `MONITOR_BASE_URL` / `GITHUB_*` / `CLOUDFLARE_*` / `LOVABLE_PROJECT_ID` / `PR_NUMBER` / `CORPUS_*` / `BASELINE_PER_INDUSTRY` / `PGBIN` | tests/scripts/CI | Non-runtime product |

### Flagged: server-only secret read from a client file?

| Finding | Status |
|---------|--------|
| `SUPABASE_SERVICE_ROLE_KEY` / `LOVABLE_API_KEY` / `CRON_HOOK_SECRET` / `AI_ENGINE_KEY_SECRET` imported in non-`.server` / non-generated client components | **None found** in this pass |
| `VITE_DEMO_PASSWORD` on `demo-login.tsx` | **Not a service-role secret**, but is a client-bundled credential — keep out of production builds |
| Ad-hoc `createClient(process.env.SUPABASE_*)` inside `.functions.ts` files that may be imported from client graphs | **Risk to review** in later prompts — prefer generated clients + middleware |

---

## 8. Input gap

**`docs/refactor/prompt-pack.md` was not present** at audit time. Part B cannot score individual pack prompts until that file is added. See `docs/refactor/pack-conflict-report.md`.
