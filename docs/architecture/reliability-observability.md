# Phase 7 — Reliability, observability and scale

**Status:** Operational control plane introduced  
**Code:** `src/lib/ops/control-plane/`  
**Health:** `GET /api/public/health`  
**Ready:** `GET /api/public/ready`  
**SLOs:** `docs/operations/slo.md`  
**Runbooks:** `docs/runbooks/`  
**ADR:** `docs/adr/0007-reliability-observability.md`

---

## Control plane

| Concern | Module |
| ------- | ------ |
| Correlation IDs | `correlation.ts` (`x-correlation-id` / `x-request-id`) |
| Structured logging | `logging.ts` (JSON lines, levels include `security`) |
| Error tracking | `logCaughtError` + existing `logServerError` / `logAppError` |
| Audit events | Existing `telemetry/*` + `audit_events` (append-only) |
| Performance / DB / API / job metrics | `metrics.ts` (`METRIC_NAMES`, in-process ring) |
| Security events | `events.ts` + `observability.model.ts` |
| Usage analytics | `product_events` / activation funnel (existing) |
| Health / uptime | `health.ts` + public health route |
| Readiness / dependencies | `ready.ts` + `/api/public/ready` (DB probe) |
| Centralized errors | `errors.ts` + edge `server.ts` correlation |
| Background jobs | `jobs.ts` (`monitorJob`) on cron hooks |
| DB monitoring hooks | `db-monitor.ts` (`monitorDbQuery`) |
| Security event logging | `security-log.ts` + `events.ts` |
| Alerts | `alerts.ts` catalogue |
| Distributed tracing (justified paths only) | `tracing.ts` spans |
| SLOs / RPO / RTO | `slo.ts` · `docs/operations/slo.md` |
| PITR posture | `pitr.ts` checklist (operator-enabled) |
| Incident runbooks | `docs/runbooks/*` |
| Query review | `docs/operations/query-review.md` |

---

## Target SLOs

| Service | Example target |
| ------- | -------------- |
| Platform availability | 99.9% |
| API P95 latency | &lt;500 ms |
| Critical transaction success | &gt;99.9% |
| RPO | Defined per tier (`RECOVERY_OBJECTIVES`) |
| RTO | Defined per tier |
| Security event logging | 100% |
| Tenant-isolation tests | 100% pass |

Measurement is incremental. **Do not claim an SLO is met** without metrics/CI evidence.

### Recovery objectives (contracts)

| Tier | RPO | RTO |
| ---- | --- | --- |
| Lite | 24h | 24h |
| Pro | 4h | 8h |
| Enterprise | 1h | 4h |

---

## Health & uptime

```http
GET /api/public/health
GET /api/public/health?mode=live
GET /api/public/ready
```

- Liveness: cheap process + env-presence checks (no secret values in the body).
- Readiness: env + bounded database dependency probe (may return 503).
- Returns `x-correlation-id` / `x-request-id`.
- Uptime monitors: see `UPTIME_CHECKS` in `health.ts` and `READINESS_CHECKS` in `ready.ts`.

---

## PITR (production-class)

Supabase / Lovable Cloud can provide **point-in-time recovery** with restore to chosen recovery points. Enable PITR on Pro/Enterprise production projects via the platform dashboard (the app cannot flip this from code).

Also require: automated backups, network restrictions where available, SSL, MFA for operators, and **RLS** on every tenant table. Checklist: `pitr.ts` / `pitrGuidance(tier)`.

Restore drill evidence remains `src/lib/ops/recovery-drill.ts` + `scripts/ops/restore-drill.mjs`.

---

## Tracing policy

Full distributed tracing is **not** always on. Open spans only for justified paths:

`ai.assist` · `gate.decide` · `export.generate` · `submission.publish` · `entitlement.grant`

Correlation IDs join logs, audit rows, and metrics for everything else.

---

## Verification

```bash
bun test tests/unit/ops-control-plane.test.ts
bun run test:rls   # tenant isolation SLO evidence
```
