# Public routines (T=0)

Source: `information_schema.routines` where `specific_schema='public'` on 2026-07-25.

| #   | Routine                            | Purpose                                                    |
| --- | ---------------------------------- | ---------------------------------------------------------- |
| 1   | `audit_use_case_boards`            | Trigger — writes board create/delete audit events          |
| 2   | `audit_use_cases`                  | Trigger — writes use-case lifecycle audit events           |
| 3   | `collection_is_accessible`         | Predicate — user can read a collection                     |
| 4   | `collection_is_owned`              | Predicate — user owns a collection                         |
| 5   | `ensure_user_workspace`            | SECURITY DEFINER — provisions org + workspace              |
| 6   | `get_use_case_integration_package` | Returns curated use-case payload for integrations          |
| 7   | `handle_new_user`                  | Trigger — inserts row in `profiles` on `auth.users` insert |
| 8   | `has_pro_entitlement`              | Entitlement check                                          |
| 9   | `has_role`                         | SECURITY DEFINER — role membership check                   |
| 10  | `is_admin_tier`                    | Any admin-family role                                      |
| 11  | `is_editor_tier`                   | Any editor-family role                                     |
| 12  | `sync_sector_published`            | Trigger — mirrors `status` → `is_published`                |
| 13  | `update_updated_at_column`         | Trigger — bumps `updated_at`                               |
| 14  | `user_can_access_use_case`         | Predicate — workspace access to a use case                 |
| 15  | `user_in_workspace`                | Predicate — workspace membership                           |
| 16  | `user_org_id`                      | Returns caller's organization id                           |

Total: 16 routines. All security-sensitive helpers are `SECURITY DEFINER`
with an explicit `search_path = public` set.
