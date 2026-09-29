# V2-19 — Repository content governance and seed upgrade

**Status:** Implemented · **Date:** 2026-09-24  
**SRS:** FR-01 Global repository and pattern library

## What changed

1. **Workflow** — `draft → submitted_for_review → approved → published → deprecated` (+ unpublished/archived) in `src/lib/content-governance/model.ts`; admin status includes Deprecated; lifecycle map updated.
2. **Provenance fields** (additive on `use_cases` / `use_case_patterns`) — license/usage note, owner, reviewer, last-reviewed date, provenance URL, superseded-by, **evidence_class**.
3. **Evidence classes** — `example` | `verified_case_study` | `pattern_template` with public disclaimers (`EvidenceClassBadge`, `SourceLineage`).
4. **Templates** — 30 reviewed shapes (6 modalities × 5 sectors) in `templates.ts` + SQL seed. Metric categories only; **no invented clients/ROI**.
5. **Patterns page** — `/patterns` lists the catalogue (replaces ModuleStub).
6. **Publish gate** — `publishGlobalUseCase` requires owner, last-reviewed, license; verified case studies need provenance URL.

## Migrations

- `20260923360000_v2_19_content_governance.sql`
- `20260923360100_v2_19_pattern_template_seed.sql`

## Honesty rule

Seed and publish paths must not invent outcomes, clients or ROI. Pattern KPIs are categories, not measured results.

## Tests

`tests/unit/content-governance-v2-19.test.ts`
