# Refactor audit pack

| Doc | Purpose |
|-----|---------|
| [`baseline.md`](./baseline.md) | Part A — git, build health, SoT, protected files, migrations, env |
| [`pack-conflict-report.md`](./pack-conflict-report.md) | Part B — pack vs repo (blocked until `prompt-pack.md` exists) |
| [`recovery.md`](./recovery.md) | Part C — tag, DB export, rollback steps (operator only) |
| [`db-snapshot/`](./db-snapshot/) | CSV dumps from live DB (operator runs SQL) |

**Missing input:** place the refactor plan at `docs/refactor/prompt-pack.md`, then re-run Part B.

**Phase status (nav/RBAC):** see `pack-conflict-report.md` — SKIP DONE phases; PARTIAL has replacement prompts; contextual CTX-1…4 are NOT STARTED. `CLAUDE.md` does **not** yet contain “UseCasesX Navigation Architecture Rules”.

**SQL to run:** `scripts/audit/db-snapshot.sql`
