# Production deployment — explicit authorization

Production must never auto-deploy from `main` merge alone.

## Required controls

1. **Manual workflow only** — `.github/workflows/production-deploy.yml` is `workflow_dispatch`.
2. **Confirmation phrase** — input `confirm` must equal exactly `deploy-production`.
3. **Change reason** — input `reason` must cite a ticket / change ID.
4. **GitHub Environment `production`** with:
   - Required reviewers (one or more humans)
   - Environment secrets (not repository-wide when possible)
   - Optional wait timer
5. **Tagged release preferred** — deploy a reviewed `v*` tag rather than an arbitrary SHA.

## Operator steps

1. Ensure Critical gates are green on the commit/tag.
2. Run Actions → **Release** to cut tag + CHANGELOG (or push annotated tag).
3. Review the draft GitHub Release notes.
4. Run Actions → **Production deploy**:
   - `tag`: e.g. `v1.2.0`
   - `confirm`: `deploy-production`
   - `reason`: `CHG-123 / launch window`
5. Approve the pending Environment deployment when prompted.
6. Verify `/api/public/health` and `/api/public/ready`, then smoke sign-in.

## Forbidden

- Embedding production service-role keys in the repo, client bundle, or PR bodies
- Sharing staging and production service-role keys
- Force-pushing `main` to “undo” a bad prod deploy (use rollback runbook instead)
- Bypassing Environment protection for convenience

## Branch protection (merge)

On `main`:

- Require a pull request
- Require status check **`Critical gates`**
- Require conversation resolution
- Disallow force pushes and deletions
- Optionally require 1–2 approvals (2 for auth/RLS/entitlements/audit)
