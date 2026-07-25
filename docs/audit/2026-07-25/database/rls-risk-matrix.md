# RLS risk matrix (T=0, 2026-07-25)

All 53 public tables have RLS enabled with ≥1 policy. This matrix
classifies residual risk for the 14 August launch. Risk = **Low** unless
called out.

Legend:
- **Anon-reach**: policy grants `anon` or `public` role access.
- **Ownership**: how the row's owner is expressed.
- **Ident-forgery risk**: can a caller INSERT/UPDATE a row claiming to be
  another user? (checked via `WITH CHECK` on the policy).

## High (verify before 14 August)

| Table                  | Anon-reach          | Ownership                     | Risk / rationale                                                                                                              |
| ---------------------- | ------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `lead_captures`        | INSERT to anon+auth | none                          | Public form. Confirm rate-limit + email/text length caps in `WITH CHECK`. PII: email, name — admin-only SELECT (verified).    |
| `cta_events`           | INSERT to public    | `user_id` nullable            | Confirm `WITH CHECK (user_id IS NULL OR user_id = auth.uid())`. Otherwise anon can forge `user_id`.                            |
| `module_events`        | INSERT to anon+auth | `user_id` nullable            | Same forgery check as `cta_events`.                                                                                            |
| `use_case_downloads`   | INSERT to anon+auth | `user_id` nullable            | Same forgery check. Downloads are used to gauge Founding Access fair-use.                                                     |
| `use_case_submissions` | authenticated-only  | `user_id NOT NULL`, FK        | 5 policies — verify status transitions: draft/submitted editable by owner; approved/rejected only editable by admins.          |
| `taxonomy_sectors`     | public read (published) + org-scoped drafts | `organization_id` nullable | "Org members read org sectors" policy — verify it can't leak drafts across orgs. Uses `user_org_id(auth.uid())`.     |

## Medium

| Table              | Notes                                                                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `user_roles`       | No direct client-readable policy (intentional — read via `has_role` SECURITY DEFINER). Confirm UI never queries the table directly.                     |
| `profiles`         | Users read/insert/update own only. No admin SELECT policy — admins cannot list users from client. Confirm admin flows go through server functions.     |
| `audit_events`     | 2 policies (SELECT for admin/self, INSERT via triggers). Confirm no UPDATE/DELETE policy exists (append-only).                                          |
| `use_case_audit_log` | Same as above.                                                                                                                                        |
| `use_case_feedback`| Users manage own; admins manage all. `is_public` + `is_hidden` flags used by public API — verify server route filters both.                              |
| `use_case_ratings` | Unique per `(use_case_slug, user_id)` — good. Admins can read all; no public aggregate SELECT (view `use_case_rating_aggregates` handles that).         |
| `organizations`    | "Members read own org" via `user_org_id`; "Admin tier manages orgs". Confirm creating an org from client is blocked (only `ensure_user_workspace`).     |
| `taxonomy_sectors` | Also listed High — call out here for the medium-severity concern that publish flow (`sync_sector_published` trigger) sets `reviewed_by = auth.uid()`.   |

## Low

- All curated `use_cases` + join tables — public-read filtered by
  `status='published'` and `visibility IN ('free_lite','pro','both')`;
  admin-tier bypass via `is_admin_tier`.
- Taxonomy: `industries`, `business_functions`, `business_objectives`,
  `ai_capabilities`, `gov_functions`, `countries`,
  `taxonomy_maturity_levels`, `taxonomy_tags`, `taxonomy_meta` — public-read
  + admin-manage.
- Studio tenant tables (`ai_use_cases`, `blueprints`, `feasibility_scores`,
  `data_readiness_assessments`, `integration_links`,
  `use_case_deliverables`) — gated by `user_in_workspace(auth.uid(), b.workspace_id)`
  through their parent board.
- User-owned collections/portfolios — `auth.uid() = user_id` throughout.

## Cross-cutting checks (all Low but worth documenting)

- **No policy targets `service_role`** — correct; `service_role` bypasses
  RLS. Server functions using `supabaseAdmin` must never accept
  client-supplied `user_id` / `created_by` values. Audit callers in
  `src/lib/*.functions.ts` as a follow-up.
- **No table is missing RLS** — verified.
- **No table has 0 policies** — verified.
- **Only 7 of 25 ownership columns FK to `auth.users`** — orphan risk
  after user deletion. Not exploitable, but breaks referential integrity.
  Recommended additive migration in `migration-plan.md`.

## Re-verification query

```sql
SELECT c.relname, c.relrowsecurity,
       (SELECT count(*) FROM pg_policies p
         WHERE p.schemaname='public' AND p.tablename=c.relname) AS policies
FROM pg_class c
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind='r'
  AND (NOT c.relrowsecurity
       OR (SELECT count(*) FROM pg_policies p
             WHERE p.schemaname='public' AND p.tablename=c.relname) = 0);
-- Expect: 0 rows.
```
