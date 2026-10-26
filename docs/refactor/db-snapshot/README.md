# Live DB snapshot CSVs

Run `scripts/audit/db-snapshot.sql` in the Supabase SQL editor, then save exports here:

| File | Query section |
|------|----------------|
| `01-tables-columns.csv` | §01 |
| `02-constraints.csv` | §02 |
| `03-rls-policies.csv` | §03 |
| `04-rls-disabled.csv` | §04 |
| `05-functions.csv` | §05 |
| `06-triggers.csv` | §06 |
| `07-views.csv` | §07 |
| `08-grants-tables.csv` | §08 |
| `09-grants-columns.csv` | §09 |
| `10-storage-buckets.csv` | §10 |
| `11-storage-policies.csv` | §11 |
| `12-row-counts.csv` | §12 |

Do not invent schema from `types.ts` or migrations. The live database is the source of truth.
