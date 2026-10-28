# Changelog

All notable changes to AIgilityX **UseCasesX™** are recorded here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow the release tags defined in `docs/process/release-branch-plan.md`.

Per-release detail lives in `docs/releases/<date>-<slug>.md` using `docs/process/release-notes-template.md`.

## [Unreleased]

### Added

- Enterprise CI Critical gates (install, typecheck, lint, unit, integration, tenant-isolation, RLS, build, security scan) — `.github/workflows/ci.yml`.
- Separate development / staging / production config templates under `config/environments/`.
- Production deploy workflow with explicit authorization — `.github/workflows/production-deploy.yml`.
- Release tagging + CHANGELOG generation — `scripts/generate-changelog.mjs`, updated `release.yml`.
- CI/CD docs: `docs/cicd/README.md`, `production-authorization.md`, `rollback.md`.

### Changed

- Branch protection required check documented as aggregate **Critical gates**.
- `.github/deployment-env.example` extended with production + CI secret names.

### Migrations

- None in this change (CI enforces migrations remain under `supabase/migrations/`).

---

## Baseline — 2026-07-26

Baseline state pinned as `BASELINE-T0` (see `docs/baseline/README.md`). Migration head: `20260725094800_9af904b9...`. No published version.
