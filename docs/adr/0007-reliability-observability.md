# ADR 0007 — Operational control plane (reliability & observability)

- **Status:** Accepted (Phase 7 — 2026-10-28)
- **Deciders:** Engineering (UseCasesX control plane)
- **Related:** `docs/architecture/reliability-observability.md`, auditability-and-instrumentation.md

## Context

The product already had telemetry, export/AI observability, recovery drills, and cron hooks — but no single operational contract for SLOs, health/uptime, structured logs, metrics vocabulary, alerts, or PITR expectations.

## Decision

1. Introduce `src/lib/ops/control-plane/` as the reliability/observability control plane.
2. Publish SLO targets (availability 99.9%, API P95 &lt;500 ms, critical success &gt;99.9%, RPO/RTO per tier, 100% security logging, 100% tenant-isolation test pass).
3. Expose `GET /api/public/health` for uptime checks with correlation headers.
4. Centralize structured JSON logging and light spans for justified critical paths only.
5. Document PITR as an **operator** enablement on production-class Supabase/Lovable projects (not app-toggled).
6. Reuse existing audit/product/security event catalogues — do not fork event vocabularies.

## Consequences

- Ops and CI have a named place for SLO/alert/health contracts.
- Claiming SLO compliance requires evidence (metrics, CI, restore drills) — catalogue alone is not proof.
- Full APM/OpenTelemetry SDKs remain optional; correlation IDs are mandatory for new server paths.
