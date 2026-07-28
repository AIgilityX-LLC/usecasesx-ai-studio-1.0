# Edition Capability Matrix (Canonical)

**Effective:** 14 August 2026 launch.
**Source of truth** for what each edition shows. Companion doc `docs/product/scope-2026-08-14/edition-capability-matrix.md` remains as the scope-lock snapshot; this file is the durable, canonically-referenced version and MUST stay in sync with it.

Legend: ✅ Live · 🚩 Feature-flagged / Coming Soon (visible, not live) · 🔒 Enterprise Design Partner only (contact-us) · — Not present.

## Public / Lite surface

| Capability                          | Lite       | Pro FA     | Enterprise DP |
| ----------------------------------- | ---------- | ---------- | ------------- |
| Landing `/`                         | ✅         | ✅         | ✅            |
| Discovery Wizard `/discover`        | ✅         | ✅         | ✅            |
| Global Repository `/repository`     | ✅         | ✅         | ✅            |
| Repository detail deep-dive         | 🚩 up-sell | ✅         | ✅            |
| Quick Wins Matrix `/quick-wins`     | ✅         | ✅         | ✅            |
| ROI Calculator `/roi-calculator`    | ✅         | ✅         | ✅            |
| Opportunity Submission `/submit`    | ✅         | ✅         | ✅            |
| Public collection share `/c/$token` | ✅         | ✅         | ✅            |
| Pricing `/pricing`, Auth `/auth`    | ✅         | ✅         | ✅            |
| Pattern Library `/patterns`         | 🚩 Q4 2026 | 🚩 Q4 2026 | 🚩            |

## Pro Founding Access surface

| Capability                                                  | Lite | Pro FA       | Enterprise DP |
| ----------------------------------------------------------- | ---- | ------------ | ------------- |
| Dashboard `/dashboard` (live KPIs)                          | —    | ✅           | ✅            |
| My Use Cases `/my-use-cases` (live rows)                    | —    | ✅           | ✅            |
| Boards `/boards*`                                           | —    | ✅           | ✅            |
| Compare tray `/compare`                                     | —    | ✅           | ✅            |
| Insights `/insights`                                        | —    | ✅           | ✅            |
| Studio hub `/ai-use-case-studio`, `/studio` (server drafts) | —    | ✅           | ✅            |
| Studio › Overview / Score                                   | —    | ✅           | ✅            |
| Studio › Feasibility (per use case)                         | —    | ✅ wired     | ✅            |
| Studio › Data Readiness (per use case)                      | —    | ✅ wired     | ✅            |
| Studio › Blueprint (per use case)                           | —    | ✅ read-only | 🔒 editor     |
| Studio › Deliverables + one export path                     | —    | ✅           | ✅            |
| Portfolio Roadmap `/studio/portfolio`                       | —    | ✅ live      | ✅            |
| Reports `/reports` (live data only)                         | —    | ✅           | ✅            |
| Fair-use meter (advisory)                                   | —    | ✅           | 🔒 enforced   |

## Coming Soon / Enterprise DP surface

| Capability                                                   | Lite | Pro FA          | Enterprise DP |
| ------------------------------------------------------------ | ---- | --------------- | ------------- |
| Studio › SARPI sub-tabs                                      | —    | 🚩 landing lock | 🔒            |
| Studio › AdvisorX                                            | —    | 🚩              | 🔒            |
| Studio › C3G Governance                                      | —    | 🚩              | 🔒            |
| RoadmapX `/roadmap`                                          | —    | 🚩              | 🔒            |
| Governance `/governance`, PortfolioX `/portfoliox`           | —    | redirect        | redirect      |
| Feasibility / Data Readiness / Blueprint top-level           | —    | delisted        | delisted      |
| `/decision`, `/impact-assessment`, `/api-integration`        | —    | hidden          | 🔒            |
| Advanced Enterprise roles, SSO, custom domains, audit export | —    | —               | 🔒            |

## Roles at launch

Workspace Owner · Workspace Admin · Contributor · Viewer · Facilitator.
Advanced Enterprise roles are reserved and gated behind feature flags.

## Enforcement rules

1. Every UI gate resolves through `useEntitlement` / `usePlan` / `<RequirePlan>` / `<Can>`.
2. Every server function re-checks the claim via `context.supabase` + `has_role()` — never trusts the client.
3. Coming Soon surfaces use `ComingSoonGate` or equivalent primitive. No live claim in any 🚩 or 🔒 row.
4. No route may be linked in nav that resolves to a stubbed page without a Coming Soon marker.
