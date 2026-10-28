# Enterprise CI/CD — UseCasesX

## Pipeline overview

| Trigger | Workflow | Purpose |
| ------- | -------- | ------- |
| Every PR / push to `main` | `.github/workflows/ci.yml` | **Critical gates** — install, typecheck, lint, unit, integration, tenant-isolation, RLS, build, security scan |
| PR opened/synced | `pr-preview.yml` | Optional preview URL |
| CI success on `main` | `staging-deploy.yml` | Staging deploy (GitHub Environment `staging`) |
| Manual + phrase + reviewers | `production-deploy.yml` | Production deploy (explicit authorization) |
| Manual / tag `v*` | `release.yml` | Tag, CHANGELOG, draft GitHub Release |

## Critical gates (merge blockers)

Require the GitHub check named **`Critical gates`** on `main` (branch protection).

It aggregates:

1. **Install · typecheck · lint · unit · build** (+ route/nav/migration guards)
2. **Dependency / security scan** — fails on Critical/High advisories
3. **Integration tests** — `bun run test:integration` (requires CI Supabase secrets)
4. **Tenant-isolation · RLS** — `bun run test:isolation` (requires CI Supabase secrets)

Same-repo PRs **fail** if backend secrets are missing. Forks skip those suites with a warning.

## Environments

| Env | Config template | Secrets |
| --- | --------------- | ------- |
| development | `config/environments/development.env.example` | Local / Lovable Cloud Secrets only |
| staging | `config/environments/staging.env.example` | GitHub Environment `staging` |
| production | `config/environments/production.env.example` | GitHub Environment `production` (required reviewers) |

Canonical secret **names**: `.github/deployment-env.example`.  
**Never commit production secrets.** `.gitignore` blocks `.env.*` (except `.env.example`).

## Database changes

- Only via version-controlled files under `supabase/migrations/`.
- CI migration guard rejects `.sql` outside that path (and seeds/docs exceptions).
- Additive-only per `AGENTS.md` §5; apply through Lovable Cloud migration tooling.

## Release tagging & changelog

```bash
# Dry-run notes
node scripts/generate-changelog.mjs
node scripts/release-notes.mjs

# Cut a release (Actions → Release → Run workflow)
# version: v1.2.0
```

Or push an annotated tag `v*`. Draft release is created for human review before production deploy.

## Related

- [production-authorization.md](./production-authorization.md)
- [rollback.md](./rollback.md)
- [../process/deployment-environment.md](../process/deployment-environment.md)
- [../runbooks/failed-deployment.md](../runbooks/failed-deployment.md)
