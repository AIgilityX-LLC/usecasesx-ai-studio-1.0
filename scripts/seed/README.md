# AI Use Case Seed Pipeline

Resumable, idempotent seed for the Repository (`use_cases` + taxonomy junctions).

## V2-19 honesty rules (mandatory)

1. **Seed only reviewed, attributable patterns** — prefer `evidence_class = pattern_template` or `verified_case_study` with a real `provenance_url`.
2. **Distinguish examples from verified case studies** — never label illustrative content as verified.
3. **Never invent outcomes, clients or ROI** — no fabricated percentages, dollar figures, or named customers.
4. Pattern KPI fields store **metric categories only**, not measured results.

Pattern templates (30 reviewed shapes): see
`supabase/migrations/20260923360100_v2_19_pattern_template_seed.sql` and
`src/lib/content-governance/templates.ts`.

## Files

- `data.py` — curated source content per industry (titles, taxonomy, ratings, problem/solution).
- `build.py` — builds full records + runs the **Seed QA Checklist**.
- `emit.py` — emits batched SQL (3–4 industries per batch) with `ON CONFLICT DO NOTHING` (idempotent / resumable).

## Run

```
python3 scripts/seed/build.py        # validate (QA gate)
python3 scripts/seed/emit.py         # write batch_*.sql
psql -v ON_ERROR_STOP=1 -f batch_N.sql
```

## Seed QA Checklist (enforced in build.py before publishing each batch)

1. **Slug uniqueness** — no duplicate slugs across all records.
2. **Taxonomy relationships** — every capability/function/objective/maturity slug exists in the canonical taxonomy.
3. **Rating validity** — value/complexity/risk ∈ {Low,Medium,High,Critical}; time_to_value ∈ {Short,Medium,Long}.
4. **Minimum required fields** — title, summary, problem, solution, business_value, data_required non-empty; ≥2 KPIs.
5. **Minimum coverage** — ≥10 published use cases per industry.
6. **V2-19** — published rows must carry owner, last-reviewed date, license note; verified case studies need provenance URL; reject invented ROI/client claims.

Post-insert verification (run against DB): published counts per industry, zero orphan links, pattern_template seed = 30.
