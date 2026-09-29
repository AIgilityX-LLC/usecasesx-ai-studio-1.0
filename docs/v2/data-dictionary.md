# UseCasesX™ V2 — Core data dictionary (V2-04)

**Date:** 2026-09-23  
**Migration:** `supabase/migrations/20260923120000_v2_04_versioned_core_model.sql`  
**Rule:** Adapt existing names. No parallel `v2_*` tables.

---

## Ownership & versioning contract

| Rule | Implementation |
|------|----------------|
| Immutable tenancy | `organization_id` + `workspace_id` on tenant records; `enforce_workspace_org_match()` on write |
| Stable entity ID | Parent `id` on `opportunities` / `ai_use_cases` |
| Immutable business version ID | Child `id` on `*_versions`; `(parent_id, version)` unique |
| Draft vs snapshot | Live draft mutates parent / `use_case_canvas_sections` where `version_id IS NULL`; submit/publish inserts append-only version + optional section copies with `version_id` set |
| Soft delete | `deleted_at` on `ai_use_cases`, `opportunities`, `use_case_canvas_sections` (nullable; NOT NULL enforcement deferred) |
| Append-only versions | SELECT+INSERT only; `prevent_version_mutation()` blocks identity/snapshot UPDATE/DELETE |

---

## Entities (this wave)

### Adapted

| Table | Change | Notes |
|-------|--------|-------|
| `ai_use_cases` | +`lifecycle_status`, `deleted_at`, `current_version_id` | Studio use-case SoR |
| `opportunities` | +`lifecycle_status`, `deleted_at`, `current_version_id`; V2-06 +`sponsor_name`, `affected_users`, `geography`, `constraints_text` | Capture SoR |
| `use_case_versions` | +`kind`, `label`, `published_at`; immutability + tenant triggers | Existing snapshot table |
| `workshop_*_canvas*` | None | Kept as workshop SoR; not renamed |

### Created (audit-proven gaps)

| Table | Purpose |
|-------|---------|
| `opportunity_versions` | Immutable opportunity snapshots (mirror of `use_case_versions`) |
| `use_case_canvas_sections` | Normalized FR-03 Canvas V2 sections for Studio drafts + versioned copies |
| `storage.buckets` `studio-canvas` | Attachments path `{workspace_id}/{use_case_id}/…` |

### Explicitly deferred (exist partially or later wave)

| SRS entity | Status | Wave |
|------------|--------|------|
| `evidence_items` | **Created** (V2-05) | Done |
| `scorecard_versions` | **Done via** published `scorecards` rows + immutability trigger (V2-09); results pin `scorecard_version` | Done |
| `reviews` / `decisions` / `conditions` | **Created** as `decision_gate_reviews`, `decision_gate_events`, `decision_gate_open_items` (V2-10) | Done |
| `governance_previews` / CyberX packages | **Created** as `use_case_governance_previews` (V2-11); packages stored on row + download | Done |
| `dependencies` | **Created** as `portfolio_dependencies` (V2-12); `portfolio_items.depends_on` retained for prerequisites | Done |
| `portfolio_scenarios` | **Created** (V2-12) — non-mutating what-if weights/budget/capacity | Done |
| `roadmap_items` | **Adapted** via `portfolio_items` (+ `gate_key`, `roadmap_status` in V2-14) | Done |
| `implementation_briefs` | **Created** (V2-14) — versioned delivery brief; published rows immutable | Done |
| `workshops` V2 fields | **Adapted** — agenda, teams, challenges, timeboxes, allow_anonymous, voting_mode (V2-15) | Done |
| `workshop_cluster_proposals` | **Created** (V2-15) — AI proposes; facilitator confirms merges | Done |
| `value_contracts` | missing; `use_case_benefits` partial | V2-13 |
| `solution_components` / agents / vendors / `data_assets` | **Partial** — `use_case_solution_designs` (V2-08) | Done (designer); vendors/assets later |

