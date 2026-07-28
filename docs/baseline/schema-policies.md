# RLS policy inventory (T=0)

Source: `pg_policies` where `schemaname = 'public'` on 2026-07-25.
All 53 public tables have RLS enabled with at least one policy attached.

## Access shape summary

- **Public-read taxonomy** (`SELECT` to `public`): `ai_capabilities`,
  `business_functions`, `business_objectives`, `countries`,
  `external_module_links`, `gov_functions`, `industries`, plus published
  `use_cases` and public `collections` / `collection_items`.
- **Admin-managed taxonomy** (`ALL` to `authenticated` gated by `is_admin_tier`):
  `ai_capabilities`, `business_functions`, `business_objectives`,
  `gov_functions`, `industries`, `external_module_links`.
- **Workspace-scoped tenant data** (`authenticated` + `user_in_workspace`):
  `ai_use_cases`, `blueprints`, `data_readiness_assessments`,
  `feasibility_scores`, `integration_links`, `use_case_boards`, and their
  child join tables.
- **User-owned records** (`authenticated` + `auth.uid() = user_id`):
  `collections`, `collection_items`, `generated_reports`, `saved_use_cases`,
  `shortlists`, `portfolios`, `portfolio_items`.
- **Anonymous ingest** (`INSERT` to `anon,authenticated`): `lead_captures`,
  `module_events`, `cta_events`.
- **Audit + admin-only reads**: `audit_events`, `use_case_audit_log`,
  `lead_captures` (read), `cta_events` (read) restricted via
  `is_admin_tier(auth.uid())`.
- **Roles**: `user_roles` readable/writable only via
  `has_role` SECURITY DEFINER function; no direct anon access.

Every table's policies target the role sets `{authenticated}`, `{anon}`,
`{public}`, or a combination of these — no policies grant `service_role`
directly (service_role bypasses RLS by design and is used only from server
handlers via `client.server.ts`).

## How to re-generate

```sql
SELECT schemaname, tablename, policyname, cmd, roles::text
FROM pg_policies WHERE schemaname='public'
ORDER BY tablename, policyname;
```

Run via `supabase--read_query`. Full raw JSON was captured in the
2026-07-25 baseline turn.
