# T=0 Baseline — 2026-07-25

Read-only snapshot of the project state before further enhancement prompts.
No code, schema, or production data was changed to produce these files.

## Files

- [schema-tables.md](./schema-tables.md) — all `public` tables
- [schema-policies.md](./schema-policies.md) — RLS policy inventory
- [schema-functions.md](./schema-functions.md) — `public` routines
- [migrations-head.md](./migrations-head.md) — latest applied migration
- [env-inventory.md](./env-inventory.md) — env-var names + purpose (no values)
- [build-signal.md](./build-signal.md) — how to capture lint/typecheck/build/test signal

## Version map

| Slot                 | Value                                                     |
| -------------------- | --------------------------------------------------------- |
| Template             | `tanstack_start_ts_2026-05-29`                            |
| Editable tip         | Most recent AI message in Lovable History (this turn)     |
| Baseline pin         | Pin this message in the History tab as **BASELINE-T0**    |
| Published URL        | None (never published)                                    |
| Supabase project ref | `kkwwuifnfeyjotxvqkcf`                                    |
| Migration head       | `20260725094800_9af904b9-06fe-46ea-bb91-1dafa866b819.sql` |
| Edge functions       | None (all server logic uses `createServerFn`)             |
| Storage buckets      | `avatars` (private)                                       |

## Rollback

1. Primary: open Lovable **History**, revert to the pinned **BASELINE-T0** message.
2. Optional (if GitHub sync connected): `git checkout baseline/t0-2026-07-25`.
3. Database rollback is **not required** — this baseline made no schema changes.

## Guardrails honored

- No migrations applied.
- No secret values written to any file.
- No production data touched.
- No route, component, or config edits.
