# Changelog

All notable changes to AIgilityX **UseCasesX™** are recorded here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow release tags.

Per-release detail lives in `docs/releases/<date>-<slug>.md` using `docs/process/release-notes-template.md`.

## Cutting the first release (humans only)

1. Ensure `docs/process/github-settings.md` items 1–4 are applied.
2. History since 2026-07-28 is reconstructed below under **[Unreleased]** — review and edit grouping if needed; do not invent entries.
3. From GitHub Actions → **Release Please** → *Run workflow* (`workflow_dispatch` only). Review the draft release PR; merge when ready.
4. Alternatively, after a human-approved tag `v*`, the existing `.github/workflows/release.yml` can draft GitHub release notes.
5. **Agents must not create tags** or push to `main`.

Manifest seed: `.release-please-manifest.json` → `1.0.0-rc.1` (matches `package.json`).

## [Unreleased]

> Reconstructed from git first-parent history since **2026-07-28**. Subjects are commit messages as recorded; grouping is heuristic (Added / Changed / Fixed / Security). Invented product claims were not added.

### Added

- Enabled EnterpriseNavV2 flag
- Ship enterprise navigation v2 behind feature flag for Lovable sync.
- feat(nav): capability-aware navigation (wip)
- Add integration configuration from remix
- Seeded sample tenants
- Added waiver panel to Readiness
- Added session timeout guard
- Added Pro pricing page & published
- Added pilot portal dashboard
- Enabled Studio with free gemini
- Added pilot portal snapshots
- Added pilot app endpoints
- Added welcome email flow
- Added Pro signup flow
- Added launch page copy
- Added launch-host regression test
- Added investigation template
- Added announcement page
- Added pilot roster import
- Added pilot portal page
- Provisioned plans and hooks
- Added Readiness harness page
- Added real P0/P1 harness page
- Added admin & readiness page
- Added SuperAdmin admin page
- Added admin management & auth
- Added admin management features
- Added readiness checklist page
- Added pilot readiness gates
- Added filters & readiness UI
- Added audit filters & % status
- Added audit timeline & funnel
- Added admin audit/timeline
- Added pilot enrollment flow
- Added admin onboarding UI
- Added demo login & branding
- Added demo login page
- Added test lead to verify send
- Added per-lead resend action
- Added admin preview and webhooks
- Implemented email templates
- Added audit trail & CSV export
- Added lead pipeline & tests
- Added hero animation & CTA
- Added launch monitor + runbook
- Added production data audit
- Added production config module
- Added release candidate modules
- Created 14 Aug RC1 release marker
- Added pilot validation & features
- Added Sovereign Public Value Canvas
- Added pilot CSV/TSV upload
- Added data export & consent
- Added legal help & transparency
- Added audit trail & reminders
- Implemented pilot UI and data
- Added admin triage & SLA
- Added launch verification suite
- Added pagination notices & total
- Added pagination & menu form
- Added audit & admin layer
- Added AI hardening and auth
- Added audit trail & SEO pages
- Added facets & submission flow
- Added launch analytics & feed
- Added SEO/conversion pages
- Added demo audit & export flow
- Added admin reset & story PDF
- Added demo scenarios & seed
- Added provenance filters & QA
- Added provenance schema & corpus
- Added platform-admin layer
- Added demo reset & walkthrough
- Added demo org access logic
- Added 2 demo accounts
- Added org-aware reports UI
- Added CI/CD and monitoring
- Added Pro plan support
- Created Opportunity Plan PDF
- Added handoffs audit flow
- Implemented handoff requests
- Added receipt, CSV & print tests
- Added audit & export tests
- Implemented branded exports
- Added timeline pagination tests
- Added Playwright workspace tests
- Added lightweight Pro collab
- Added demo login and seeded personas
- Added workshops domain
- Added ERP reconciliation & lineage
- Added evidence & lineage to pack
- Added value model & UI
- Added delivery versioning
- Added deliverables hub & export
- Added roadmap export & audit
- Added roadmap exports, links, validation, analytics
- Added roadmap to PPM flow
- Added taxonomy checklist & export
- Added Pro Opportunity Map
- Added analytics and hardening
- Added executive portfolio UI
- Added share & export features
- Added audit trail & export
- Added portfolio foundation
- Added autosave & SuperAdmin
- Added journey funnel view
- Added signed-out capture flow
- Added journey layer & panel
- Added priority score features
- Added configurable scorecard
- Added draft, diffs & history
- Added Studio wizard flow
- Added opportunity capture flow
- Added use-case detail pages
- Added onboarding wizard flow

### Changed

- Upgraded source-map-js to 1.2.2
- Audience growth strategy
- Replace Gratis auto-grant with reviewed Founding Access request flow.
- Merge Lovable remote main before publishing local V2/nav updates.
- Commit browser-safe Supabase env for Lovable Vite builds.
- Rebuild landing and auth UI for Lovable sync.
- Solved search & known issue bugs
- Update plan
- Enhanced studio & engine admin
- Validated browser P0 suite
- Signed Pro into found access
- Proposed Founding Access build
- Removed English from title
- Rewrote launch route and SEO
- Launched with live corpus
- Stopped launch preview smoke
- Gated auth queries on session
- Scheduled launch-checks cron
- Verified P0/P1 probes
- Linked readiness cards
- Branded auth templates unified
- Set up auth email templates
- Finalized migration & admin
- Fast Visual Edit
- Rewrote handover guide
- Set sender domain to info@aigilityx.com
- Drafted AIgilityX plan
- Verified Release v1.0.0-rc.1
- Tested restore and pilot invites
- Gathered evidence for freeze
- Completed pilot pilot v2
- Stabilised pilot triage layer
- Updated app branding and UI
- Lovable update
- Unified admin lifecycle panel
- Verified handoff handoff flow
- Improved draft recovery UX
- Checked read-only mode
- Enhanced repository scraping
- Migrated admin/Studio to domain

### Fixed

- Fix CI lint and navbar hero gate after nav merge.
- Fix CI gates: sync migration manifest and clear typecheck blockers.
- Merge lovable/main into fix/nav-2-corrective for sync.
- Ship V2 foundation, auth-aware landing nav, and repository grant fix for Lovable sync.
- Fixed production date literal
- Fixed launch claims + live stats
- Fixed hero contrast and CTA flow
- Fixed SEO findings
- Fixed login page redirect
- Fixed attribution and sessions
- Fixed launch-blocking defects
- Fixed Playwright CI failures
- Fixed create-workshop redirect
- Fixed mock data on Pro routes

### Security

- Fixed security findings
- Unblock CI: format tree, soften artifact quota, skip secret-backed Playwright.
- Fix board status inserts and Lovable service-role secret fallback.
- Point app config at the new Supabase project and stop tracking local env secrets.
- stop tracking .env
- fix(security): implement SELECT_SCALARS to safely query use_cases
- Security pre-publish check
- Checked security scan results
- Hardened auth and audit policies
- Hardened public API security
- Fixed RLS errors & added logs
- Fixed auth RLS on approval
- Secured workshop build pages
- Hardened workspace provisioning

---

## Baseline — 2026-07-26

Baseline state pinned as `BASELINE-T0` (see `docs/baseline/README.md`). Migration head at that time: `20260725094800_9af904b9...`. No published GA version.
