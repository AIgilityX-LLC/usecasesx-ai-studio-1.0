# Fair-Use Policy — Complimentary Pro Founding Access

**Effective:** launch 14 Aug 2026 → **31 December 2026**.
**Scope:** Policy only. No billing. Enforcement mechanism is a P1 backlog item; if not ready by 9 Aug feature freeze, ship as **advisory meter with server-side logging and manual review**.

## Per Pro user / workspace / calendar month

| Metric                  | Soft warn (80%) | Hard cap (100%) |
| ----------------------- | --------------- | --------------- |
| Use cases created       | 40              | 50              |
| Scores computed         | 160             | 200             |
| Deliverable exports     | 40              | 50              |
| AI Gateway calls        | 400             | 500             |
| Board shares            | 16              | 20              |
| Opportunity submissions | 80              | 100             |

## Behaviour

- At 80%: non-blocking banner on the affected surface.
- At 100%: action blocked with a CTA "Contact us for Enterprise Design Partner access". Read access always preserved.
- No credit-card wall. No downgrade to Lite.

## Data model (proposed, additive only — not built in this plan)

- `entitlements` — one row per workspace per period with limits + edition.
- `usage_events` — append-only, one row per counted action with `user_id`, `workspace_id`, `event_type`, `occurred_at`.
- Aggregation via SQL view; server function returns current meter to UI.

## Fallback if enforcement slips past freeze

Ship advisory meter reading `usage_events` counts; **do not block actions**. Track abuse manually via admin dashboard; hard cap ships as a post-launch P2 change.

## Anti-abuse

- Rate-limit at server-function level.
- `auth.uid()` scoping on every counted write.
- No client-trusted counters.
