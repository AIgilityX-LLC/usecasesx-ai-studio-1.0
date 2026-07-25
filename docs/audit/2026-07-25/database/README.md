# Database audit — T=0 (2026-07-25)

Read-only audit of the Lovable Cloud (Supabase) backend before the
14 August 2026 Lite + Pro Founding Access launch. **No schema, policy or
data changes were made.**

Migration head unchanged: `20260725094800_9af904b9-06fe-46ea-bb91-1dafa866b819.sql`.

## Contents

1. [`inventory.md`](./inventory.md) — 53 tables, 1 view, 16 routines,
   29 triggers, 38 FKs, 5 enums, 1 storage bucket.
2. [`entity-mapping.md`](./entity-mapping.md) — DB → product domain map,
   with named gaps (memberships, entitlements, roadmap, workshops).
3. [`rls-risk-matrix.md`](./rls-risk-matrix.md) — every table classified
   High / Medium / Low with rationale.
4. [`migration-plan.md`](./migration-plan.md) — additive proposals grouped
   Phase A (pre-launch) → Phase C (Enterprise runway).
5. [`verification-queries.md`](./verification-queries.md) — 8 read-only
   SQL snippets to re-verify posture on demand.

## Headline findings

- All 53 public tables have RLS enabled with ≥1 policy. Good baseline.
- Tenant tables are empty at T=0 — no production data at risk.
- 3 High-risk items to verify before launch: anon-INSERT identity-forgery
  guard on `cta_events` / `module_events` / `use_case_downloads`;
  `use_case_submissions` status transitions; `taxonomy_sectors` org-scoped
  draft visibility.
- 14 ownership columns are missing FK → `auth.users`. Additive migration
  proposed (A2). No backfill required because tables are empty.
- 4 named domain gaps deferred to post-launch: `memberships`,
  `entitlements`, `roadmap`, `workshops`.

## Guardrails honoured

- No SQL executed.
- No policy or GRANT changes.
- No inserts, updates or deletes.
- No changes to app code or config.
- Every recommendation in `migration-plan.md` is additive with a stated
  rollback.

## Recommended next prompt

**PROMPT-08** — implement Phase A / A1 (verify + tighten anon-INSERT
`WITH CHECK`) and A2 (add missing `auth.users` FKs) as one small additive
migration, since tenant tables are empty and backfill is trivial.
