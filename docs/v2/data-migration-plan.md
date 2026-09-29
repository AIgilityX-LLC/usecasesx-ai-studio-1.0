# UseCasesX™ V2 — Data Migration Plan

**Prompt:** V2-02 (refreshed)  
**Date:** 2026-09-22  
**SRS:** [`srs-prd-v2.md`](./srs-prd-v2.md) §8 Data model · §12 releases  
**Method:** **add → backfill → validate → enforce → retire**  
**Constraint:** Additive only. No destructive drops/renames without staged approval, rehearsal, and rollback/forward-fix.

---

## 1. Current schema posture (V2-01 evidence)

| Artifact | State |
|----------|-------|
| `supabase/migrations/` | **2** live SQL files (not full history) |
| `docs/migration/_recovered_migrations/` | **~108** recovered historical migrations |
| `docs/migration/full-schema.sql` | Reconstructed DDL bootstrap (~117 tables); do not execute blindly on prod without review |
| `docs/migration/seed-reference-data.sql` | Reference seeds (`plans`, taxonomies, …) |
| `docs/migration/add-missing-unique-constraints.sql` | Unique constraint repair |
| Live app target | Project `mclidfbrstkoivzjqitf` |
| Known gaps vs SRS §8 | No first-class `value_contracts` / `benefit_entries`; no full `use_case_versions` / `evidence_items` / `decisions` model; agentic entities missing |

**Policy:** New V2 work ships as **new numbered migrations** under `supabase/migrations/`. Treat `full-schema.sql` as disaster-recovery / greenfield bootstrap only.

---

## 2. Canonical pattern (every wave)

```text
ADD       → CREATE TABLE / ADD COLUMN (nullable) + GRANT + ENABLE RLS + CREATE POLICY (same file)
BACKFILL  → SQL/scripts from existing rows (ai_use_cases, use_case_scores, submissions, workshop canvas, mocks)
VALIDATE  → counts, orphan FKs, tenant integrity, dual-read spot checks → report in docs/v2/
ENFORCE   → NOT NULL / CHECK / unique only after validation signed
RETIRE    → remove mocks / dual-write paths / dead columns after dual-read window (separate approved migration)
```

Ownership rules (SRS §8):

- Immutable `organization_id` / `workspace_id` derived **server-side**  
- Stable entity ID + immutable version ID for versioned business records  
- Soft delete + retention; audit append-only  
- No client-trusted `organization_id` as authority  

---

## 3. Migration waves (non-destructive)

| Wave | Objects (SRS-aligned) | Prompt | Release |
|------|----------------------|--------|---------|
| **W0** | App-level SoD (no schema); optional DB CHECK later | Done in app / V2-10 | A |
| **W1** | `use_case_versions` (or equivalent) · canvas section storage · lifecycle status map from existing statuses | V2-04 | A |
| **W2** | `evidence_items` (+ storage path policies) · link tables to canvas/scores/reviews | V2-05 | A |
| **W3** | `scorecard_versions` · score rows retain model version; backfill current scores unchanged visually until reconciliation | V2-09 | B |
| **W4** | `reviews` / `decisions` / `conditions` linked to immutable version | V2-10 | B |
| **W5** | `value_contracts` · `benefit_entries` — replace mocks | V2-13 | C / **MLR** |
| **W6** | Agentic / solution components (`agents`, tools, limits) | V2-08 | B (optional MLR) |
| **W7** | `dependencies` · scenario snapshots (non-mutating) | V2-12 | C |
| **W8** | Handoff packages / import batches metadata | V2-11 / V2-16 | B/D |

Unmapped existing statuses must be reported explicitly in the V2-03/V2-04 backfill report (never silently coerced).

---

## 4. Rollback / forward-fix

| Situation | Action |
|-----------|--------|
| App regression | Deploy previous git tag; leave additive columns/tables |
| Bad backfill | Corrective additive migration or restore from DB snapshot taken at recovery point |
| Incomplete feature | Feature flag / entitlement off; do not DROP |
| Data corruption | Restore snapshot; do not “clean” with TRUNCATE of tenant tables |

**Destructive migrations are out of scope for V2 MLR.**

---

## 5. Validation checklist (per wave)

- [ ] Migration is additive only  
- [ ] `GRANT` → `ENABLE ROW LEVEL SECURITY` → `CREATE POLICY` in same file  
- [ ] `service_role` + `authenticated` grants tuned to policies; `anon` only if public  
- [ ] Backfill report committed under `docs/v2/`  
- [ ] Dual-tenant RLS denial for new tables (`bun run test:rls` or equivalent)  
- [ ] Soft-delete / retention noted  
- [ ] Forward-fix documented in PR  

---

## 6. Gate check

| Criterion | Met? |
|-----------|------|
| add → backfill → validate → enforce → retire | Yes |
| No destructive plan for MLR | Yes |
| Maps to SRS entities | Yes (§3) |

**No schema applied by V2-02.** V2-04 ships W1 additive migration `supabase/migrations/20260923120000_v2_04_versioned_core_model.sql` (apply to live DB before claiming W1 closed).
