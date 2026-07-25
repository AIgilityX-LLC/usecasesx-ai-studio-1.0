# Accessibility gaps — 2026-07-25

Grouped per the accessibility skill (Critical / Warning / Info).
Automated pass via Playwright + DOM introspection; findings should be
re-verified with axe-core or Lighthouse in a follow-up prompt.

## Critical (blocks users)

| Ref     | Where                                                          | Issue                                                                                     | Why it matters                                                                          |
| ------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| A11Y-C1 | `/repository` — search input + sort select                     | Two form controls have no associated `<label>` / `aria-label` / `aria-labelledby`.        | Screen readers announce "edit" / "combobox" with no purpose. Fails WCAG 3.3.2.          |
| A11Y-C2 | `/auth` — email + password fields                              | Placeholder-only labels.                                                                  | Autofill labels missing; placeholders disappear on focus. Fails WCAG 3.3.2.             |
| A11Y-C3 | `/studio/portfolio`, `/my-use-cases`, `/dashboard`             | **No `<h1>` on the page**; page headers are `<h2>`.                                       | Screen readers have no primary title; SEO of signed-in shell weakened.                  |

## Warning (degrades experience)

| Ref     | Where                              | Issue                                                                             | Why it matters                                                       |
| ------- | ---------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| A11Y-W1 | Home mobile hero                   | `<h1>` clipped by horizontal overflow (not truncated, actually cut off visually). | Users on 360–393 px devices see "Before You Spend a Dollar Buil…".   |
| A11Y-W2 | Mobile nav on `/`                  | Hamburger trigger discoverability unverified; needs `aria-label` + ≥44×44 px.     | Sole navigation surface on small screens.                            |
| A11Y-W3 | `/pricing` desktop navigation flap | Unexpected route change without user action.                                      | Disorients keyboard + screen-reader users; loses focus context.      |
| A11Y-W4 | `/advisorx` Coming Soon page       | Listed in primary nav.                                                            | Dead-end for first-time visitors; wastes cognitive load.             |
| A11Y-W5 | Repository empty state             | Empty grid with sample-data notice *below* — users read blank canvas first.       | Ambiguous whether the app is broken or empty.                        |

## Info (best practice)

- **A11Y-I1** `use-mobile.tsx` sets `h-screen` in a few surfaces
  (audit with `rg 'h-screen' src/`) — swap to `h-dvh` for mobile browser
  chrome correctness.
- **A11Y-I2** No `aria-live` region announces "0 results" on
  `/repository` filter changes.
- **A11Y-I3** Verify decorative images (hero background, logos) use
  `alt=""` rather than a semantic description.
- **A11Y-I4** Redundant `role="button"` checks on custom card links.
- **A11Y-I5** No `lang` attribute audit yet on `<html>` — verify set to
  `en` in `__root.tsx`.
- **A11Y-I6** Focus-visible outlines on Radix primitives are inherited
  from shadcn defaults (OK), but hand-rolled anchor-as-card wrappers
  should be spot-checked.

## Aggregate counts (automated pass, 2026-07-25)

| Metric                                    | Desktop total | Mobile total |
| ----------------------------------------- | ------------- | ------------ |
| Missing `alt` attributes                  | 0             | 0            |
| Icon buttons without accessible name      | 0             | 0            |
| Unlabeled form controls                   | 4             | 4            |
| Pages missing `<h1>`                      | 3             | 0¹           |
| Pages with heading-level skips (h1→h3+)   | 0             | 0            |
| Pages with multiple `<main>`              | 0             | 0            |

¹ Signed-out users are redirected before the page renders on mobile.

## Recommended follow-up automation

- Add an axe-core Playwright scan for `/`, `/repository`, `/discover`,
  `/pricing`, `/auth`, `/pro` and record baseline violations.
- Wire the scan into `bun run test:e2e` so regressions are caught.
