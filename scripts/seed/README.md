# AI Use Case Seed Pipeline

Resumable, idempotent seed for the Repository (`use_cases` + taxonomy junctions).
180 AI-generated sample use cases (10 per industry × 18 industries), published.

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

Post-insert verification (run against DB): 180 published, 10/industry, zero orphan links.
