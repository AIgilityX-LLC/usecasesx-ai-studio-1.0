# Runbook — Database failure

**Symptoms:** `/api/public/ready` returns 503 with `dependency_database` fail; auth may still look up.  
**SLO:** availability + Enterprise RPO/RTO.

## Immediate

1. Confirm probe detail on `/api/public/ready` (`latencyMs`, `detail`).
2. Check Lovable Cloud / managed Postgres dashboard: connectivity, CPU, connections, disk.
3. Verify app secrets still point at the intended project (`SUPABASE_URL` host only — never paste keys into tickets).

## Triage

| Signal | Action |
| ------ | ------ |
| Connection refused / timeout | Platform outage or network ACL — wait or open provider ticket |
| High connections | Kill idle clients; check for unbounded queries (`docs/operations/query-review.md`) |
| Disk full / WAL | Expand storage; pause non-critical cron hooks |
| Corruption / wrong data | Stop writes; prepare PITR restore (`backup-restore.md`) |

## Do not

- Disable RLS
- Expose `service_role` to the browser
- Run ad-hoc `DELETE`/`TRUNCATE` without a restore plan

## Close-out

- Confirm `/api/public/ready` returns 200
- Note RPO impact (data loss window) for Enterprise customers if restore was required