---

## Column dictionaries

### `use_case_versions` (adapted)

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | Immutable business version ID |
| `use_case_id` | uuid FK → `ai_use_cases` | Stable entity |
| `version` | int | Monotonic per use case |
| `kind` | text | `draft` \| `submitted` \| `published` (nullable until enforce) |
| `snapshot` | jsonb | Frozen payload |
| `organization_id` / `workspace_id` | uuid | Synced from parent on INSERT |

### `opportunity_versions` (new)

Same shape as `use_case_versions` with `opportunity_id` → `opportunities`.

### `use_case_canvas_sections` (new)

| Column | Type | Notes |
|--------|------|-------|
| `section_key` | text | FR-03 keys in `src/lib/lifecycle/canvas-sections.ts` |
| `version_id` | uuid null | NULL = live draft; set = bound to immutable version |
| `content` | jsonb | Section body (rationale/confidence adjacent) |
| `evidence_refs` | jsonb | Lightweight refs until V2-05 evidence service |
| `deleted_at` | timestamptz | Soft delete |

### `evidence_items` (V2-05)

| Column | Type | Notes |
|--------|------|-------|
| `subject_type` / `subject_id` | text / uuid | Polymorphic: use_case, opportunity, canvas_section, score, review, benefit, export, workshop |
| `kind` | text | `link` \| `note` \| `file` |
| `record_version_id` | uuid null | Optional bind to immutable version |
| `confidentiality` | text | public / internal / confidential / restricted |
| `applicable_fields` | text[] | Field keys this evidence supports |
| `integrity_hash` | text null | Hex hash when available |
| `retention_label` | text null | Retention policy label |
| `status` | text | active / stale / missing / conflict / revoked |
| Storage | bucket `evidence-items` | Path `{workspace}/{subject_type}/{subject_id}/{file}` |

### Lifecycle status

Canonical values: see `docs/v2/lifecycle-status-map.md`. Domain `status` columns remain dual-written; `lifecycle_status` is additive and nullable until validation signs NOT NULL.

### Enterprise identity & sovereignty (V2-18)

| Table / column | Notes |
|----------------|-------|
| `organizations.data_region` | Declared residency preference (`unspecified`…`airgap_reserved`) |
| `organizations.allowed_ai_provider_routes` | JSON allow-list enforced in AI gateway |
| `organizations.preferred_locale` | `en` \| `ar` |
| `organization_sso_configs` | OIDC/SAML + domain allow-list + JIT; SCIM not provisioned |
| `support_access_grants` | Time-bound support access; `has_support_access()`; no impersonation |

### Content governance (V2-19)

| Table / column | Notes |
|----------------|-------|
| `use_cases.evidence_class` | `example` \| `verified_case_study` \| `pattern_template` |
| `use_cases.license_usage_note` / owner / reviewer / `last_reviewed_at` / `superseded_by_id` / `provenance_url` | FR-01 editorial provenance |
| `use_case_patterns.template_kind` / `sector_context` | GenAI…agentic × enterprise…regulated |
| Seed | 30 reviewed pattern templates — no invented ROI/clients |

---

## RLS summary

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `opportunity_versions` | workspace member | workspace member + `created_by = auth.uid()` | denied | denied |
| `use_case_canvas_sections` | workspace member (non-deleted) | workspace editor | workspace editor | denied (soft-delete via UPDATE) |
| `storage.objects` (`studio-canvas`) | `user_in_workspace(folder[1])` | `workspace_can_edit(folder[1])` | edit | edit |

Existing `use_case_versions` policies unchanged (SELECT/INSERT only).

---

## Enforce later (after validation report)

1. `lifecycle_status NOT NULL` on backfilled parents  
2. `kind NOT NULL` on version tables  
3. Optional CHECK that `lifecycle_status` ∈ canonical set  
4. Retention job for soft-deleted rows (policy TBD)
