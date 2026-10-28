# Rollback guidance — frontend · backend · database

Companion: `docs/runbooks/failed-deployment.md`, `docs/runbooks/backup-restore.md`.

## Decision matrix

| Symptom | Prefer |
| ------- | ------ |
| Bad UI / Worker only; DB schema unchanged | Frontend rollback |
| Server fn / Worker runtime bug; schema OK | Backend (Worker) rollback — usually same artifact as frontend in this monolith |
| Bad migration / data shape | Database rollback / PITR path (separate) |
| Combined release | Roll back Worker first, then decide on DB |

UseCasesX is a **modular monolith** (TanStack Start on Cloudflare Workers + Lovable Cloud Postgres). “Frontend” and “backend” share one deployable Worker artifact; treat them as one app release unless you have a split worker.

---

## Frontend release rollback

1. Identify last known-good tag/SHA (`git tag --list 'v*'`, Actions → Production deploy history).
2. Re-run **Production deploy** with that tag (`confirm=deploy-production`, cite incident ID).
3. Confirm CDN/Worker serves the previous build: hard-refresh, check `/api/public/health` `version`.
4. Do **not** delete the bad tag — mark the GitHub Release as yanked in notes.

**If using Lovable publish:** republish the previous green commit from Lovable history, then reconcile git tags.

---

## Backend release rollback

Same Worker artifact as frontend for SSR/server functions:

1. Redeploy previous green Worker (Production deploy workflow or Wrangler with prior artifact).
2. Verify server functions: sign-in, one `createServerFn` path, `/api/public/ready`.
3. If only an Edge/cron hook regressed, disable the schedule temporarily; do not weaken RLS.

Secrets stay in the Environment — rollback never requires committing secrets.

---

## Database migration rollback

Migrations are **additive-only** by policy (`AGENTS.md` §5). Prefer forward-fix.

| Situation | Action |
| --------- | ------ |
| New migration not yet applied in prod | Do not apply; revert the git commit |
| Applied additive columns/tables causing bugs | Expand-contract: stop writing new columns; ship app fix; drop only later with staged plan |
| Destructive / data corruption | Follow `docs/runbooks/backup-restore.md` (PITR); freeze writes |
| Partial apply failure | Stop deploys; complete or restore; never hand-edit `supabase_migrations` history |

**Never**

- `DROP`/`TRUNCATE` in a panic without restore plan
- Disable RLS to “unblock” users
- Rewrite already-applied migration files on `main`

Document the recovery target time (RPO) for Enterprise customers when restore is used.

---

## Verification after any rollback

- [ ] `/api/public/health` → 200
- [ ] `/api/public/ready` → 200
- [ ] Auth sign-in
- [ ] One tenant journey smoke
- [ ] Critical gates green on the rolled-back ref
- [ ] Incident note with correlation ids / release tag
