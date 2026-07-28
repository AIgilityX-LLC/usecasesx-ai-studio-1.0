# Tenancy RLS Design — membership-based policies

Companion to `docs/architecture/tenancy-migration-plan.md`. **Design only — no policy has
been created or altered.**

Principle: _access is derived from membership, never from a value the client supplies._

---

## 1. Helper functions (SECURITY DEFINER, STABLE, `SET search_path = public`)

| Function                                                           | Returns | Body summary                                                                                  |
| ------------------------------------------------------------------ | ------- | --------------------------------------------------------------------------------------------- |
| `is_org_member(_user_id, _org_id)`                                 | boolean | EXISTS row in `organization_members` with `status='active'`                                   |
| `org_role(_user_id, _org_id)`                                      | text    | role from `organization_members`, NULL if not a member                                        |
| `is_workspace_member(_user_id, _ws_id)`                            | boolean | EXISTS row in `workspace_members`                                                             |
| `workspace_role(_user_id, _ws_id)`                                 | text    | role from `workspace_members`                                                                 |
| `workspace_org(_ws_id)`                                            | uuid    | `workspaces.organization_id`                                                                  |
| `user_in_workspace(_user_id, _ws_id)` _(existing, body rewritten)_ | boolean | `is_workspace_member(...)` **OR** legacy `workspaces.organization_id = user_org_id(_user_id)` |

Policies must call these helpers only. A policy must never `SELECT` from the table it
protects, nor from `organization_members` / `workspace_members` directly — that is what
causes `infinite recursion detected in policy`.

---

## 2. Policy matrix for the new tables

### `organization_members`

| Cmd    | Role          | Predicate                                                                                                 |
| ------ | ------------- | --------------------------------------------------------------------------------------------------------- |
| SELECT | authenticated | `public.is_org_member(auth.uid(), organization_id)`                                                       |
| INSERT | authenticated | `WITH CHECK (public.org_role(auth.uid(), organization_id) IN ('owner','admin'))`                          |
| UPDATE | authenticated | `USING`/`WITH CHECK` same as INSERT, and the last `owner` cannot be demoted (enforced by trigger)         |
| DELETE | authenticated | `public.org_role(auth.uid(), organization_id) IN ('owner','admin')` OR `user_id = auth.uid()` (leave org) |

Grants: `SELECT, INSERT, UPDATE, DELETE` to `authenticated`; `ALL` to `service_role`.
No `anon` grant.

Bootstrap note: the first `owner` row for a brand-new organization is written by the
SECURITY DEFINER provisioning function (`ensure_user_workspace` extension), not by a
client insert — otherwise no one could ever create the first membership.

### `workspace_members`

| Cmd    | Role          | Predicate                                                                                           |
| ------ | ------------- | --------------------------------------------------------------------------------------------------- |
| SELECT | authenticated | `public.is_workspace_member(auth.uid(), workspace_id)`                                              |
| INSERT | authenticated | `WITH CHECK (public.org_role(auth.uid(), public.workspace_org(workspace_id)) IN ('owner','admin'))` |
| UPDATE | authenticated | same as INSERT                                                                                      |
| DELETE | authenticated | same as INSERT OR `user_id = auth.uid()`                                                            |

Grants: `SELECT, INSERT, UPDATE, DELETE` to `authenticated`; `ALL` to `service_role`.

### `organization_units`

| Cmd                  | Role          | Predicate                                                           |
| -------------------- | ------------- | ------------------------------------------------------------------- |
| SELECT               | authenticated | `public.is_org_member(auth.uid(), organization_id)`                 |
| INSERT/UPDATE/DELETE | authenticated | `public.org_role(auth.uid(), organization_id) IN ('owner','admin')` |

### `plans`

Reference catalogue, no tenancy.

| Cmd                  | Role                | Predicate                          |
| -------------------- | ------------------- | ---------------------------------- |
| SELECT               | anon, authenticated | `true` (public pricing catalogue)  |
| INSERT/UPDATE/DELETE | authenticated       | `public.is_admin_tier(auth.uid())` |

Grants: `SELECT` to `anon` and `authenticated`; `ALL` to `service_role`.

