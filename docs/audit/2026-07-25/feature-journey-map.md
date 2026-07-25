# Feature ↔ Journey Map — 25 July 2026

Ratings are 0 / 25 / 50 / 75 / 100. **UI** = interface completeness.
**Data** = live backend & correct state coverage. Both must be ≥75 to call
a stage launch-ready.

| Journey stage | Primary route(s) | Supporting components | UI | Data | Gap statement |
|---|---|---|---:|---:|---|
| **Discover** | `/repository`, `/discover`, `/`, `/segments/$segment`, `/sectors/$sector` | `HorizontalFilters`, `UseCaseCard`, `PageHero` | 90 | 85 | Segment/sector deep pages are orphan; otherwise launch-ready. |
| **Capture Opportunity** | `/submit`, `/quick-wins`, `/roi-calculator` | `AdminUseCaseForm`, `LeadCaptureModal` | 80 | 75 | Submissions reach `use_case_submissions`; no user feedback loop on triage state. |
| **Design (Studio)** | `/studio`, `/ai-use-case-studio`, `/studio/use-case/$id/*` | `usecasex.studio.store` (local), `StudioProviders` | 60 | 35 | Drafts persist only in local storage; per-use-case detail lacks persistence + Pro flows are placeholders. |
| **Score** | `/studio/use-case/$id/feasibility`, `.../data-readiness`, `ScoreCard`, `usecasex.store` | `feasibility_scores`, `data_readiness_assessments`, `use_case_scores` | 55 | 45 | Score tables exist and are RLS-covered; per-use-case Pro pages are incomplete UIs on top of them. Top-level `/feasibility` etc. redirect to `/studio`. |
| **Prioritize** | `/my-use-cases`, `/quick-wins`, `/compare` | `computeTotalScore`, `compareStore` | 75 | 30 | `/my-use-cases` reads `MOCK_USE_CASES` + local store — not live saved rows despite `saved_use_cases` table existing. |
| **Portfolio** | `/studio/portfolio`, `/portfoliox` (redirect) | `PortfolioCard`, `portfolios`/`portfolio_items` | 60 | 55 | Live tables + gate, but empty-state and workflows are thin. |
| **Roadmap** | `/roadmap` (Coming Soon), `/studio/portfolio` timeline | — | 10 | 0 | No real roadmap surface for launch. |
| **Export** | `/reports`, PDF export in `_app.compare.tsx` | `ReportPreview`, `deliverables.export` | 65 | 25 | `/reports` runs entirely on `MOCK_USE_CASES`; PDF flows exist but aren't wired to live portfolios. |
| **Advisory** | `/advisorx`, `/studio/use-case/$id/advisorx`, `/sarpi`, `/cyberx/c3g/intake` | `EntitlementLockCard` | 35 | 20 | Top-level `/advisorx` and `/cyberx/c3g/intake` are Coming Soon; `/sarpi` is a landing with entitlement gate; per-use-case Pro pages are incomplete. |

## Data-source truth flags

- `MOCK_USE_CASES` still consumed by: `_app.my-use-cases.tsx`, `_app.reports.tsx`, `MockUseCaseCard.tsx`.
- Local-only storage (no DB writes): `usecasex.studio.store`, `usecasex.compare.store`.
- Live-only surfaces (safe): `/repository`, `/discover`, `/quick-wins`, `/boards*`, `/submit`, `/administration`, admin panels, `/insights` (via server fn).

## Launch-readiness verdict per stage

| Stage | Launch-ready for 14 Aug? |
|---|---|
| Discover | ✅ (orphans hidden) |
| Capture | ✅ minor polish |
| Design | ⚠️ needs Studio persistence |
| Score | ⚠️ needs Pro pages complete OR feature-flag off |
| Prioritize | ⚠️ **must** move `/my-use-cases` to live `saved_use_cases` |
| Portfolio | ⚠️ empty/loading/error states + polish |
| Roadmap | ❌ defer with clear "Coming August" |
| Export | ⚠️ `/reports` must consume live data or be gated |
| Advisory | ❌ keep as Coming Soon; do not claim live |
