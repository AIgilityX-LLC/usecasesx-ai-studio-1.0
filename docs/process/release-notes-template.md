# Release Notes Template

Duplicate this file into `docs/releases/YYYY-MM-DD-<slug>.md` for every tagged release or hotfix. Keep it short, factual, and evidence-linked.

---

# Release <version> — <date>

**Type**: Launch | Minor | Patch | Hotfix
**Tag**: `v2026.08.14-launch` (example)
**Tracked branch at release**: `main`
**Commit**: `<sha>`
**Launch commander**: @owner

## Summary

One paragraph, plain language. What changed for the user? Which persona benefits (Workspace Owner, Admin, Contributor, Viewer, Facilitator)?

## Highlights

- Feature or fix — one line each, PROMPT-NN reference.

## Full changelog

Grouped by Conventional Commit type. Auto-generated from `git log <prev-tag>..<this-tag> --oneline` is acceptable, but must be curated.

### Added

- feat(<scope>): … (PROMPT-NN)

### Changed

- refactor(<scope>): …

### Fixed

- fix(<scope>): …

### Security

- fix(security): … (link risk ID from release board §7.1)

### Docs / Chore

- docs(<scope>): …

## Migrations

- `supabase/migrations/<timestamp>_<slug>.sql` — additive. Adds `<table/column/policy>`. Rollback: revert commit.
- If destructive: link to staged plan in `docs/architecture/data-migration-plan.md`.

## Evidence

- CI run: `<link>`
- Playwright: `test:e2e`, `test:smoke`, `test:navbar`, `test:mobile`, `test:rls` — all green.
- Lighthouse (if UI): perf/a11y/best-practices/SEO ≥ 90 on `/discover`.
- Screenshots: `<path or link>`.

## Known issues / Deferred

- Item — reference in `docs/product/scope-2026-08-14/deferred-register.md`.

## Rollback plan

1. Lovable UI → History → Restore to tag `<previous-tag>`.
2. Or `git revert <sha>` on `main`, republish.
3. For migrations: additive = revert commit; destructive = execute staged rollback in plan doc.

## Post-release monitoring

- Smoke: `bun run test:smoke` against production.
- Error sink: check observability dashboard for new error classes within the 4h triage window.
- On-call: @owner.
