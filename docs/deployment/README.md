# Deployment documentation index

## Current stack (this repo)

TanStack Start on Cloudflare Workers; backend via Lovable Cloud. Deploy/preview workflows are gated on GitHub variables/secrets.

| Doc | Purpose |
| --- | ------- |
| `docs/process/deployment-environment.md` | Required GitHub vars/secrets for staging / preview / monitoring |
| `.github/deployment-env.example` | Canonical name template |
| `docs/process/source-control-workflow.md` | Branch model + Lovable-tracked branch rules |
| `docs/process/github-settings.md` | Human-applied GitHub settings (ordered) |
| `docs/operations/launch-runbook-2026-08-14.md` | Launch operations runbook |
| `docs/release/production-config-2026-08-14.md` | Production config notes |
| `docs/release/backup-restore-drill-2026-08-11.md` | Backup / restore drill |
| `docs/RELEASE_CHECKLIST.md` | Human release gate |
| `docs/releases/enterprise-navigation-v2-rollout.md` | Feature-flag rollout plan |

## Workflows

| Workflow | File |
| -------- | ---- |
| CI | `.github/workflows/ci.yml` |
| Staging deploy | `.github/workflows/staging-deploy.yml` |
| PR preview | `.github/workflows/pr-preview.yml` |
| Monitoring | `.github/workflows/monitoring.yml` |
| Release notes (tag / dispatch) | `.github/workflows/release.yml` |
| Release-please (manual) | `.github/workflows/release-please.yml` |

## Historical note

`docs/handover/11-deployment-runbook.md` describes an older Vercel/Railway layout. Prefer the process docs above for this TanStack Start repository.
