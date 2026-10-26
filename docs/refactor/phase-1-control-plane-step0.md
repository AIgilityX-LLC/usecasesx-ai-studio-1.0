# Phase 1 control plane — STEP 0 inventory

**Branch:** `chore/phase-1-control-plane` from `lovable/main` @ `e64fbd9`  
**Date:** 2026-10-26  
**Default CODEOWNER:** `@Mehtab19` (sole human author in `git shortlog`; 15 commits vs bots)

| Item | Status | Evidence |
| ---- | ------ | -------- |
| `.github/CODEOWNERS` | **MISSING** → added | Did not exist |
| `CLAUDE.md` | **PARTIAL** → append only | 108 lines @ `626aed3`; no Delivery pipeline / Nav Architecture Rules |
| `AGENTS.md` | **PARTIAL** → append only | 99 lines @ `626aed3`; same gaps |
| `SECURITY.md` | **MISSING** → added | — |
| `CONTRIBUTING.md` | **MISSING** → added | Derives from `docs/process/source-control-workflow.md` (111 lines @ `626aed3`) — not rewritten |
| `ARCHITECTURE.md` | **MISSING** → added | Links `docs/architecture/*` |
| `THREAT_MODEL.md` | **MISSING** → added | — |
| `CHANGELOG.md` | **PARTIAL** → rebuilt `[Unreleased]` | 18 lines @ `626aed3`; reconstructed from first-parent since 2026-07-28 |
| `.github/PULL_REQUEST_TEMPLATE.md` | **PARTIAL** → extended | 36 lines @ `91bf8a4` |
| `.github/ISSUE_TEMPLATE/*` | **MISSING** → added | — |
| `.github/dependabot.yml` | **MISSING** → added | — |
| PR-title / gitleaks / CodeQL / release-please workflows | **MISSING** → added | Existing workflows left intact |
| Existing `.github/workflows/*` | **DONE** (no change) | `ci.yml` 104 @ `a643d88`, etc. |
| `docs/process/source-control-workflow.md` | **DONE** | 111 @ `626aed3` — reused |
| `docs/process/deployment-environment.md` | **DONE** | 31 @ `8205d29` — reused |
| `docs/v2/architecture-decisions.md` | **DONE** | 49 @ `e0f9812` — linked from ADR |
| `docs/v2/sovereignty-abstractions.md` | **DONE** | 21 @ `e0f9812` |
| `docs/v2/data-dictionary.md` | **DONE** | 108 @ `e0f9812` |
| `docs/security/*` | **DONE** | baseline / review / rbac matrix — not rewritten |
| `docs/api|data|deployment|sovereignty/README.md` | **MISSING** → added | Index only; moved nothing |
| `docs/adr/*` | **MISSING** → added | — |
| `docs/process/independent-review-checklist.md` | **MISSING** → added | — |
| `docs/process/github-settings.md` | **MISSING** → added | Lovable decision **pending** |
| `release-please-config.json` / manifest | **MISSING** → added | Manual `workflow_dispatch` only |

**Rule applied:** DONE → no edits; PARTIAL → extend only; MISSING → create.
