# Signed-In Routing Audit — V3

_Generated for the PageHero rollout + navigation-integrity pass._

This audit maps **every** top-navigation and sidebar item to the exact
`SiteShell` layout wrapper used when a user is authenticated. All signed-in
routes live under the `_app` route group, which mounts `<SiteShell>`. When
`useSupabaseSession` resolves a session, `SiteShell` renders the **sidebar
layout** (`AppSidebar` + `main#main-content`); when signed-out it renders the
**top-nav layout** (`TOP_NAV` + `main#main-content`). There is always exactly
one navbar per page (enforced by `window.__siteShellCount` in dev and the
Playwright single-navbar spec).

## Layout wrapper legend

| Wrapper               | Description                                                             |
| --------------------- | ----------------------------------------------------------------------- |
| `SiteShell → Sidebar` | `AppSidebar` rail + breadcrumb header + `main#main-content` (signed-in) |
| `SiteShell → TopNav`  | `TOP_NAV` bar + `main#main-content` (signed-out fallback)               |

## Top navigation (`TOP_NAV` in `SiteShell.tsx`)

| Label     | Target                | Resolves to                  | Signed-in wrapper   | Hero tone |
| --------- | --------------------- | ---------------------------- | ------------------- | --------- |
| Home      | `/`                   | `src/routes/index.tsx`       | SiteShell → Sidebar | dark      |
| Explore   | `/repository`         | `_app.repository`            | SiteShell → Sidebar | dark      |
| Insights  | `/insights`           | `_app.insights`              | SiteShell → Sidebar | dark      |
| Patterns  | `/patterns`           | `_app.patterns` (ModuleStub) | SiteShell → Sidebar | dark      |
| Studio    | `/ai-use-case-studio` | `_app.ai-use-case-studio`    | SiteShell → Sidebar | dark      |
| Resources | `/resources`          | `_app.resources`             | SiteShell → Sidebar | dark      |
| Pricing   | `/pricing`            | `_app.pricing`               | SiteShell → Sidebar | dark      |

## Sidebar — Core (`CORE` in `AppSidebar.tsx`)

| Label                   | Target          | Resolves to                       | Wrapper             | Hero tone |
| ----------------------- | --------------- | --------------------------------- | ------------------- | --------- |
| Dashboard               | `/dashboard`    | `_app.dashboard` (PlatformBanner) | SiteShell → Sidebar | banner    |
| Global Repository       | `/repository`   | `_app.repository`                 | SiteShell → Sidebar | dark      |
| Deployment Intelligence | `/insights`     | `_app.insights`                   | SiteShell → Sidebar | dark      |
| AI Use Case Studio      | `/studio`       | `_app.studio`                     | SiteShell → Sidebar | dark      |
| My Use Cases            | `/my-use-cases` | `_app.my-use-cases`               | SiteShell → Sidebar | dark      |
| Use Case Boards         | `/boards`       | `_app.boards.index`               | SiteShell → Sidebar | dark      |
| Pattern Library         | `/patterns`     | `_app.patterns`                   | SiteShell → Sidebar | dark      |

## Sidebar — Studio / Pro (`STUDIO_PRO`)

| Label               | Target                           | Resolves to                            | Wrapper             | Hero tone |
| ------------------- | -------------------------------- | -------------------------------------- | ------------------- | --------- |
| Feasibility Scoring | `/feasibility`                   | `_app.feasibility` (redirect → studio) | SiteShell → Sidebar | dark      |
| Data Readiness      | `/data-readiness`                | `_app.data-readiness`                  | SiteShell → Sidebar | dark      |
| Blueprint Builder   | `/blueprint`                     | `_app.blueprint`                       | SiteShell → Sidebar | dark      |
| Portfolio Roadmap   | `/roadmap` → `/studio/portfolio` | `_app.studio.portfolio`                | SiteShell → Sidebar | dark      |

## Sidebar — Integrations (`INTEGRATIONS`)

| Label             | Target               | Resolves to                               | Wrapper             | Hero tone   |
| ----------------- | -------------------- | ----------------------------------------- | ------------------- | ----------- |
| SARPI Readiness   | `/sarpi`             | `_app.studio.use-case.$id.sarpi`          | SiteShell → Sidebar | module hero |
| AdvisorX Guidance | `/advisorx`          | `_app.studio.use-case.$id.advisorx`       | SiteShell → Sidebar | module hero |
| C3G Governance    | `/cyberx/c3g/intake` | `_app.studio.use-case.$id.c3g-governance` | SiteShell → Sidebar | module hero |

## Sidebar — Admin (`ADMIN`)

| Label       | Target            | Resolves to           | Wrapper             | Hero tone |
| ----------- | ----------------- | --------------------- | ------------------- | --------- |
| Reports     | `/reports`        | `_app.reports`        | SiteShell → Sidebar | dark      |
| Admin Panel | `/administration` | `_app.administration` | SiteShell → Sidebar | dark      |

## Additional signed-in destinations (linked from in-page actions)

| Target        | Resolves to                    | Wrapper             | Hero tone       |
| ------------- | ------------------------------ | ------------------- | --------------- |
| `/compare`    | `_app.compare`                 | SiteShell → Sidebar | dark (PageHero) |
| `/profile`    | `_app.profile`                 | SiteShell → Sidebar | dark (PageHero) |
| `/portfoliox` | redirect → `/studio/portfolio` | SiteShell → Sidebar | dark            |

## Findings

- **100% single-navbar compliance.** Every navbar and sidebar item resolves
  inside the `_app` group, so the signed-in sidebar wrapper is the sole layout.
- **Hero coverage complete.** `/compare`, `/reports`, and `/studio/portfolio`
  now use the dark `PageHero` primitive followed by an alternating lighter
  `bg-secondary/40` band, matching the rest of the catalog.
- **No unexpected redirects.** `/roadmap`, `/portfoliox`, and `/feasibility`
  redirects are declared in `EXPECTED_REDIRECTS` (`src/lib/nav-integrity.ts`).
