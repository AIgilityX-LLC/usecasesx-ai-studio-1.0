# Release notes — Lite + Pro Founding Access (14 August 2026)

**Candidate: `v1.0.0-rc.1`** · release marker `release/2026-08-14` · scope frozen 11 August 2026.
Candidate record: `docs/release/release-candidate-2026-08-14.md`. Migration manifest:
`docs/release/migration-manifest-2026-08-14.md`. Change control:
`docs/process/change-freeze-2026-08-14.md`.

Product: **UseCasesX™** — Global AI Use Case Repository, AI Opportunity Map and AI Use Case Studio™.
Editions: **Lite** (public discovery) and **Pro Founding Access** (complimentary through
31 December 2026, subject to fair-use limits). Enterprise is designed into the architecture and
sold through paid Enterprise Design Partner engagements — it is not live in this release.

## Core journey shipped

Discover → Capture Opportunity → Design → Score → Prioritize → Portfolio → Roadmap → Export → Advisory.

## In this release

**Repository & discovery**

- Published reference repository with faceted search: keyword relevance ranking, tags, domains, sectors, countries and public-sector functions.
- Public use-case detail pages with per-page titles, descriptions and social preview metadata.

**Studio, scoring and portfolios**

- Use case design wizard, value/feasibility scoring, comparison, shortlists, portfolios and roadmap views.
- Exports (CSV/PDF/DocX) for portfolios, reports and deliverables, generated on demand.

**Contribution & moderation**

- Submit a use case with validation, "My use cases" status tracking (draft / in review / published) and admin approval that publishes through an admin-only database routine rather than relaxed row security.

**Workspaces, roles and entitlements**

- Workspace/organisation ownership on tenant data, membership roles, invitations and centrally resolved plan entitlements.

**Support & requests**

- "Request features / report bugs" in the user menu with confirmation, timestamp and status messaging.
- Consolidated administration request queue with assignment, priority, SLA tracking and reporter status alerts.

**Governance & observability (admin only)**

- Append-only audit trail; export/download audit log; AI usage analytics; security alerting on cross-workspace, storage-block, export-refusal and rate-limit patterns.
- Storage MIME/size limits, short-lived signed URLs, AI input validation, per-user and per-workspace fair-use limits and a retry shield after authorization failures.

**Pilot programme (admin only)**

- Controlled cohort invitations with audit trail, mission progress measured from recorded events, checkpoints with deep links back to the exact work, reminders and CSV/PDF exports.
- **New in this stabilisation pass:** pilot **triage & release readiness** panel — classifies recorded pilot evidence into P0 / P1 / P2 / education / out-of-scope and states an explicit go/no-go verdict.

## Not in this release

- Enterprise-only roles and capabilities beyond the launch role set.
- Suite integrations beyond the controlled handoff request flow (SARPI, SARN, CyberX C3G, AdvisorX, ConversX).
- Paid billing; Founding Access is complimentary and fair-use limited.

## Known issues

See `docs/product/known-issues-2026-08-14.md`.

## Verification for v1.0.0-rc.1

Measured on the candidate state (build sandbox, 11 August 2026):

| Gate                                        | Result                                                      |
| ------------------------------------------- | ----------------------------------------------------------- |
| `bun run verify:release`                    | PASS — version markers aligned, 15 migrations ordered, additive, seed-free, manifest complete |
| `bun install --frozen-lockfile`             | PASS                                                        |
| `bun run lint`                              | PASS (0 errors)                                             |
| `bunx tsgo --noEmit`                        | PASS                                                        |
| `bun run verify:routes`                     | PASS                                                        |
| `bun run build`                             | PASS (Workers bundle generated)                             |
| `bun run test:unit`                         | PASS                                                        |
| `bun run check:nav-integrity`               | PASS — no dead nav                                          |
| Browser P0 (`bun run test:p0`)              | Runs in CI `launch-readiness.yml`; not runnable in the build sandbox (known issue #2) |

## Release status

Scope is **frozen** as of 11 August 2026: P0 fixes and evidence-backed copy corrections only.
Current verdict is **No-Go on evidence** until the pilot cohort produces signal or an admin waiver
is recorded — see `docs/product/pilot-report-2026-08-11.md`. Code, security and test gates are green;
the candidate is code-ready / evidence-pending.

Rollback: revert the application to the previous version; the schema is additive and stays ahead.
Forward-fix: additive migration plus a new `v1.0.0-rc.N` tag — applied migrations are never edited.
