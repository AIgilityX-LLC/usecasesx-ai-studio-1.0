# Production runbooks

Incident playbooks for UseCasesX enterprise operations. Pair with:

- `docs/operations/slo.md` — measurable SLO contracts
- `docs/architecture/reliability-observability.md` — control plane
- `docs/operations/query-review.md` — query / index hygiene

| Runbook | When |
| ------- | ---- |
| [application-down.md](./application-down.md) | Health/uptime failing; blank pages |
| [database-failure.md](./database-failure.md) | Ready probe DB fail; connection storms |
| [authentication-failure.md](./authentication-failure.md) | Sign-in / SSO outages |
| [suspected-security-incident.md](./suspected-security-incident.md) | Compromise, breakout, key leak |
| [failed-deployment.md](./failed-deployment.md) | Bad release; rollback decisions |
| [backup-restore.md](./backup-restore.md) | PITR / restore drills |

Always preserve `audit_events` and correlation ids during response.
