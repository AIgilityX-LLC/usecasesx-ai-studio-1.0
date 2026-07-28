"""Emit the launch DATA BASELINE seed:

  1. canonical taxonomy (industries, ai_capabilities, business_functions,
     business_objectives) — the reference vocabulary the repository depends on
  2. a SMALL published reference set of use cases (default 2 per industry)
     plus their taxonomy junctions and headline metrics

Idempotent: every statement uses ON CONFLICT DO NOTHING.

  python3 scripts/seed/emit_baseline.py [per_industry] > /tmp/seed/baseline.sql
  psql -v ON_ERROR_STOP=1 -f /tmp/seed/baseline.sql
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from build import CAPS, FUNCS, OBJS, build_all, qa  # noqa: E402
from data import IND  # noqa: E402
from emit import arr, esc, RANK  # noqa: E402

ACRONYMS = {"ai", "it", "ocr", "llm", "rag", "nlp", "r", "d"}


def titleize(slug: str) -> str:
    words = slug.split("-")
    out = []
    for w in words:
        if w in ("and", "or", "of") and out:
            out.append(w)
        elif w in ACRONYMS:
            out.append(w.upper())
        else:
            out.append(w.capitalize())
    return " ".join(out)


def taxonomy_sql() -> str:
    out = []
    for slug in IND:
        out.append(
            f"INSERT INTO industries(slug,name) VALUES ('{slug}','{esc(titleize(slug))}') "
            "ON CONFLICT (slug) DO NOTHING;"
        )
    for slug in sorted(CAPS):
        out.append(
            f"INSERT INTO ai_capabilities(slug,name) VALUES ('{slug}','{esc(titleize(slug))}') "
            "ON CONFLICT (slug) DO NOTHING;"
        )
    for slug in sorted(FUNCS):
        out.append(
            f"INSERT INTO business_functions(slug,name) VALUES ('{slug}','{esc(titleize(slug))}') "
            "ON CONFLICT (slug) DO NOTHING;"
        )
    for slug in sorted(OBJS):
        out.append(
            f"INSERT INTO business_objectives(slug,name) VALUES ('{slug}','{esc(titleize(slug))}') "
            "ON CONFLICT (slug) DO NOTHING;"
        )
    return "\n".join(out)


def use_case_sql(records, per_industry: int) -> str:
    picked = []
    for ind in IND:
        picked.extend([r for r in records if r["ind"] == ind][:per_industry])
    out = []
    for i, r in enumerate(picked):
        impact = RANK.get(r["value"], 3)
        effort = RANK.get(r["cx"], 3)
        rscore = RANK.get(r["risk"], 3)
        out.append(
            "INSERT INTO use_cases (slug,title,summary,problem,solution,business_problem,"
            "ai_solution_concept,business_value,data_required,kpis,roi_areas,value_potential,"
            "complexity,risk_level,time_to_value,maturity,maturity_level,impact_score,effort_score,"
            "risk_score,status,visibility,content_status,published_at,display_order)\n"
            f"VALUES ('{esc(r['slug'])}','{esc(r['title'])}','{esc(r['summary'])}',"
            f"'{esc(r['problem'])}','{esc(r['solution'])}','{esc(r['problem'])}',"
            f"'{esc(r['solution'])}','{esc(r['business_value'])}','{esc(r['data_required'])}',"
            f"{arr(r['kpis'])},{arr(r['roi'])},'{r['value']}','{r['cx']}','{r['risk']}',"
            f"'{r['ttv']}','{r['mat']}','{r['mat']}',{impact},{effort},{rscore},"
            f"'published','both','published',now(),{i})\nON CONFLICT (slug) DO NOTHING;"
        )
        out.append(
            "INSERT INTO use_case_industries(use_case_id,industry_id) SELECT u.id,i.id "
            f"FROM use_cases u, industries i WHERE u.slug='{esc(r['slug'])}' AND i.slug='{r['ind']}' "
            "ON CONFLICT DO NOTHING;"
        )
        out.append(
            "INSERT INTO use_case_capabilities(use_case_id,capability_id) SELECT u.id,c.id "
            f"FROM use_cases u, ai_capabilities c WHERE u.slug='{esc(r['slug'])}' AND c.slug='{r['cap']}' "
            "ON CONFLICT DO NOTHING;"
        )
        out.append(
            "INSERT INTO use_case_business_functions(use_case_id,business_function_id) SELECT u.id,f.id "
            f"FROM use_cases u, business_functions f WHERE u.slug='{esc(r['slug'])}' AND f.slug='{r['func']}' "
            "ON CONFLICT DO NOTHING;"
        )
        out.append(
            "INSERT INTO use_case_business_objectives(use_case_id,objective_id) SELECT u.id,o.id "
            f"FROM use_cases u, business_objectives o WHERE u.slug='{esc(r['slug'])}' AND o.slug='{r['obj']}' "
            "ON CONFLICT DO NOTHING;"
        )
        for j, label in enumerate(r["kpis"][:2]):
            out.append(
                "INSERT INTO use_case_metrics(use_case_id,label,value,sort_order) "
                f"SELECT u.id,'{esc(label)}','Target',{j} FROM use_cases u WHERE u.slug='{esc(r['slug'])}' "
                "ON CONFLICT DO NOTHING;"
            )
    return "\n".join(out)


if __name__ == "__main__":
    per_industry = int(sys.argv[1]) if len(sys.argv) > 1 else 2
    records = build_all()
    errs = qa(records)
    if errs:
        print("QA FAILED", errs, file=sys.stderr)
        sys.exit(1)
    print("BEGIN;")
    print(taxonomy_sql())
    print(use_case_sql(records, per_industry))
    print("COMMIT;")
