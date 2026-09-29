# V2-03 — Lifecycle status map

**Date:** 2026-09-22  
**Prompt:** Canonical lifecycle, permissions and entitlements  
**Rule:** Existing records are preserved. Unmapped values are never silently coerced.

Canonical states (SRS §6):

`idea` · `triage` · `designing` · `review_ready` · `under_review` · `approved_pilot` · `on_hold` · `rejected` · `pilot` · `approved_scale` · `production` · `measuring` · `retired` · `archived`

Source of truth: `src/lib/lifecycle/`.

---

## Mapped domains

| Domain | Source status | Canonical |
|--------|---------------|-----------|
| opportunity | signal | idea |
| opportunity | opportunity | triage |
| opportunity | qualified | designing |
| opportunity | converted | designing |
| opportunity | deferred | on_hold |
| opportunity | archived | archived |
| use_case | draft | designing |
| use_case | review | under_review |
| use_case | submitted_for_review | under_review |
| use_case | approved | approved_pilot |
| use_case | published | production |
| use_case | unpublished | on_hold |
| use_case | archived | archived |
| wizard | idea | idea |
| wizard | in_design | designing |
| wizard | defined | review_ready |
| wizard | archived | archived |
| submission | draft | idea |
| submission | submitted | review_ready |
| submission | in_review | under_review |
| submission | approved | approved_pilot |
| submission | rejected | rejected |
| collab_review | draft | designing |
| collab_review | ready_for_review | review_ready |
| collab_review | reviewed | under_review |
| collab_review | approved_for_portfolio | approved_pilot |
| collab_review | deferred | on_hold |
| collab_review | archived | archived |
| benefit | proposed | idea |
| benefit | approved | approved_pilot |
| benefit | delivered | production |
| benefit | verified | measuring |
| benefit | sustained | measuring |
| maturity_stage | concept | idea |
| maturity_stage | prototype | designing |
| maturity_stage | pilot | pilot |
| maturity_stage | production | production |
| maturity_stage | scaled | approved_scale |
| content_status | draft | designing |
| content_status | submitted_for_review | under_review |
| content_status | published | production |
| content_status | archived | archived |
| portfolio | draft / Draft | designing |
| portfolio | active / Active | production |
| portfolio | archived / Archived | archived |
| handoff_lifecycle | Concept…Scaled | idea…approved_scale (via maturity keys) |

---

## Explicitly unmapped (do not coerce)

| Value / family | Reason |
|----------------|--------|
| `use_case_boards.status = active` | Board operational flag, not use-case lifecycle |
| Pilot invitation statuses (invited / accepted / revoked) | Enrollment domain |
| `pilot_milestone.changes_requested` | Milestone review outcome; local until V2-10 |
| Lead / CRM statuses | Outside Studio lifecycle |
| Handoff *request* status (`completed`, `declined`) | Suite handoff ≠ use-case lifecycle |
| Feedback ticket `resolved` / `declined` | Support domain |

Any new status discovered at backfill time must be added to `src/lib/lifecycle/map.ts` as either a mapping or an `UNMAPPED_STATUS_VALUES` entry before data migration (V2-04).

---

## Permissions (launch roles preserved)

Scoped verbs: `view` · `edit` · `submit` · `review` · `decide` · `export` · `admin`

Enterprise bundles (additive, flag `permissionBundles` default OFF): Executive Reviewer, Technical Reviewer, Risk Reviewer, Portfolio Manager, Content Curator — see `src/lib/authz/scoped-permissions.ts`.

Gate UI is **not** built in V2-03 (deferred to V2-10).
