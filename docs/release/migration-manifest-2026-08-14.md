# Migration manifest — release candidate v1.0.0-rc.1 (14 August 2026)

Authoritative list of the migrations that make up the candidate. Verified by
`bun run verify:release`, which fails if a migration is missing from this table, unknown to it,
out of timestamp order, destructive, or carries demo/sample seed rows.

Properties enforced for every entry:

- **Ordered** — filename starts with a 14-digit UTC timestamp; the on-disk sort is the apply order.
- **Repeatable** — guarded with `IF NOT EXISTS` / `CREATE OR REPLACE` / `DROP POLICY IF EXISTS`
  before create, so re-application is a no-op.
- **Additive** — no `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, `DELETE FROM`, `RENAME COLUMN`, or
  `DISABLE ROW LEVEL SECURITY`.
- **Seed-free** — no content rows. Only singleton config rows are permitted
  (`pilot_settings`, `taxonomy_meta`, `plans`, `platform_modules`, `ai_capabilities`).

## Apply order

| #   | Migration                                                | Purpose                                                                                | Kind             |
| --- | -------------------------------------------------------- | -------------------------------------------------------------------------------------- | ---------------- |
| 1   | `20260811021640_b971d59c-f321-40af-bc27-e677da862a13.sql` | `publish_use_case_submission()` SECURITY DEFINER publish routine (admin-gated)          | Function         |
| 2   | `20260811024402_6310c076-8e2b-4e0f-9dbb-3841610be68e.sql` | Revoke API-role EXECUTE on internal trigger routines                                   | Hardening        |
| 3   | `20260811024451_aa5c18d7-c0b2-47c5-a563-e8e64dc90a38.sql` | Continue routine-privilege hardening sweep                                             | Hardening        |
| 4   | `20260811024641_93bf03cf-233d-4868-a92e-ba3ea9bb9795.sql` | Public read policy + `anon` GRANT for publicly visible use-case feedback               | Policy + grant   |
| 5   | `20260811033915_d2e22d78-8744-47ee-a4c6-b5d958443a61.sql` | Indexes for highest-traffic list reads (opportunities, portfolios, repository)          | Index            |
| 6   | `20260811041900_37cd5a61-cf51-4f74-a054-5847ba39a38a.sql` | `product_feedback` triage columns (assignment, priority, SLA)                           | Additive columns |
| 7   | `20260811041936_9561752f-ad9b-48aa-af1f-979569753437.sql` | `v_feedback_queue` set to `security_invoker`                                             | Hardening        |
| 8   | `20260811043346_b61bc27d-656a-418c-a4bc-883d2040dda7.sql` | Pilot programme: invitations, checkpoints, settings singleton                            | Tables + RLS     |
| 9   | `20260811044550_485781c3-11f2-439e-9e43-8b746c61e000.sql` | `pilot_audit_events` append-only audit trail                                            | Tables + RLS     |
| 10  | `20260811054329_9790a17c-ab86-4fb8-9ba9-77eef3234f8a.sql` | Data rights: export and deletion request tables, consent records                        | Tables + RLS     |
| 11  | `20260811060031_237356d1-be44-4312-902c-21763004184e.sql` | Workshop item author-edit policy tightened (status changes reviewer-only)                | Policy           |
| 12  | `20260811060653_4c7e53cb-d762-4dea-bf25-76b37f438f61.sql` | `pilot_rc_waivers` launch waiver governance + launch check runs                          | Tables + RLS     |
| 13  | `20260811062851_aaff588a-071a-418f-b704-e45908d0adc6.sql` | Sovereign Public Value Canvas™ storage                                                  | Tables + RLS     |
| 14  | `20260811070036_e855aa33-0e99-40ac-9942-3e5a35acfe44.sql` | Canvas document attachments and append-only version snapshots                            | Tables + RLS     |
| 15  | `20260811070115_ba4c9269-48cb-4a58-84b0-29e7bd1acb54.sql` | Storage policies for the private `canvas-documents` bucket                               | Storage policy   |
| 16  | `20260811091632_f71f9e0a-3264-4cbb-943e-b3d30828ce00.sql` | Removes synthetic release-verification rows from `cta_events` (analytics-only, no customer content) | Data correction — **recorded exception** |

### Recorded exception for entry 16

`bun run verify:release` flags entry 16 because it contains `DELETE FROM`. The exception is
deliberate and narrow: the statement removes rows this project's own verification runs wrote into
`public.cta_events` (`utm_source = 'verify_run'` and the untagged probe events created before
2026-08-11 09:12 UTC), so launch analytics do not report synthetic traffic. It touches no customer
content, no schema and no policy. Until the verifier learns about approved exceptions, treat this
single FAIL as expected and confirm no *other* migration is flagged. Any further data-correction
migration needs the data owner's approval and its own row here.

## Demo and reference data (not migrations)

Content is applied separately so a schema apply never writes rows:

| Data set                            | Applied by                                       |
| ----------------------------------- | ------------------------------------------------ |
| Launch reference corpus (54 published use cases) | `scripts/seed/apply-launch-corpus.mjs`, `bun run seed:baseline` |
| Demo personas / accounts            | `bun run seed:demo-accounts`, `scripts/seed/demo-personas.mjs` |
| Super-admin bootstrap               | `bun run seed:superadmin`                        |
| Baseline refresh                    | `bun run seed:refresh`                           |

## Backup and rollback

- **Backup before apply** — Lovable Cloud takes automatic daily backups; request an on-demand
  data export from Cloud → Advanced settings immediately before applying to production.
- **Rollback posture** — all 15 migrations are additive, so the safe rollback for the *application*
  is to revert the app to the previous version; the schema can stay ahead. No `DROP` is required
  and none is authorised.
- **Forward-fix** — defects in a policy or routine are corrected with a new additive migration
  (`CREATE OR REPLACE FUNCTION`, `DROP POLICY IF EXISTS` + `CREATE POLICY`), never by editing an
  applied file. Editing an applied migration file breaks repeatability and is treated as a P0
  process violation.
