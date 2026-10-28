# Production SLOs — UseCasesX

**Source of truth (code):** `src/lib/ops/control-plane/slo.ts`  
**Do not claim an SLO is met** without measurement evidence.

## Platform / product SLOs

| ID | Service | Target | Measurement |
| -- | ------- | ------ | ----------- |
| `platform_availability` | Platform availability | **99.9%** | Uptime on `/api/public/health` + synthetic journeys |
| `api_p95_latency` | API P95 latency | **&lt;500 ms** | `METRIC_NAMES.apiLatencyMs` histograms |
| `critical_transaction_success` | Critical transactions | **&gt;99.9%** | submit / gate decide / export / entitlement paths |
| `security_event_logging` | Security event logging | **100%** | `logSecurityEvent` + `SECURITY_CONTROL_EVENTS` |
| `tenant_isolation_tests` | Tenant isolation | **100% pass** | `bun run test:rls` (+ tenancy suites) |
| `background_job_success` | Cron / hook jobs | **&gt;99%** | `monitorJob` on `/api/public/hooks/*` |
| `readiness_probe_success` | Ready probe | **&gt;99.5%** | `/api/public/ready` returning 200 |

## Recovery objectives (RPO / RTO)

| Tier | RPO | RTO | Notes |
| ---- | --- | --- | ----- |
| Lite | 24h | 24h | Daily backup class |
| Pro | 4h | 8h | PITR recommended |
| Enterprise | 1h | 4h | PITR required for production-class |

See `RECOVERY_OBJECTIVES` and `docs/architecture/reliability-observability.md`.

## Error budgets (how to act)

- **Availability 99.9%** ≈ 43 minutes downtime / 30 days. Freeze risky deploys when budget is burning.
- **API P95 &gt;500 ms** for 15 minutes → open performance review (query review + indexes).
- **Job success &lt;99%** over 24h → page on-call; follow `docs/runbooks/application-down.md` if user-facing.

## Evidence checklist

1. Uptime monitor configured for `/api/public/health` and `/api/public/ready`
2. Structured logs include `correlationId`
3. `bun test tests/unit/ops-control-plane.test.ts`
4. RLS suite green in CI
5. Restore drill recorded (`recovery-drill.ts`) at least once per quarter for Enterprise
