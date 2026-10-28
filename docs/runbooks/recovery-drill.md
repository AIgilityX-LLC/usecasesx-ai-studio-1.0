# Runbook — Recovery drill (TEST project only)

**Status:** Procedure written; **not executed** by the coding agent.  
**Related:** `scripts/recovery/export-db.mjs`, `scripts/recovery/verify-restore.mjs`, `scripts/ops/restore-drill.mjs`  
**ER-C-02:** Remains **NEEDS-HUMAN** until a human completes this drill and archives evidence.

## Rules

1. Never run against production. Set `PRODUCTION_SUPABASE_PROJECT_REF` so scripts refuse a matching `SUPABASE_URL`.
2. Never paste passwords, service-role keys, or full connection strings into tickets or chat.
3. Prefer Lovable/Supabase **platform snapshot restore** for real incidents; migration-only rebuild is incomplete (see `docs/release/backup-restore-drill-2026-08-11.md`).

## Steps

1. **Tag** the candidate: `git tag -a recovery-<YYYYMMDD> -m "recovery drill pin"` on the green SHA.
2. **Snapshot** the production (or staging) database via the managed platform console (on-demand backup).
3. **Export** from a non-prod source if practicing dump/restore:
   ```bash
   export SUPABASE_URL="https://<TEST-REF>.supabase.co"
   export PRODUCTION_SUPABASE_PROJECT_REF="<prod-ref-not-printed-here>"
   export DATABASE_URL="postgresql://…TEST…"
   node scripts/recovery/export-db.mjs
   ```
4. **Restore** the dump (or platform snapshot) into the **TEST** project (platform UI or `pg_restore`). Not automated here.
5. **Verify**:
   ```bash
   export DATABASE_URL="postgresql://…TEST…"
   export SUPABASE_URL="https://<TEST-REF>.supabase.co"
   export SUPABASE_PUBLISHABLE_KEY="…"
   export RECOVERY_SMOKE_EMAIL="…"
   export RECOVERY_SMOKE_PASSWORD="…"
   node scripts/recovery/verify-restore.mjs
   ```
6. Optionally rehearse schema-only rebuild: `PGBIN=… node scripts/ops/restore-drill.mjs --owner "Name"`.
7. Archive: tag name, start/end timestamps, operator, verify-restore exit code → update `docs/release/restore-drill.json` or a dated note under `docs/release/`.

## Success criteria

- verify-restore exits 0
- Smoke login succeeds on TEST
- RLS smoke (`bun run test:rls` with TEST secrets) green after seed

Until then, enterprise readiness dimension **19 Recovery** stays **FAIL / NEEDS-HUMAN**.
