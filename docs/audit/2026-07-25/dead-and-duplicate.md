# Dead, Placeholder, Duplicate & Orphan Findings — 25 July 2026

## Sidebar items whose target is only a redirect or stub

| Sidebar label | Target | Actual | Recommendation |
|---|---|---|---|
| Feasibility Scoring | `/feasibility` | `redirect → /studio` | Delist; use per-use-case route. |
| Data Readiness | `/data-readiness` | `redirect → /studio` | Delist. |
| Blueprint Builder | `/blueprint` | `redirect → /studio` | Delist. |
| Portfolio Roadmap | `/roadmap` | `ComingSoonGate` | Keep with clear "Coming" label OR link to `/studio/portfolio`. |
| Pattern Library | `/patterns` | `ModuleStub` | Label "Q4 2026". |
| AdvisorX Guidance | `/advisorx` | Coming Soon | Keep, ensure entitlement lock messaging. |
| C3G Governance | `/cyberx/c3g/intake` | Coming Soon | Keep, ensure entitlement lock messaging. |
| Reports | `/reports` | Live UI on **mock** data | **P0** — switch to live data before launch. |

## Mock / hard-coded data still reaching Pro surfaces

- `_app.my-use-cases.tsx` imports `MOCK_USE_CASES` (`src/lib/usecasex.mock`) and drives the whole page from it.
- `_app.reports.tsx` imports `MOCK_USE_CASES` for scoring & report previews.
- `MockUseCaseCard.tsx` is used on the Studio landing.
- `usecasex.studio.store` and `usecasex.compare.store` persist only in `localStorage` — not visible cross-device.

## Duplicate primitives

- `ComingSoonGate` (`/roadmap`, `/decision`) and `ModuleStub` (`/patterns`, `/impact-assessment`) are near-identical marketing-of-absence blocks. Consolidate post-launch.
- Top-level `/feasibility`, `/data-readiness`, `/blueprint`, `/governance`, `/portfoliox` are all `beforeLoad → redirect` shims. Retain only the ones still linked externally; delist the rest from nav.

## Orphan routes (exist, not in sidebar or top nav)

| Path | Notes |
|---|---|
| `/decision` | Stub only. Defer. |
| `/impact-assessment` | Stub only. Defer. |
| `/api-integration` | Marketing preview for suite integration; not linked. |
| `/module-analytics` | Admin-relevant; add to Admin sidebar. |
| `/entitlement` | Debug page; restrict to admins + `noindex`. |
| `/sectors/$sector` | Reachable from Discover only via slug guess. Verify. |
| `/segments/$segment` | Same as above. |

## Terminology inconsistencies

- "Portfolio Roadmap" (`sidebar`) vs "RoadmapX™" (`/roadmap` head) vs "Portfolio" (`/studio/portfolio`). Pick one label per surface.
- "Deployment Intelligence" (`/insights`) vs "Insights" — reconcile in nav.
- "AI Use Case Studio" (`/studio`) vs "AIgilityX AI Use Case Studio™" (`/ai-use-case-studio`) — two entry points; clarify hierarchy.

## Accessibility / state gaps (spot-check)

- `/studio/portfolio`: loading + empty states present, error state minimal.
- `/reports`: no loading state (renders instantly from mock).
- `/my-use-cases`: no signed-out redirect path documented in file (relies on shell).
- `/insights`: `usePlan` gate visible, but no skeleton while plan resolves.

## Dead CTAs (visual)

None outright broken were found in the read-only scan. Verification requires
browser walk-through in the next prompt; candidates to check are Report
"Send to advisor" buttons in `/reports` and "Add to Portfolio" in
`/my-use-cases` (both wired against mock rows today).
