# 08 — Database, Migrations, and Data

Supabase stays. It is the one component that does **not** get rewritten — 108 tables, RLS policies,
`SECURITY DEFINER` functions, storage buckets, and 16 ordered migrations carry over unchanged.

## Ground rules

1. **Additive only** until 30 days after launch. The rollback plan is "repoint DNS to the legacy app
   against the same database" — that only works while the schema remains backward-compatible.
2. Every `CREATE TABLE public.x` is followed, in the same migration, by
   `GRANT` → `ENABLE ROW LEVEL SECURITY` → `CREATE POLICY`. A migration without grants is incorrect:
   PostgREST returns permission errors even with correct policies.
3. Grants match policies. Drop `anon` when every policy scopes to `auth.uid()`. Always grant
   `service_role` for tables the API touches privileged.
4. Roles live only in `public.user_roles`, read through the `SECURITY DEFINER` `has_role()` function.
   Never on `profiles`.
5. New columns are nullable or defaulted. Backfills are a separate, idempotent, resumable step.
6. Never rename a live column: add the new one, dual-write, migrate readers, retire later.
7. Time-dependent validation goes in triggers, not `CHECK` constraints (`CHECK` must be immutable).
8. Reserved schemas are off limits: `auth`, `storage`, `realtime`, `supabase_functions`, `vault`.
   No triggers on them either.
9. No destructive statement (`DROP`, `DELETE FROM`, `TRUNCATE`, destructive `ALTER`) without a
   recorded entry in `docs/release/migration-manifest-*.md` and a rollback path in the PR.

## Migration workflow

```bash
supabase migration new add_workspace_subscriptions
# edit packages/db/migrations/<ts>_add_workspace_subscriptions.sql
pnpm check:migrations          # GRANT/RLS/POLICY quartet + destructive scan + ordering
supabase db push --linked      # preview project first
pnpm db:types                  # regenerate packages/db/src/types.ts
pnpm test:rls                  # cross-workspace isolation must stay green
```

CI runs `check:migrations` and `test:rls` on every PR. Production application is a deliberate,
reviewed step by the tech lead — never automatic on merge.

## Tenancy model

Every tenant row carries `workspace_id`. Policies follow one of three shapes:

```sql
-- owner-scoped
using (auth.uid() = user_id)

-- workspace-member-scoped
using (public.is_workspace_member(auth.uid(), workspace_id))

-- public read of published content only
create policy "published are public" on public.use_cases
  for select to anon using (status = 'published' and visibility = 'public');
```

**The hidden-row trap.** Any visibility state (draft / pending / private / archived / soft-deleted)
means the public policy filters those rows out *for the owner too*. Every such table needs, in the
same change: an owner-scoped SELECT policy, owner-scoped fetchers on every surface that must show
hidden rows (dashboard, my-use-cases, edit views), and post-create navigation that lands somewhere
able to read the new row. Postgres applies SELECT policies to `UPDATE`/`DELETE` `WHERE` clauses too,
so without the owner SELECT policy owners cannot even target their own hidden rows. This is the
"I created it but it doesn't show up" class of bug.

## Privileged operations

Publishing a submission bypasses the author's RLS scope by design. It runs through
`public.publish_use_case_submission(...)` — a `SECURITY DEFINER` function with a pinned
`search_path = public` — called from the API **after** `has_role(caller, 'admin')` returns true.

Rule: `SECURITY DEFINER` functions must pin `search_path`, validate every argument, and be granted
`EXECUTE` only to the roles that need it. Prefer a definer function over reaching for the service-role
key; the function is auditable and narrow.

## Storage

Buckets: `avatars`, `benefit-evidence`, `canvas-documents`.

- MIME allow-list, extension allow-list, and size ceilings enforced in API code on every upload path,
  because bucket-level ceilings are not settable on this managed backend.
- Signed URLs: short TTL (≤ 15 minutes for evidence documents, ≤ 60 for avatars). The API
  **re-verifies** the caller's access to the parent record before minting a URL — never mint from a
  client-supplied path alone.
- Every download mints an entry in the export/download audit log.
- User-facing upload errors state the actual constraint ("PDF, DOCX or PNG up to 10 MB"), not a raw
  provider error.

## Audit and append-only tables

Audit, pilot audit, submission audit, billing events, and email deliveries are append-only.
Corrections are new rows. Revoke `UPDATE` and `DELETE` from `authenticated` on these tables so the
immutability is enforced by grants, not convention. `tests/unit/audit-immutability` and
`tests/audit-immutability.e2e.ts` port across and must stay green.

## Seed and reference data

- Reference data (54 launch-corpus use cases, taxonomy, collections, editions, plans) is applied by
  idempotent scripts under `scripts/seed/`, keyed by natural identifiers so re-running is safe.
- Demo and sample data is **flagged** (`is_demo`) and excluded from public listings, analytics, and
  customer reporting.
- Never seed from application code, page loads, or server functions. Never seed production from a
  developer machine — run it as a reviewed CI job.

## Production data hygiene (pre-launch, currently failing)

1. No demo or test account holds a platform-admin role.
2. All demo tenants carry the demo flag and are excluded from analytics.
3. Public content is intended: published use cases, collections, taxonomy, featured items, edition
   config, limits, and the Founding Access end date (31 December 2026) all verified.
4. Anonymous and cross-tenant reads return zero rows for all 14 private tables (automated sweep).
5. Legal, help, and contact destinations point at production addresses, not placeholders.
6. Debug flags off; no seed secret or placeholder identity reachable publicly.

The automated audit lives in the admin console (`administration/production-data`); port it and require
a zero-findings run as a launch gate.

## Backups and recovery

Backups and PITR are operated by the managed platform; restore is a support request, not self-serve.
The documented rebuild path is: ordered migration set → launch-corpus reference script → restore of
tenant data from the platform snapshot. Rehearse quarterly with `scripts/ops/restore-drill.mjs` and
record restore time and owner in the recovery status record.
