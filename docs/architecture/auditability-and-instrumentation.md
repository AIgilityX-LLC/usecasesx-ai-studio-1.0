# Auditability & Launch Instrumentation

Status: implemented (PROMPT-15 + ADR 0011). Applies to Lite, Pro Founding Access and
Enterprise — one codebase, one event vocabulary.

Canonical compliance model: `docs/architecture/audit-event-architecture.md`
and `src/lib/audit/`.

## Why

Three different questions need answering after launch, and they must not be
mixed:

| Question                                           | Surface                          | Store / module |
| -------------------------------------------------- | -------------------------------- | -------------- |
| "Who changed what, when, in which workspace?"      | governance / enterprise evidence | `audit_events` · `src/lib/audit` |
| "Are people actually getting through the journey?" | launch learning                  | `product_events` · `src/lib/telemetry` |
| "What failed in this request?"                     | ops debugging                    | structured logs · `ops/control-plane` |

Audit and product streams are **append-only**, **tenant-scoped** and
**attributable**. Neither ever stores secrets, prompt text or personal data.
Debug logs never land in `audit_events`.

## Data model

### `audit_events` (extended, additive)

Canonical **AuditEvent** fields (see ADR 0011). Stable DB names alias to the
domain model (`organization_id` → `tenant_id`, `entity_*` → `resource_*`,
`previous_value`/`new_value` → `before_state`/`after_state`, `created_at` →
`timestamp`). Compliance columns: `actor_type`, `session_id`, `context`,
`result`, `metadata`, plus earlier `request_id`, `severity`, `source`.

Access:

- **insert** — authenticated caller, only with `actor_id = auth.uid()`.
- **select** — own records; tenant org owners/admins for their
  `organization_id`; platform admins (`is_admin_tier`) see all.
- **update / delete** — denied to application roles via missing policies,
  `REVOKE`, and `audit_events_deny_mutation` trigger.

### `product_events` (new)

`user_id`, `organization_id`, `workspace_id`, `event_name`, `entity_type`,
`entity_id`, `request_id`, `properties` (redacted JSON), `created_at`.
Same append-only posture and the same read scoping.

### `activation_funnel_daily` (view)

Daily rollup: `day`, `workspace_id`, `organization_id`, `event_name`,
`event_count`, `user_count`. Read through the view so no surface has to
hand-roll funnel SQL. The view inherits the underlying RLS.

## Event vocabulary

Single source of truth: `src/lib/telemetry/events.ts` (client-safe).

- `AUDIT_EVENTS` — entity create/update/archive/delete, membership invited /
  added / removed, role changed, entitlement changed, export & report
  generated, `ai.assist.used`, `ai.assist.denied`, `admin.action`.
- `PRODUCT_EVENTS` — registration, workspace created, opportunity captured,
  use case completed, use case scored, portfolio created, report exported,
  workshop started, advisory requested.
- `ACTIVATION_FUNNEL` — the ordered subset of product events that defines
  activation, from registration to first export.

Adding a new event means adding it to this catalogue. Free-text event names
are not allowed anywhere in the codebase.

## Recorders

| Module                                 | Runtime            | Use from                         |
| -------------------------------------- | ------------------ | -------------------------------- |
| `src/lib/audit/write.server.ts`        | server only        | preferred append for new paths   |
| `src/lib/audit/audit.functions.ts`     | server fn wrappers | tenant admin filter + export     |
| `src/lib/telemetry/recorder.ts`        | browser            | domain repositories, UI handlers |
| `src/lib/telemetry/recorder.server.ts` | server only        | bridges to `appendAuditEvent`    |
| `src/lib/telemetry.functions.ts`       | server fn wrappers | activation + entity audit reads  |

Both recorders write through an RLS-scoped client, so a caller can only write
records attributed to themselves. Every write is **fire-and-forget**:
instrumentation failure logs a warning and never breaks the user's action.

Tenant scope is set once, when the workspace context resolves
(`useWorkspaceContext` → `setTelemetryTenant`), so callers never pass
organization/workspace ids by hand.

## Correlation

Every record carries a `request_id`. A single user action that produces both an
audit record and a product event shares one id (`recordAuditEvent` returns it;
pass it into `recordProductEvent`). `logAppError` / `logServerError` print the
same id, so a support question can be traced from a console line to the exact
governance record without a log aggregation product.

**Phase 7:** Prefer `src/lib/ops/control-plane/` for new server paths — structured
JSON logs, `x-correlation-id`, SLOs, health, and justified spans. See
`docs/architecture/reliability-observability.md`.

## Privacy rules (enforced in code, not by policy text)

`redact()` / `redactRecord()` run on every payload before it is written:

- keys matching secret, token, key, password, authorization, cookie, session,
  bearer, credential, signature, salt, hash → `[redacted]`
- keys matching prompt, completion, message, content, transcript → `[redacted]`
  (no prompt or model output is ever stored in telemetry)
- keys matching email, phone, address, ssn, dob, full_name → `[redacted]`
- strings truncated at 512 chars, objects depth-limited, arrays capped

Error logging uses `safeErrorShape()`, which keeps only `name` and `message`.

## Producers wired

- `src/lib/domain/portfolios.repository.ts` — create / update / archive /
  delete + `portfolio.created` activation event.
- `src/lib/domain/saved-use-cases.repository.ts` — save, unsave, edit, score
  - `use_case.scored` activation event.
- `src/lib/ai/service.server.ts` — `ai.assist.used` on validated success and
  `ai.assist.denied` when the entitlement check refuses the call. Model,
  prompt _version_ and duration are recorded; prompt text is not.

## Reading the data

- `queryAuditEventsFn` / `exportAuditEventsFn` — authorized tenant admins and
  platform auditors (`src/lib/audit/audit.functions.ts`).
- `getActivationFunnelFn` / `getEntityAuditTrailFn` — activation rollup and
  entity trail (`src/lib/telemetry.functions.ts`).

All are `requireSupabaseAuth`-protected and return a typed `{ …, error }` shape
rather than throwing, so reporting surfaces degrade to empty states.

## Tests

- `bun run test:unit` — `tests/unit/telemetry.test.ts`: catalogue integrity,
  correlation-id uniqueness, redaction depth/truncation, error shaping.
- `bun run test:audit` — `tests/audit-immutability.e2e.ts`: append allowed,
  update denied, delete denied, cross-actor forgery denied (audit _and_
  product events), activation countable by day + workspace.

## Rules for new code

1. Never insert into `audit_events` / `product_events` directly — go through
   `appendAuditEvent` / a telemetry recorder.
2. Never invent an event name — extend the catalogue.
3. Never pass raw request bodies, prompts or user text as `properties`.
4. Never make a user-facing action depend on a telemetry write succeeding.
5. Governance-relevant mutations (ownership, membership, roles, entitlements,
   exports, admin actions) MUST emit an audit event in the same code path.
6. Never write debug / structured ops logs into `audit_events`.
7. Never UPDATE or DELETE audit history from application code (including demos).
