# Deployment environment configuration

Promotion path (see also `docs/process/ci-cd-quality-gates.md`):

```
LOCAL → DEVELOPMENT → STAGING → PRODUCTION
```

| Environment | GitHub Environment / surface | Supabase project | Workflow |
| ----------- | ---------------------------- | ---------------- | -------- |
| LOCAL | Laptop / Lovable preview | Local or shared non-prod | `bun run dev` |
| DEVELOPMENT | PR preview | `PREVIEW_*` | `pr-preview.yml` |
| STAGING | Environment `staging` (require reviewers) | `STAGING_*` | `staging-deploy.yml` after green CI on `main` |
| PRODUCTION | Environment `production` (require reviewers) | Production only | Human publish / promote — agents never push to `main` |

The deploy and preview workflows are inert until the repository carries the
variables and secrets below. `.github/deployment-env.example` is the canonical
template — copy the names from it verbatim.

| Name                                | Kind     | Used by               | Purpose                                   |
| ----------------------------------- | -------- | --------------------- | ----------------------------------------- |
| `STAGING_SUPABASE_URL`              | Variable | `staging-deploy.yml`  | Backend URL baked into the staging build  |
| `STAGING_SUPABASE_PUBLISHABLE_KEY`  | Variable | `staging-deploy.yml`  | Publishable (browser-safe) key            |
| `STAGING_SUPABASE_PROJECT_ID`       | Variable | `staging-deploy.yml`  | Project reference                         |
| `PREVIEW_SUPABASE_URL`              | Variable | `pr-preview.yml`      | Backend URL for per-PR previews           |
| `PREVIEW_SUPABASE_PUBLISHABLE_KEY`  | Variable | `pr-preview.yml`      | Publishable key for previews              |
| `PREVIEW_SUPABASE_PROJECT_ID`       | Variable | `pr-preview.yml`      | Project reference for previews            |
| `PRODUCTION_BASE_URL`               | Variable | `monitoring.yml`      | Synthetic probe target                    |
| `STAGING_SUPABASE_SERVICE_ROLE_KEY` | Secret   | `staging-deploy.yml`  | Server-only key, deploy-time injection    |
| `PREVIEW_SUPABASE_SERVICE_ROLE_KEY` | Secret   | `pr-preview.yml`      | Server-only key for previews              |
| `SUPABASE_URL`                      | Secret/var | CI Playwright / RLS | Development/test backend for PR gates   |
| `SUPABASE_PUBLISHABLE_KEY`          | Secret/var | CI                    | Publishable key for CI                    |
| `SUPABASE_SERVICE_ROLE_KEY`         | Secret   | CI                    | Service role for RLS/tenancy gates only   |
| `CLOUDFLARE_API_TOKEN`              | Secret   | both deploy workflows | Workers Scripts:Edit token                |
| `CLOUDFLARE_ACCOUNT_ID`             | Secret   | both deploy workflows | Cloudflare account identifier             |
| `LOVABLE_API_KEY`                   | Secret   | `staging-deploy.yml`  | AI gateway key (optional)                 |
| `ALERT_WEBHOOK_URL`                 | Secret   | `monitoring.yml`      | Alert sink (optional; skipped when unset) |

## How failures surface

`scripts/verify-deploy-env.mjs` runs before every build. When a value is
missing it prints the missing **names only** — never values — along with the
exact GitHub settings page and the template path, then exits non-zero so the
deploy stops before producing a broken artefact.

Preview and staging may point at the same backend project, but a separate
preview project is strongly preferred: PR runs create and delete workspaces,
invitations and portfolios. **Production must never share keys with preview/staging.**

## Local verification

```bash
STAGING_SUPABASE_URL=... node scripts/verify-deploy-env.mjs staging
```
