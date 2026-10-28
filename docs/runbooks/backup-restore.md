# Runbook — Backup and restore

**Symptoms:** Need to recover from data loss, corruption, or destructive operator error.  
**SLO:** RPO/RTO per tier (`docs/operations/slo.md`).

## Preconditions

- Production-class Pro/Enterprise: **PITR enabled** on the managed database (operator dashboard — not app-toggleable).
- Latest restore drill evidence reviewed (`src/lib/ops/recovery-drill.ts`).
- Incident commander + DBA assigned; communication channel open.

## Decision

| Goal | Method |
| ---- | ------ |
| Undo recent bad writes (minutes–hours) | PITR to timestamp before the event |
| Full environment rebuild | Logical backup restore into a new project, then cut over |
| Single-tenant export only | Tenant export / audit export — not a DB restore |

## Restore procedure (high level)

1. **Freeze writes** where possible (maintenance mode / pause cron hooks).
2. Snapshot current state for forensics (do not destroy evidence).
3. Choose recovery target time (RPO clock starts at last good commit).
4. Execute PITR / backup restore in the cloud console.
5. Validate: `/api/public/ready`, auth sign-in, RLS spot-check (`test:rls` against restored env if available).
6. Re-enable traffic; monitor error rates and job hooks.

## After restore

- Rotate secrets if the incident involved credential exposure.
- Reconcile `audit_events` expectations — history may include pre-incident rows; never delete to “clean” the trail.
- Record wall-clock RTO against the tier target.

## Do not

- Restore production over a live system without a cutover plan
- Disable RLS to “make the app work” after restore
- Skip customer communication for Enterprise data loss windows
