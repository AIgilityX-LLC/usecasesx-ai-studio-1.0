# ADR 0011 — Immutable application audit events

- **Status:** Accepted (2026-10-28)
- **Related:** `docs/architecture/audit-event-architecture.md`, `docs/architecture/auditability-and-instrumentation.md`, ADR 0007

## Context

UseCasesX needs a single governance evidence stream for security-sensitive and material business operations. Product activation events and ops debug logs answer different questions and must stay separate. Callers had begun inserting into `audit_events` with inconsistent shapes, and tenant administrators lacked a first-class filter/export API.

## Decision

1. Treat `public.audit_events` as the **canonical immutable AuditEvent** store with domain fields: `id`, `tenant_id` (→ `organization_id`), `actor_id`, `actor_type`, `event_type`, `resource_type`/`resource_id` (→ `entity_*`), `timestamp` (→ `created_at`), `request_id`, `session_id`, `context`, `before_state`/`after_state` (→ `previous_value`/`new_value`), `result`, `metadata`.
2. Centralize writers under `src/lib/audit` (`appendAuditEvent` / telemetry bridge). No direct table inserts from new domain code.
3. Enforce immutability with **no UPDATE/DELETE policies**, **REVOKE** of those privileges from `authenticated`/`anon`, and a **BEFORE UPDATE/DELETE trigger**.
4. Expose `queryAuditEventsFn` / `exportAuditEventsFn` for org owners/admins and platform auditors only.
5. Keep `product_events` for launch learning and `ops/control-plane` structured logs for debugging — never write those into `audit_events`.

## Consequences

- Demo/workspace resets must not erase audit history.
- Additive columns require a migration before writers populate new fields in production.
- Enterprise Administration Center Audit Logs section can bind to the new query/export APIs.
