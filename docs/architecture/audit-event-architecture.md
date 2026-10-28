# Audit Event Architecture

Status: implemented (ADR 0011). One codebase for Lite / Pro / Enterprise.

## Purpose

Record **who did what, to which resource, with what outcome** for security-sensitive
and material business operations. This is the compliance / governance evidence
stream — not a debugger.

| Concern | Store | Module |
| ------- | ----- | ------ |
| Compliance / business audit | `audit_events` | `src/lib/audit` |
| Launch learning / activation | `product_events` | `src/lib/telemetry` |
| Application debugging | stdout JSON lines | `src/lib/ops/control-plane/logging.ts` |

Mixing these streams is a defect.

## AuditEvent shape

| Domain field | DB column | Notes |
| ------------ | --------- | ----- |
| `id` | `id` | UUID PK |
| `tenant_id` | `organization_id` | Tenant scope |
| `workspace_id` | `workspace_id` | Optional workspace scope |
| `actor_id` | `actor_id` | Subject user (or null for system rows via service path) |
| `actor_type` | `actor_type` | `user` \| `system` \| `service` \| `support` |
| `event_type` | `event_type` | Catalogue in `AUDIT_EVENTS` |
| `resource_type` | `entity_type` | Resource class |
| `resource_id` | `entity_id` | Resource id |
| `timestamp` | `created_at` | Server clock |
| `request_id` | `request_id` | Correlation across audit + product + logs |
| `session_id` | `session_id` | Auth session when available |
| `context` | `context` | `{ ip, userAgent, path, method, region }` |
| `before_state` | `previous_value` | Redacted JSON |
| `after_state` | `new_value` | Redacted JSON |
| `result` | `result` | `success` \| `failure` \| `denied` \| `partial` |
| `metadata` | `metadata` | Redacted JSON |
| `severity` / `source` | same | Operational classification |

## Immutability

Normal application users (and authenticated roles generally) **cannot** modify or
delete audit history:

1. No `FOR UPDATE` / `FOR DELETE` RLS policies.
2. `REVOKE UPDATE, DELETE` from `anon` and `authenticated`.
3. Trigger `audit_events_deny_mutation` raises on UPDATE/DELETE even for privileged clients.

Inserts remain attributable: `WITH CHECK (actor_id = auth.uid())` for authenticated.

## Writers

| API | Runtime | Use |
| --- | ------- | --- |
| `appendAuditEvent` | server | Preferred for new server paths |
| `writeAuditEvent` / `recordAuditEvent` | server / browser | Legacy telemetry bridge → same insert shape |
| `AuditService` | anywhere (pure) | Vocabulary, filters, export serializers |

All payloads pass through `redactRecord` before insert. Instrumentation failure
must never break the user action.

## Readers (filter / export)

Authorized **tenant administrators** (organization `owner` / `admin`) and
**platform auditors** (`is_admin_tier`):

- `queryAuditEventsFn` — filtered page (limit ≤ 500)
- `exportAuditEventsFn` — JSON or CSV package (limit ≤ 5 000); emits `export.generated` on `audit_events` itself

Filters: tenant, workspace, actor, actor type, event type, resource, result,
request id, time range, free-text `q`.

Ordinary contributors may still see entity-scoped trails where existing RLS
allows (own actor rows / entity UIs) — they cannot run tenant-wide export.

## Required categories

Mutations in these categories **must** emit an audit event on the same code path:

`authz` · `membership` · `role` · `entitlement` · `export` · `admin` ·
`ai.assist` · `lifecycle` · `gate` · `evidence` · `handoff`

See `AUDIT_REQUIRED_CATEGORIES` in `src/lib/audit/service.ts`.

## Migration

`supabase/migrations/20261028120000_audit_event_architecture.sql` — additive
columns, indexes, REVOKE, trigger, tenant-admin SELECT policy.

## Tests

- `tests/unit/audit-event.test.ts` — mapping, filters, export, redaction bridge
- `bun run test:audit` — append allowed; update/delete denied; forgery denied
