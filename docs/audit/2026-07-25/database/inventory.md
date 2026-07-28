# Database inventory (T=0, 2026-07-25)

Read-only snapshot of the Lovable Cloud (Supabase) backend. Source:
`information_schema`, `pg_class`, `pg_policies`, `pg_constraint`,
`pg_indexes`, `pg_type`, `pg_trigger`, `storage.buckets` on 2026-07-25.

Migration head: `20260725094800_9af904b9-06fe-46ea-bb91-1dafa866b819.sql`
(see `docs/baseline/migrations-head.md`). No schema change since baseline.

## Headline counts

| Object          | Count |
| --------------- | ----- |
| Public tables   | 53    |
| Views           | 1     |
| Enums           | 5     |
| Routines        | 16    |
| Triggers        | 29    |
| Foreign keys    | 38    |
| Storage buckets | 1     |

**Row counts on tenant tables**: `workspaces`, `organizations`, `profiles`,
`user_roles`, `use_case_boards`, `ai_use_cases`, `use_cases`,
`use_case_submissions`, `portfolios`, `saved_use_cases` — **all zero**.
No production data is at risk during this audit window.

## Tables (53)

All 53 tables have **RLS enabled** and **≥1 policy** attached (verified via
`pg_class.relrowsecurity` and `pg_policies`).

Grouped by domain (see `entity-mapping.md`):

**Identity / access**

- `profiles` (19 cols) — 3 policies · ownership: `user_id NOT NULL`, FK → `auth.users`
- `user_roles` (4 cols) — 2 policies · ownership: `user_id NOT NULL`, FK → `auth.users`

**Organization / workspaces**

- `organizations` (8 cols) — 2 policies · no direct ownership column
- `workspaces` (8 cols) — 4 policies · `organization_id NOT NULL` (FK), `created_by NOT NULL`

**Repository (curated global catalogue)**

- `use_cases` (48 cols) — 12 policies · `submitted_by` FK → `auth.users`
- `use_case_industries`, `use_case_business_functions`, `use_case_business_objectives`,
  `use_case_capabilities`, `use_case_countries`, `use_case_gov_functions`,
  `use_case_links`, `use_case_metrics` — pure join tables, public-read + author-manage
- `use_case_patterns` (21 cols) — 3 policies
- `use_case_rating_aggregates` — **view** over `use_case_ratings`

**Taxonomy (curated + org-scoped drafts)**

- `industries`, `business_functions`, `business_objectives`, `ai_capabilities`,
  `gov_functions`, `countries` — public-read + admin-manage
- `taxonomy_sectors` (16 cols) — 5 policies · `organization_id` nullable, org-scoped drafts
- `taxonomy_tags`, `taxonomy_maturity_levels`, `taxonomy_meta`

**Studio / opportunities (tenant)**

- `use_case_boards` (9 cols) — 4 policies · `workspace_id NOT NULL`, `created_by NOT NULL`
- `ai_use_cases` (25 cols) — 4 policies · `board_id` FK, `created_by NOT NULL`
- `use_case_submissions` (16 cols) — 5 policies · `user_id NOT NULL`, FK → `auth.users`

**Design / scoring (tenant, keyed off `ai_use_cases`)**

- `blueprints`, `feasibility_scores`, `data_readiness_assessments`,
  `use_case_deliverables`, `integration_links`

**User-owned collections / portfolios**

- `collections` (8 cols) — 3 policies · `user_id NOT NULL`, FK → `auth.users`
- `collection_items` — 5 policies
- `portfolios` — 1 policy · `user_id NOT NULL`
- `portfolio_items` — 1 policy
- `shortlists` — 1 policy · `(user_id, use_case_id)` PK, both FK
- `saved_use_cases` — 1 policy · `user_id NOT NULL`, unique `(user_id, use_case_id)`

**Ratings / feedback**

- `use_case_ratings` (6 cols) — 2 policies · `user_id NOT NULL`
- `use_case_feedback` (9 cols) — 2 policies · `user_id NOT NULL`
- `use_case_scores` (12 cols) — 1 policy · `user_id NOT NULL`

**Integrations**

- `integration_events`, `integration_links`, `external_module_links`, `platform_modules`

