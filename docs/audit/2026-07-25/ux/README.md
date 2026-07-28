# UX + accessibility audit — 2026-07-25

Read-only usability and accessibility review of the AIgilityX UseCasesX™
preview before the 14 August 2026 Lite + Pro Founding Access launch.
No code, content, DB or config was changed.

## Contents

1. [`journey-audit.md`](./journey-audit.md) — core journey walkthrough with
   abandonment-risk ratings and time-to-value estimates.
2. [`responsive-defects.md`](./responsive-defects.md) — per-route desktop
   (1280) vs mobile (390) findings with screenshot references.
3. [`a11y-gaps.md`](./a11y-gaps.md) — Critical / Warning / Info groupings
   following the accessibility skill.
4. [`recommendations.md`](./recommendations.md) — P0 / P1 / P2 backlog with
   files, effort and acceptance criteria.

## Headline findings

**P0 (launch-blocking)**

- `/repository` returns 0 use cases — anchor journey blocked.
- Home hero clips on mobile (scrollWidth 413 > 390 px).
- `/pricing` desktop navigation flap.
- Three Pro surfaces have no `<h1>`.
- Four unlabeled form controls (`/repository`, `/auth`).

**P1 (polish)** — Coming-soon nav item, empty-state sequencing,
mobile hamburger accessibility, signed-out redirect copy.

**P2 (post-launch)** — Tap targets, `h-dvh`, `aria-live` regions,
axe-core CI, contrast tool sweep.

## Evidence

- Playwright script: `/tmp/browser/ux/audit.py`
- Screenshots: `/tmp/browser/ux/{desktop,mobile}_<slug>.png`

Reproduce with:

```bash
python3 /tmp/browser/ux/audit.py
```

## Guardrails honoured

- No code, content or config changes.
- No DB or migration change.
- Brand direction preserved.
- Findings cross-referenced to `retain-repair-defer-matrix.md` and
  `tech-debt-register.md` rather than duplicated.

## Recommended next prompt

**PROMPT-10** — implement P0-2 through P0-5 in one frontend-only PR, then
a separate PR for P0-1 (data source truth for `/repository`).
