# Auditability & Launch Instrumentation

Status: implemented (PROMPT-15). Applies to Lite, Pro Founding Access and
Enterprise — one codebase, one event vocabulary.

## Why

Two different questions need answering after launch, and they must not be
mixed:

| Question                                           | Surface                          | Table            |
| -------------------------------------------------- | -------------------------------- | ---------------- |
| "Who changed what, when, in which workspace?"      | governance / enterprise evidence | `audit_events`   |
| "Are people actually getting through the journey?" | launch learning                  | `product_events` |

Both are **append-only**, **tenant-scoped** and **attributable**. Neither ever
stores secrets, prompt text or personal data.

## Data model

### `audit_events` (extended, additive)

Existing columns kept. Added: `organization_id`, `workspace_id`, `request_id`,
`severity` (`info` | `notice` | `warning` | `critical`), `source`.

Access:

- **insert** — authenticated caller, only with `actor_id = auth.uid()`.
- **select** — own records; workspace owners/admins see their workspace;
  platform admins (`is_admin_tier`) see all.
- **update / delete** — denied to every application role. Immutability is
  enforced by the absence of policies, not by convention.

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
  workshop started, advisory requested, plus privacy-conscious navigation
  events (`nav.*` — see `docs/analytics/navigation-events.md`).
- `ACTIVATION_FUNNEL` — the ordered subset of product events that defines
  activation, from registration to first export. Navigation `nav.*` events
  are **not** part of the activation funnel.

Adding a new event means adding it to this catalogue. Free-text event names
are not allowed anywhere in the codebase.

## Recorders

| Module                                 | Runtime            | Use from                         |
| -------------------------------------- | ------------------ | -------------------------------- |
| `src/lib/telemetry/recorder.ts`        | browser            | domain repositories, UI handlers |
| `src/lib/telemetry/recorder.server.ts` | server only        | server functions, `AIService`    |
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

`getActivationFunnelFn` (daily activation, optional date range and workspace)
and `getEntityAuditTrailFn` (last 100 records for one entity) in
`src/lib/telemetry.functions.ts`. Both are `requireSupabaseAuth`-protected and
return a typed `{ rows, error }` shape rather than throwing, so a reporting
surface degrades to an empty state instead of an error screen.

## Tests

- `bun run test:unit` — `tests/unit/telemetry.test.ts`: catalogue integrity,
  correlation-id uniqueness, redaction depth/truncation, error shaping.
- `bun run test:audit` — `tests/audit-immutability.e2e.ts`: append allowed,
  update denied, delete denied, cross-actor forgery denied (audit _and_
  product events), activation countable by day + workspace.

## Rules for new code

1. Never insert into `audit_events` / `product_events` directly — go through a
   recorder.
2. Never invent an event name — extend the catalogue.
3. Never pass raw request bodies, prompts or user text as `properties`.
4. Never make a user-facing action depend on a telemetry write succeeding.
5. Governance-relevant mutations (ownership, membership, roles, entitlements,
   exports, admin actions) MUST emit an audit event in the same code path.
