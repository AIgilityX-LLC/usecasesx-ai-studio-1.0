# Metrics, Activation Events, Quality Bars, Defect Policy, Freeze

## North-star

Weekly active Pro users completing the full journey: **use case → score → portfolio → export**.

## Activation events

Client + server logged. Additive `activation_events` table proposed (P1-11).

| Event                       | Fired when                                          |
| --------------------------- | --------------------------------------------------- |
| `visitor_repository_filter` | Anonymous visitor applies a filter on `/repository` |
| `visitor_submit`            | `/submit` form successfully creates a row           |
| `pro_signup`                | New Pro account created                             |
| `pro_first_use_case`        | First `use_cases` row for the user                  |
| `pro_first_score`           | First `use_case_scores` row for the user            |
| `pro_first_portfolio_add`   | First `portfolio_items` row for the user            |
| `pro_first_export`          | First deliverable export completed                  |
| `pro_advisory_intent_click` | Click on "Contact us for Enterprise" / Advisory CTA |

## Quality bars (launch gates)

- **Performance:** LCP < 2.5s on `/`, `/repository`, `/dashboard` (throttled Fast 3G, mid-tier device).
- **Accessibility:** 0 critical axe violations on launch routes; keyboard + focus verified.
- **Responsive:** no horizontal overflow 360–1920 px on launch routes.
- **Data truth:** 0 references to `MOCK_USE_CASES` (or equivalent) on any Pro route.
- **Security:** `bun run test:rls` green; every new table has GRANT + RLS in same migration.
- **SEO:** unique `head()` per content route; titles < 60, descriptions < 160.
- **Nav integrity:** `bun run check:nav-integrity` green; zero dead CTAs.

## Defect policy

| Priority | Definition                                                                                  | SLA                         |
| -------- | ------------------------------------------------------------------------------------------- | --------------------------- |
| **P0**   | Launch blocker: broken core journey, security/RLS failure, mock data on Pro route, dead nav | Same-day fix                |
| **P1**   | Required outcome: measurable role outcome not met, quality bar failed                       | Fix before 12 Aug QA freeze |
| **P2**   | Post-launch: polish, terminology, refactor                                                  | Deferred register           |

Every P1 must record **Outcome + Dependency + Owner** in `backlog-p0-p1-p2.md`.

## Freeze gates

| Date       | Gate                | Rule                                                |
| ---------- | ------------------- | --------------------------------------------------- |
| 30 Jul     | Foundations freeze  | P0-3, P0-6, P0-7, P0-8 done; no new infra items     |
| 3 Aug      | Core journey freeze | All P0 done                                         |
| **9 Aug**  | **Feature freeze**  | No new features; only P0/P1 defect fixes            |
| 12 Aug     | QA freeze           | Only P0 fixes; every change re-runs full test suite |
| **13 Aug** | **Code freeze**     | Publish candidate; docs + rollback only             |
| 14 Aug     | Launch              | Publish to production                               |

## Scope-change control

Any addition after 9 Aug requires: (1) written override in `../20-day-release-board.md` decision log, (2) PR touching `README.md` sign-off table + `deferred-register.md`. Deferred register is append-only.
