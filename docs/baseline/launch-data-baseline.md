# Launch Data Baseline (C1 / C3)

Status: **complete** — 2026-07-28
Prompt: PROMPT-18 — seed the launch data baseline

The remixed project started with an empty database (0 users, 0 rows), which
blocked the RLS, tenancy and authz isolation suites. This document records the
baseline that was seeded and how to reproduce it.

## What is seeded

### 1. Canonical taxonomy (public reference data)

| Table                  | Rows |
| ---------------------- | ---- |
| `industries`           | 18   |
| `ai_capabilities`      | 20   |
| `business_functions`   | 20   |
| `business_objectives`  | 17   |

### 2. Reference repository content

36 **published** use cases (2 per industry), each with industry, capability,
business-function and objective junctions plus two headline metrics.
Visibility `both`, status `published` — readable by anonymous visitors, which is
what the Lite discovery journey requires.

This is deliberately a *small* reference set. The full 180-record catalogue is
still available via `scripts/seed/emit.py`.

### 3. Demo accounts

Password: `Demo@123` (override with `SMOKE_DEMO_PASSWORD`).

| Email                          | Plan       | Role      |
| ------------------------------ | ---------- | --------- |
| `admin@demo.usecasex.app`      | enterprise | admin     |
| `moderator@demo.usecasex.app`  | pro        | moderator |
| `enterprise@demo.usecasex.app` | enterprise | —         |
| `pro@demo.usecasex.app`        | pro        | —         |
| `lite@demo.usecasex.app`       | lite       | —         |

Each account gets its own organization, default workspace, owner-level
organization + workspace membership rows and an entitlement row via
`ensure_user_workspace()`. Roles live in `user_roles` only.

These are demo/QA accounts, not production records. Rotate or remove them before
any production cut-over.

## Reproducing

```bash
bun run seed:baseline        # taxonomy + 36 published reference use cases (idempotent)
bun run seed:demo-accounts   # 5 demo accounts + tenancy provisioning (idempotent)
```

`seed:demo-accounts` requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
in the environment; it is a server-side script and never runs in the browser.

## Schema change

One additive migration: a zero-argument overload of
`public.ensure_user_workspace()` that resolves `auth.uid()` internally, so
signed-in clients can provision without supplying an ID. `EXECUTE` is revoked
from `PUBLIC` and granted to `authenticated` + `service_role` only. The existing
`ensure_user_workspace(uuid)` is unchanged.

## Verification evidence

| Check                                   | Result |
| --------------------------------------- | ------ |
| `bun run test:rls`                      | PASS — cross-tenant read/update/delete all denied |
| `bun run test:tenancy`                  | PASS — distinct tenants, membership-derived roles, no self-granted entitlements |
| `bun run test:rls:taxonomy`             | PASS — 18/18 checks, no tenant-private leakage to anon |
| `bun run lint`                          | 0 errors, 255 warnings (tracked `no-explicit-any` debt) |
| `tsgo` typecheck                        | PASS |
| C3 — tenancy backfill on insert         | PASS — new board + `ai_use_cases` rows resolve `organization_id` + `workspace_id` automatically |

## Rollback

The seed is additive and idempotent. To reverse:

- reference content: `DELETE FROM use_cases WHERE slug LIKE '<industry>-%'` (junctions cascade)
- demo accounts: delete the five users through the admin API; their org,
  workspace, membership and profile rows cascade from `auth.users`
- migration: `DROP FUNCTION public.ensure_user_workspace();` (zero-arg overload only)
