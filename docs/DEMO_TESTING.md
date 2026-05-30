# UseCaseX™ — Demo Accounts & Role Testing Checklist

All five demo accounts share the password **`Demo@786`**. Sign in at `/auth`
(top-level) or `/ai-hub/usecasex/pro` (in-product). Roles are enforced by
Supabase RLS plus the `RequireRoles` gate on protected routes.

| # | Email | Role(s) | Primary surface |
|---|---|---|---|
| 1 | `admin@aigilityx.com` | `admin` | Admin console, full management |
| 2 | `moderator@aigilityx.com` | `moderator` | Taxonomy, publishing, content review |
| 3 | `contributor@aigilityx.com` | `contributor` | Submit & manage own use cases |
| 4 | `viewer@aigilityx.com` | `viewer` | Read-only authenticated experience |
| 5 | `pro@aigilityx.com` | _(none)_ | Plain Pro user (dashboard, saved, portfolio) |

> Database RLS is the source of truth. The UI gates below only hide actions
> the user couldn't actually perform; even if a button were force-clicked,
> the database would reject the write.

---

## 1 · `admin@aigilityx.com` (admin)

| Page | Expected |
|---|---|
| `/ai-hub/usecasex/admin` | ✅ Loads. Tabs: Overview, Use Cases, Add New, Taxonomy, Platforms, Leads, CTA Analytics, Reports, Settings. |
| Use Cases tab | ✅ Publish, Unpublish, **and** Archive (delete) buttons visible. |
| Taxonomy tab | ✅ Add/edit/delete sectors, tags, maturity levels; Publish increments version. |
| Leads tab | ✅ Read & update lead statuses. |
| `/ai-hub/usecasex/$slug` | ✅ Rate + leave feedback. |
| `/ai-hub/usecasex/dashboard`, `/saved`, `/portfolio`, `/reports`, `/studio` | ✅ Full Pro access. |
| Sub-nav | ✅ "Admin" link visible. |

## 2 · `moderator@aigilityx.com` (moderator)

| Page | Expected |
|---|---|
| `/ai-hub/usecasex/admin` | ✅ Loads. Same tabs as admin. |
| Use Cases tab | ✅ Publish / Unpublish visible. ❌ **Archive button hidden** (admin-only). |
| Taxonomy tab | ✅ Full edit + publish. |
| `/ai-hub/usecasex/$slug` | ✅ Rate + feedback. |
| Pro pages | ✅ Full access. |
| Sub-nav | ❌ "Admin" pill is currently admin-gated in the sub-nav; reach `/admin` directly. |

## 3 · `contributor@aigilityx.com` (contributor)

| Page | Expected |
|---|---|
| `/ai-hub/usecasex/admin` | ❌ "Access denied" card (needs admin or moderator). |
| `/ai-hub/usecasex/studio` | ✅ Submit / draft / edit own use cases. |
| `/ai-hub/usecasex/$slug` | ✅ Rate + feedback. |
| Pro pages (dashboard / saved / portfolio / reports) | ✅ Visible. |
| Database (verify via Network tab) | ✅ Inserts on `use_cases` only when `submitted_by = auth.uid()` and status is `draft` / `review`. |

## 4 · `viewer@aigilityx.com` (viewer)

| Page | Expected |
|---|---|
| `/ai-hub/usecasex` | ✅ Browse. |
| `/ai-hub/usecasex/explore` | ✅ Filters, presets, compare. |
| `/ai-hub/usecasex/$slug` | ✅ View. Rate + feedback (any authenticated user). |
| `/ai-hub/usecasex/admin` | ❌ "Access denied". |
| `/ai-hub/usecasex/studio` | ✅ Page loads, but DB rejects publishing — only draft / review allowed by RLS. |

## 5 · `pro@aigilityx.com` (no role)

| Page | Expected |
|---|---|
| `/ai-hub/usecasex/dashboard` | ✅ Pro dashboard, profile completion. |
| `/saved`, `/portfolio`, `/reports`, `/studio` | ✅ Pro experience. |
| `/ai-hub/usecasex/admin` | ❌ "Access denied". |
| Rate / feedback | ✅ Authenticated → allowed. |
| Sub-nav | ❌ No "Admin" pill. |

---

## Server-side guarantees (RLS)

These policies make the gates above non-bypassable from the client:

- `use_cases` — `DELETE` allowed only to `admin`; `UPDATE` to admin **or** moderator; authors can only insert with `status ∈ (draft, review)`.
- `taxonomy_sectors / _tags / _maturity_levels` — full `ALL` only to admin / moderator; public sees only `is_published = true`.
- `taxonomy_meta` — version bumps restricted to admin / moderator.
- `use_case_ratings`, `use_case_feedback` — users can only manage rows where `auth.uid() = user_id`; admin/moderator can manage all.

## Code references

- Role hook: `src/lib/usecasex.roles.ts` (`useRoles`)
- Route gate: `src/components/RequireRoles.tsx` (`<RequireRoles anyOf={[…]} />`)
- Applied at: `src/routes/ai-hub.usecasex.admin.tsx` (admin + moderator);
  per-action gates via `canDelete` / `canPublish` from `useRoles()`.