### `entitlements`

| Cmd                  | Role          | Predicate                                                                                        |
| -------------------- | ------------- | ------------------------------------------------------------------------------------------------ |
| SELECT               | authenticated | `public.is_org_member(auth.uid(), organization_id)`                                              |
| INSERT/UPDATE/DELETE | —             | **no policy for `authenticated`** — granted/revoked by `service_role` from server functions only |

Grants: `SELECT` to `authenticated`; `ALL` to `service_role`. Entitlements must never be
self-granted from the browser.

---

## 3. Policy pattern for existing tenant tables

Applied at step **T6**, replacing each current policy with a dual-predicate version.

```sql
-- read
USING (
  public.is_workspace_member(auth.uid(), workspace_id)
  OR user_id = auth.uid()          -- compatibility window only, removed at T7
)

-- write
WITH CHECK (
  public.is_workspace_member(auth.uid(), workspace_id)
  AND user_id = auth.uid()
)
```

For tables keyed on `created_by` instead of `user_id` (`ai_use_cases`,
`feasibility_scores`, `use_case_boards`, `use_case_deliverables`), substitute
`created_by` in the compatibility and write predicates.

Deletion of _other members'_ rows requires
`public.org_role(auth.uid(), organization_id) IN ('owner','admin')`.

### Trigger-enforced ownership

Each of these tables gets a `BEFORE INSERT` trigger:

```
NEW.user_id      := COALESCE(auth.uid(), NEW.user_id);   -- never client-chosen for signed-in callers
NEW.workspace_id := COALESCE(NEW.workspace_id, <derived from parent>);
NEW.organization_id := COALESCE(NEW.organization_id, public.workspace_org(NEW.workspace_id));
```

This is what makes "no client-provided ownership" true in practice, not just in policy.

---

## 4. Anonymous ingest tables

`cta_events`, `module_events`, `use_case_views`, `use_case_downloads`,
`integration_events`.

```sql
-- INSERT, roles: anon, authenticated
WITH CHECK (user_id IS NULL OR user_id = auth.uid())
```

Reads stay restricted to `public.is_admin_tier(auth.uid())`. Tenancy columns are nullable
forever on these tables. This simultaneously resolves finding **A1** in
`docs/architecture/data-migration-plan.md`.

---

## 5. Audit tables

`audit_events`, `use_case_audit_log` remain **append-only**:

- `INSERT` policy for `authenticated` with `WITH CHECK (actor_id = auth.uid() OR actor_id IS NULL)`
- `SELECT` policy gated by `public.is_admin_tier(auth.uid())`
- **No** `UPDATE` and **no** `DELETE` policy, and no `UPDATE`/`DELETE` grant to
  `authenticated`.

---

## 6. Platform catalogue tables

`use_cases`, `use_case_patterns`, `industries`, `countries`, `ai_capabilities`,
`business_functions`, `business_objectives`, `gov_functions`, `platform_modules`,
`taxonomy_*` and the `use_case_*` join tables keep their current policies unchanged. They
are platform-owned; adding tenancy predicates there would break public Lite discovery.

---

## 7. Cross-workspace isolation argument

1. Every tenant row carries `workspace_id`.
2. The only read predicate is `is_workspace_member(auth.uid(), workspace_id)`.
3. `workspace_members` rows can only be created by an organization `owner`/`admin` of the
   workspace's own organization (`workspace_org()` resolves it server-side).
4. Therefore a user cannot grant themselves membership of another tenant's workspace, and
   without membership no row of that workspace is selectable, updatable, or deletable.
5. The compatibility `OR user_id = auth.uid()` clause only ever _widens_ access to rows
   the user already owns — it cannot expose another user's row.

Negative tests that must pass (`tests/rls-isolation.e2e.ts`, extended):

- User A (org A) cannot `SELECT` a workspace-B row.
- User A cannot `INSERT` a row with `workspace_id` belonging to org B.
- User A cannot `INSERT` a `workspace_members` row for workspace B.
- User A cannot `UPDATE` their own `entitlements` row.
- `UPDATE`/`DELETE` on `audit_events` is rejected for every authenticated role.
