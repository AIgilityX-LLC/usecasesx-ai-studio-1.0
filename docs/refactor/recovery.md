# Recovery point — before Prompt 1

**Do not run these steps from the agent.** This document is the operator checklist. Create the recovery point **after** you finish the DB snapshot CSVs and **before** any refactor prompt edits code.

Baseline reference commit (audit tip): `e64fbd93e4d3f2292b742300b52e033c97011d63` on branch `fix/nav-2-corrective` / `lovable/main`.

---

## 1. Git tag (code recovery pin)

Use an immutable annotated tag on the commit you intend to treat as the pre-refactor pin (recommend the tip of `lovable/main` after you confirm preview health).

```bash
# Confirm remotes and tip
git fetch lovable
git fetch origin
git checkout fix/nav-2-corrective   # or the branch you will start from
git status
git rev-parse HEAD
git log -1 --oneline

# Create annotated tag (name is fixed for this refactor wave)
git tag -a refactor-pre-prompt-1-2026-10-23 -m "Pre-refactor recovery pin before Prompt 1. Baseline: docs/refactor/baseline.md"

# Push tag to BOTH remotes so either clone can restore
git push lovable refs/tags/refactor-pre-prompt-1-2026-10-23
git push origin refs/tags/refactor-pre-prompt-1-2026-10-23
```

**Tag name (exact):** `refactor-pre-prompt-1-2026-10-23`

Optional branch freeze (do not force-push over it later):

```bash
git branch refactor/pre-prompt-1-freeze HEAD
git push lovable refactor/pre-prompt-1-freeze
git push origin refactor/pre-prompt-1-freeze
```

---

## 2. Database export (data recovery pin)

The live DB was rebuilt from `docs/migration/full-schema.sql` + patches. A code tag alone is not enough.

### 2a. Logical dump (preferred)

From Supabase Dashboard → **Database** → **Backups**, or with a connection string you already hold:

```bash
# Example shape only — use YOUR connection string from the dashboard.
# Do not commit the dump or the connection string into the repo.
pg_dump "$DATABASE_URL" \
  --format=custom \
  --no-owner \
  --no-acl \
  --file "usecasesx-pre-prompt-1-2026-10-23.dump"
```

Store the dump **outside the git repo** (encrypted drive / secure backup). Record the filename, UTC timestamp, and project ref in your ops notes (not in git if it contains data).

### 2b. Schema-only companion (safe to keep private)

```bash
pg_dump "$DATABASE_URL" --schema-only --no-owner --file "usecasesx-pre-prompt-1-2026-10-23.schema.sql"
```

### 2c. Catalog snapshot (already requested)

You should already have run `scripts/audit/db-snapshot.sql` and saved CSVs under `docs/refactor/db-snapshot/`. Keep those CSVs committed — they are metadata, not row dumps.

### 2d. Supabase point-in-time / dashboard backup

If the project has PITR or daily backups enabled, note the **UTC time** immediately after the dump as `T0`. That is your dashboard restore target if `pg_dump` is unavailable later.

---

## 3. Roll back **code** to the recovery point

```bash
git fetch lovable
git fetch origin

# Inspect
git show refactor-pre-prompt-1-2026-10-23 --stat

# Hard reset a working branch to the tag (DESTROYS uncommitted work — stash first)
git stash push -u -m "wip before rollback"
git checkout -B fix/nav-2-corrective refactor-pre-prompt-1-2026-10-23

# Push only if you intentionally want remotes to match the pin
# (coordinate: this rewrites branch tips if they moved forward)
git push lovable HEAD:fix/nav-2-corrective
# Avoid force-pushing lovable/main unless you explicitly decide to.
```

To create a “undo” branch without moving `main`:

```bash
git checkout -b revert/prompt-N-failed refactor-pre-prompt-1-2026-10-23
```

---

## 4. Roll back **database** to the recovery point

Pick one path. Prefer the least destructive that restores known-good state.

### Path A — restore from custom dump

```bash
# WARNING: replaces target database contents. Confirm project ref first.
pg_restore --clean --if-exists --no-owner --dbname "$DATABASE_URL" \
  "usecasesx-pre-prompt-1-2026-10-23.dump"
```

### Path B — Supabase dashboard backup / PITR

1. Dashboard → Database → Backups.
2. Restore to timestamp **T0** (from §2d).
3. Re-run selected read-only checks from `scripts/audit/db-snapshot.sql` (§04 RLS disabled, §03 policies) and compare to `docs/refactor/db-snapshot/*.csv`.

### Path C — forward-fix only (if restore is impossible)

Do **not** invent DROP/RENAME from memory. Write a new additive migration reviewed by you, applied by you, timestamp **after** `20260929180000`.

---

## 5. Post-restore verification (operator)

1. `git rev-parse HEAD` equals the tagged commit.
2. Preview / local app boots; enterprise nav flag state matches what you expect.
3. Spot-check: `node scripts/verify-route-tree.mjs`, `node scripts/check-nav-integrity.mjs`.
4. Re-run RLS smoke when demo credentials exist (`bun run test:rls`) — closes R-SEC-01 when green.
5. Confirm no migration newer than the pin was left half-applied on the live DB.

---

## 6. Agent constraints (reminder)

- The agent **never** applies migrations, never writes to the database, never force-pushes `main` unless you explicitly order it in a later message.
- Every new migration file must use a timestamp **after** `20260929180000`.
- You review and apply every migration yourself.
