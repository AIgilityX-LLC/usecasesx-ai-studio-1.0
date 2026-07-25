# UX / a11y recommendations — 2026-07-25

Prioritised backlog. Effort = S (≤½ day) · M (½–2 days) · L (>2 days).
Cross-references: **RRD** = `docs/audit/2026-07-25/retain-repair-defer-matrix.md`,
**DEBT** = `docs/architecture/2026-07-25/tech-debt-register.md`.

## P0 — must land before 14 August

| Ref  | Recommendation                                                                                      | Files likely to change                                                     | Effort | Acceptance                                                                                                    | Cross-ref            |
| ---- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------- | -------------------- |
| P0-1 | Populate `/repository` — publish curated `use_cases` OR restore vetted mock set behind a launch flag | `src/lib/usecasex.data.ts`, `src/routes/_app.repository.tsx`, seed script | M      | Signed-out user sees ≥12 cards on first paint; sample-data disclaimer moved above grid.                        | RRD U1, U2           |
| P0-2 | Fix home mobile hero horizontal overflow (413 → 390)                                                | `src/routes/index.tsx` (hero block)                                        | S      | `document.scrollWidth === window.innerWidth` at 360/390/430 px; `<h1>` visible in full or wraps cleanly.       | —                    |
| P0-3 | Investigate `/pricing` desktop navigation flap                                                       | `src/routes/_app.pricing.tsx`                                              | S      | No unmount/redirect between DOMContentLoaded and 1500 ms; focus stays on the intended landmark.                | —                    |
| P0-4 | Add semantic `<h1>` to `/studio/portfolio`, `/my-use-cases`, `/dashboard`                            | Same three route files                                                     | S      | Each route has exactly one `<h1>` announcing the page purpose.                                                 | A11Y-C3              |
| P0-5 | Label the four unlabeled controls (`/repository` search + sort; `/auth` email + password)            | `src/components/usecasex/HorizontalFilters.tsx`, `src/routes/auth.tsx`     | S      | axe-core reports 0 "form field must have label" violations on `/repository` and `/auth`.                      | A11Y-C1, A11Y-C2     |

**P0 rollback**: each fix is a small isolated PR; revert the touched route
files to restore prior behaviour. No DB or config coupling.

## P1 — pre-launch polish (nice-to-have but not blocking)

| Ref  | Recommendation                                                                                       | Files likely to change                                              | Effort | Acceptance                                                                                          |
| ---- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------- |
| P1-6 | Signed-out `/my-use-cases`, `/dashboard`, `/studio/portfolio` redirect to `/pro` with contextual copy | `src/components/RequireAuth.tsx` (or per-route redirect + `/pro`)  | S      | Signed-out user sees "Sign in to access …" instead of an unexplained pricing page.                  |
| P1-7 | Demote `/advisorx` from primary nav or badge as "Roadmap"                                            | `src/components/AppSidebar.tsx`, `src/components/SiteShell.tsx`     | S      | Coming-soon surfaces are not primary nav items; footer or "Roadmap" section instead.                |
| P1-8 | Verify mobile hamburger accessible name + ≥44×44 tap target                                          | `src/components/SiteShell.tsx`                                      | S      | `aria-label="Open menu"`, `min-h-11 min-w-11`; visible above the fold on `/`.                       |
| P1-9 | Empty-state polish on `/repository` (wire `EmptyState`, move disclaimer above grid)                   | `src/routes/_app.repository.tsx`, `src/components/EmptyState.tsx`   | S      | Zero-row state uses `EmptyState` component; disclaimer precedes the grid.                            |
| P1-10 | Studio → next-step banner after board creation                                                       | `src/routes/_app.studio.use-case.$id.index.tsx`                     | M      | First-run empty board shows "Add your first structured step" CTA linking to the next journey step.  |

## P2 — post-launch

| Ref  | Recommendation                                                                        | Effort | Notes                                                                             |
| ---- | ------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------- |
| P2-1 | Tap-target audit (chip filters, inline icon buttons) — bump to `min-h-11 min-w-11`   | M      | Global sweep; verify on both dark theme + focus ring visibility.                  |
| P2-2 | Wire axe-core Playwright scan into `bun run test:e2e`                                | M      | Baseline current violations; block regressions in CI.                             |
| P2-3 | Swap `h-screen` → `h-dvh` in full-height layouts                                     | S      | Fixes mobile-browser chrome bounce.                                               |
| P2-4 | Add `aria-live="polite"` region for filter changes and "0 results"                   | S      | Announce count on `/repository` and `/discover` result changes.                   |
| P2-5 | Contrast audit with a tool (axe / Lighthouse) against the amber-on-navy palette      | S      | Confirm all button text meets AA on both light and dark surfaces.                 |
| P2-6 | Extract page-title slot into `_app` shell so signed-in routes get an `<h1>` for free | M      | Structural fix that removes future recurrences of A11Y-C3.                        |

## Not doing (out of scope)

- Full redesign or brand refresh (guardrail).
- Rebuilding navigation IA — only prune Coming Soon items.
- Rewiring authentication or entitlement checks — see PROMPT-05.

## Recommended next prompt

**PROMPT-10** — implement P0-2 through P0-5 in one PR (all
frontend-only, no DB), then a separate PR for P0-1 (data source truth
for `/repository`).