**Reporting / analytics**

- `generated_reports` — 1 policy · `user_id NOT NULL`
- `use_case_downloads`, `use_case_views`, `module_events`, `cta_events`,
  `lead_captures` — anonymous ingest surfaces (see risk matrix)

**Audit**

- `audit_events` (8 cols) — 2 policies · `actor_id` (nullable)
- `use_case_audit_log` — 2 policies

## Views (1)

- `use_case_rating_aggregates` — read-only aggregate over `use_case_ratings`.

## Enums (5)

| Enum                  | Values                                                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `app_role`            | admin, moderator, contributor, viewer, super_admin, ai_hub_admin, usecasex_admin, content_manager, reviewer, editor, user |
| `maturity_stage`      | concept, prototype, pilot, production, scaled                                                                             |
| `submission_status`   | draft, submitted, in_review, approved, rejected                                                                           |
| `use_case_status`     | draft, review, published, archived, submitted_for_review, approved, unpublished                                           |
| `use_case_visibility` | free_lite, pro, both, hidden                                                                                              |

## Routines (16) — all `SECURITY DEFINER` with `search_path = public`

See `docs/baseline/schema-functions.md`. Highlights:

- Predicates: `has_role`, `is_admin_tier`, `is_editor_tier`,
  `has_pro_entitlement`, `user_in_workspace`, `user_can_access_use_case`,
  `user_org_id`, `collection_is_accessible`, `collection_is_owned`
- Provisioning: `ensure_user_workspace`, `handle_new_user`
- Trigger bodies: `audit_use_case_boards`, `audit_use_cases`,
  `sync_sector_published`, `update_updated_at_column`
- Integration payload: `get_use_case_integration_package`

## Triggers (29)

`BEFORE UPDATE` `updated_at` maintainers on 15 tables. `AFTER
INSERT/UPDATE/DELETE` audit writers on `use_cases` and `use_case_boards`.
`BEFORE INSERT/UPDATE` publish-mirror on `taxonomy_sectors`.

## Foreign keys (38)

Complete map dumped from `pg_constraint`. Highlights:

- FK → `auth.users(id)` exists on only **7 tables**:
  `profiles`, `user_roles`, `collections`, `shortlists`, `module_events`,
  `use_case_submissions` (both `user_id` and `reviewed_by`), `use_cases.submitted_by`.
- FK → `auth.users` **missing** on: `ai_use_cases.created_by`,
  `use_case_boards.created_by`, `feasibility_scores.created_by`,
  `portfolios.user_id`, `saved_use_cases.user_id`, `use_case_ratings.user_id`,
  `use_case_feedback.user_id`, `use_case_scores.user_id`,
  `use_case_deliverables.created_by`, `blueprints` (no ownership col),
  `generated_reports.user_id`, `integration_events.user_id`,
  `use_case_downloads.user_id`, `use_case_views.user_id`.
- All Studio-child tables cascade correctly through
  `ai_use_cases → use_case_boards → workspaces`.

## Indexes on ownership columns (13)

Covered: `use_case_boards(workspace_id)`, `workspaces(organization_id)`,
`profiles(user_id)` (unique), `saved_use_cases(user_id)` +
`(user_id, use_case_id)`, `shortlists(user_id, use_case_id)`,
`portfolios(user_id)`, `use_case_ratings(use_case_slug, user_id)`,
`use_case_scores(user_id)` + `(user_id, use_case_id)`,
`user_roles(user_id, role)`, `module_events(user_id)`,
`integration_events(user_id)`.

Missing but low-priority: `ai_use_cases(board_id)`,
`ai_use_cases(created_by)`, `use_case_boards(created_by)`,
`use_case_submissions(user_id, status)`.

## Storage buckets (1)

| Bucket    | Public |
| --------- | ------ |
| `avatars` | No     |

## How to re-run

```sql
-- tables + RLS state
SELECT c.relname, c.relrowsecurity,
       (SELECT count(*) FROM pg_policies p
         WHERE p.schemaname='public' AND p.tablename=c.relname) AS policies
FROM pg_class c
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind='r'
ORDER BY c.relname;
```
