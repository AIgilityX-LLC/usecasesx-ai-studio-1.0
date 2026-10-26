# Data documentation index

## Dictionaries and models

| Doc | Purpose |
| --- | ------- |
| `docs/v2/data-dictionary.md` | V2 entity / column dictionary |
| `docs/v2/erd-core-model.md` | Core ERD |
| `docs/v2/lifecycle-status-map.md` | Canonical lifecycle mapping |
| `docs/architecture/usecasesx-domain-model-review.md` | Domain-model review (read-only) |
| `docs/baseline/schema-tables.md` | Baseline table inventory |
| `docs/baseline/schema-policies.md` | Baseline policy inventory |
| `docs/baseline/schema-functions.md` | Baseline function inventory |
| `docs/baseline/migrations-head.md` | Migration head notes |

## Migrations and tenancy

| Doc | Purpose |
| --- | ------- |
| `docs/architecture/tenancy-rls-design.md` | Tenancy + RLS design |
| `docs/architecture/tenancy-migration-plan.md` | Tenancy migration plan |
| `docs/architecture/data-migration-plan.md` | Data migration plan |
| `docs/v2/data-migration-plan.md` | V2 data migration plan |
| `docs/refactor/baseline.md` §5–6 | Live DB snapshot process; migrations on disk |
| `scripts/audit/db-snapshot.sql` | Read-only live introspection |

## Rules

Additive migrations only; `GRANT` → `ENABLE RLS` → `CREATE POLICY` in the same file (`AGENTS.md` §5). Do not treat `src/integrations/supabase/types.ts` as live schema truth.
