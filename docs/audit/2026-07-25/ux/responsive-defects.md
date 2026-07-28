# Responsive defects — 2026-07-25

Playwright sweep at two viewports. Evidence: `/tmp/browser/ux/*.png`.
Metrics captured per route: `<h1>` count, `<main>` count, heading order
skips, missing `alt`, icon buttons w/o accessible name, unlabeled form
controls, horizontal overflow.

| Route                 | Desktop 1280                                                                                                                        | Mobile 390                                                                                                                    |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `/`                   | Clean                                                                                                                               | **Overflow: scrollWidth 413 > 390.** Hero `<h1>` clipped mid-word ("Before You Spend a Dollar Buil…"). See `mobile_home.png`. |
| `/discover`           | Clean                                                                                                                               | Clean                                                                                                                         |
| `/repository`         | Grid renders **0 cards**; 2 unlabeled form controls (search, sort). See `desktop_repository.png`.                                   | 0 cards; 2 unlabeled controls; layout otherwise responsive.                                                                   |
| `/ai-use-case-studio` | Clean                                                                                                                               | Clean                                                                                                                         |
| `/studio/portfolio`   | **No `<h1>`.** Layout OK.                                                                                                           | Redirects signed-out users.                                                                                                   |
| `/roadmap`            | Clean                                                                                                                               | Clean                                                                                                                         |
| `/advisorx`           | Clean (Coming Soon)                                                                                                                 | Clean                                                                                                                         |
| `/pricing`            | **Navigation flap** — page unmounts mid-render (evaluation context destroyed). Likely unresolved redirect / `<Navigate>` in effect. | Renders cleanly (no flap observed at 390 px).                                                                                 |
| `/auth`               | 2 unlabeled inputs (placeholder-only email/password).                                                                               | Same.                                                                                                                         |
| `/my-use-cases`       | **No `<h1>`.** Signed-out redirect on mobile bypasses this.                                                                         | Redirects to `/pro`.                                                                                                          |
| `/dashboard`          | **No `<h1>`.** Same.                                                                                                                | Redirects to `/pro`.                                                                                                          |
| `/pro`                | Clean                                                                                                                               | Clean                                                                                                                         |

## Defect list (severity → route → detail)

### P0 (launch-blocking)

- **RESP-1** `/` mobile: hero row overflows viewport horizontally. Apply
  the `grid-cols-[minmax(0,1fr)_auto]` + `min-w-0` + `truncate` pattern
  from `responsive-layout-patterns`, or shorten the `<h1>` line for
  narrow widths. **Evidence**: `mobile_home.png`, scrollWidth 413 vs 390.
- **RESP-2** `/pricing` desktop: navigation flap mid-render.
  Investigate the route for an unresolved redirect or a `<Navigate>` in
  a client-side effect. Users clicking Pricing must not experience a
  flash-then-jump.

### P1 (pre-launch polish)

- **RESP-3** `/repository`: filter chips are horizontally scrollable
  on desktop but stack awkwardly on mobile; verify chip row does not
  clip when 5+ filters are active.
- **RESP-4** Mobile nav discoverability on `/`: only "UX" monogram and
  "Join Waitlist" visible above the fold. Confirm hamburger trigger
  has an accessible name and is ≥44×44 px.
- **RESP-5** Repository "empty state" sequence: sample-data disclaimer
  appears below an empty grid; move above the grid and render a
  purpose-built `EmptyState` when 0 rows are returned.

### P2 (post-launch)

- Tap-target audit on chip filters and inline icon buttons
  (`size="icon"` = 36 px; bump to `min-h-11 min-w-11` on touch surfaces).
- Wide data tables (admin surfaces) — verify horizontal scroll wrapper
  vs stacked-card at narrow widths.
- Verify modals (`AddToStudioBoardDialog`, `LeadCaptureModal`) trap
  focus and are dismissible with Escape on all viewports.

## Re-run instructions

```bash
python3 /tmp/browser/ux/audit.py
# Screenshots land in /tmp/browser/ux/{desktop,mobile}_<slug>.png
```
