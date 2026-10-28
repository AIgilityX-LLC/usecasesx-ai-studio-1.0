# Deployment environment configuration

The deploy and preview workflows are inert until the repository carries the
variables and secrets below. `.github/deployment-env.example` is the canonical
name template — copy names verbatim. Non-secret shapes also live under
`config/environments/{development,staging,production}.env.example`.

**Production secrets must never be committed.** Use GitHub Environments / Lovable
Cloud Secrets only. See `docs/cicd/production-authorization.md`.

| Name | Kind | Used by | Purpose |
| ---- | ---- | ------- | ------- |
| `STAGING_SUPABASE_URL` | Variable | `staging-deploy.yml` | Staging backend URL |
| `STAGING_SUPABASE_PUBLISHABLE_KEY` | Variable | `staging-deploy.yml` | Staging publishable key |
| `STAGING_SUPABASE_PROJECT_ID` | Variable | `staging-deploy.yml` | Staging project ref |
| `PREVIEW_SUPABASE_URL` | Variable | `pr-preview.yml` | Preview backend URL |
| `PREVIEW_SUPABASE_PUBLISHABLE_KEY` | Variable | `pr-preview.yml` | Preview publishable key |
| `PREVIEW_SUPABASE_PROJECT_ID` | Variable | `pr-preview.yml` | Preview project ref |
| `PRODUCTION_SUPABASE_URL` | Variable | `production-deploy.yml` | Production backend URL |
| `PRODUCTION_SUPABASE_PUBLISHABLE_KEY` | Variable | `production-deploy.yml` | Production publishable key |
| `PRODUCTION_SUPABASE_PROJECT_ID` | Variable | `production-deploy.yml` | Production project ref |
| `PRODUCTION_BASE_URL` | Variable | `monitoring.yml` | Synthetic probe target |
| `STAGING_SUPABASE_SERVICE_ROLE_KEY` | Secret | `staging-deploy.yml` | Staging server-only key |
| `PREVIEW_SUPABASE_SERVICE_ROLE_KEY` | Secret | `pr-preview.yml` | Preview server-only key |
| `PRODUCTION_SUPABASE_SERVICE_ROLE_KEY` | Secret | `production-deploy.yml` | Production server-only key |
| `SUPABASE_*` (CI) | Secret | `ci.yml` Critical gates | Integration / RLS / tenancy |
| `CLOUDFLARE_API_TOKEN` | Secret | deploy workflows | Workers Scripts:Edit |
| `CLOUDFLARE_ACCOUNT_ID` | Secret | deploy workflows | Cloudflare account id |
| `LOVABLE_API_KEY` | Secret | deploy workflows | AI gateway (optional) |
| `ALERT_WEBHOOK_URL` | Secret | `monitoring.yml` | Alert sink (optional) |

## How failures surface

`scripts/verify-deploy-env.mjs` runs before every build. When a value is
missing it prints the missing **names only** — never values — along with the
exact GitHub settings page and the template path, then exits non-zero so the
deploy stops before producing a broken artefact.

Preview and staging may point at the same backend project, but a separate
preview project is strongly preferred: PR runs create and delete workspaces,
invitations and portfolios.

## Local verification

```bash
STAGING_SUPABASE_URL=... node scripts/verify-deploy-env.mjs staging
```
