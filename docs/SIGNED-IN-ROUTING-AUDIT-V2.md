# Signed-in Routing Audit — V2

Covers every navbar item across both navigation surfaces (signed-out top nav
and signed-in sidebar), now including the **Home** and **Resources** pages, and
maps each item to the exact layout wrapper it renders inside.

All app pages live under the `_app` pathless layout (`src/routes/_app.tsx`),
which renders `SiteShell`. `SiteShell` chooses the layout from a single auth
hook (`useSupabaseSession`):

- **Signed-out** → top nav (`<nav aria-label="Primary">`) + footer.
- **Signed-in** → sidebar (`AppSidebar`, `role="navigation"`) + header + footer.

The Home route (`/`) is the only page that mounts `SiteShell` itself
(`src/routes/index.tsx`); every other page inherits it from `_app`.

## Top navigation (signed-out surface)

| Nav item | Target | Resolved URL | Layout wrapper | Redirect? |
|---|---|---|---|---|
| Home | `/` | `/` | SiteShell (top nav, via index.tsx) | no |
| Explore | `/repository` | `/repository` | SiteShell (top nav) | no |
| Insights | `/insights` | `/insights` | SiteShell (top nav) | no |
| Patterns | `/patterns` | `/patterns` | SiteShell (top nav) | no |
| Studio | `/ai-use-case-studio` | `/ai-use-case-studio` | SiteShell (top nav) | no |
| Resources | `/resources` | `/resources` | SiteShell (top nav) | no |
| Pricing | `/pricing` | `/pricing` | SiteShell (top nav) | no |

## Sidebar navigation (signed-in surface)

| Nav item | Target | Resolved URL | Layout wrapper | Redirect? |
|---|---|---|---|---|
| Dashboard | `/dashboard` | `/profile` | _app (sidebar) | yes (expected) |
| Global Repository | `/repository` | `/repository` | _app (sidebar) | no |
| Deployment Intelligence | `/insights` | `/insights` | _app (sidebar) | no |
| AI Use Case Studio | `/studio` | `/studio` | _app (sidebar) | no |
| My Use Cases | `/my-use-cases` | `/my-use-cases` | _app (sidebar) | no |
| Use Case Boards | `/boards` | `/boards` | _app (sidebar) | no |
| Pattern Library | `/patterns` | `/patterns` | _app (sidebar) | no |
| Feasibility Scoring | `/feasibility` | `/studio` | _app (sidebar) | yes (expected) |
| Data Readiness | `/data-readiness` | `/studio` | _app (sidebar) | yes (expected) |
| Blueprint Builder | `/blueprint` | `/studio` | _app (sidebar) | yes (expected) |
| Portfolio Roadmap | `/roadmap` | `/roadmap` | _app (sidebar) | no |
| SARPI Readiness | `/sarpi` | `/sarpi` | _app (sidebar) | no |
| AdvisorX Guidance | `/advisorx` | `/advisorx` | _app (sidebar) | no |
| C3G Governance | `/cyberx/c3g/intake` | `/cyberx/c3g/intake` | _app (sidebar) | no |
| Reports | `/reports` | `/profile` | _app (sidebar) | yes (expected) |
| Admin Panel | `/administration` | `/administration` | _app (sidebar) | no |

## Cross-surface shared destinations (Home + Resources)

| Page | Top nav layout | Sidebar layout | Single navbar? | Dark hero? |
|---|---|---|---|---|
| Home (`/`) | SiteShell top nav | SiteShell sidebar | yes | yes (image hero band) |
| Resources (`/resources`) | SiteShell top nav | SiteShell sidebar | yes | yes (`PageHero tone="dark"`) |

## Notes

- 0% duplicate navbars: every route renders exactly one navigation landmark,
  enforced by the dev-only `__siteShellCount` guard and `tests/navbar.spec.ts`.
- Expected redirects are codified in `EXPECTED_REDIRECTS`
  (`src/lib/nav-integrity.ts`); the integrity check flags any redirect not in
  that map as drift.
- Hero tone + main landmark for Home and Resources are asserted in
  `tests/navbar.spec.ts` ("page hero tone + main landmark").
