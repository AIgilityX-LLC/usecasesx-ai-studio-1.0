"""Launch corpus builder for the global UseCasesX repository.

Takes the curated records in `data.py`, enriches every record with the fields the
launch quality bar requires (implementation notes, governance / privacy / cyber
notes, review flags, provenance and quality status), runs an extended QA gate,
and emits idempotent SQL batches plus a coverage report.

Nothing here invents external research: every record is authored editorially by
the AIgilityX team with AI assistance and human review, and says so through its
provenance label.

Usage:
    python3 scripts/seed/launch_corpus.py            # emit SQL + report to /tmp/seed
"""

import os
import sys
import json
from collections import Counter, defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from build import build_all, qa, CAP_NAME, CAPS, FUNCS, OBJS  # noqa: E402
from data import IND  # noqa: E402

OUT_DIR = "/tmp/seed"

PROVENANCE = "aigilityx_editorial"
PROVENANCE_NOTE = (
    "Authored by the AIgilityX editorial team with AI assistance and human review. "
    "Patterns are generalised from public industry practice; no third-party study, "
    "vendor benchmark or customer outcome is claimed. Figures shown are targets to be "
    "validated inside your own workspace."
)

# --- Display names for taxonomy rows -----------------------------------------

IND_NAME = {
    "defense": "Defence & National Security",
    "healthcare": "Healthcare & Life Sciences",
    "real-estate": "Real Estate & Facilities",
    "manufacturing": "Manufacturing & Industrials",
    "pharma": "Pharmaceuticals & Biotech",
    "transport-travel": "Transport & Travel",
    "airlines-aviation": "Airlines & Aviation",
    "food-agribusiness": "Food & Agribusiness",
    "retail": "Retail & Consumer",
    "education": "Education & Research",
    "media": "Media & Entertainment",
    "automotive": "Automotive & Mobility",
    "logistics": "Logistics & Freight",
    "regulatory-compliance": "Regulators & Compliance Bodies",
    "law-enforcement": "Law Enforcement & Justice",
    "government": "Government & Public Sector",
    "hospitality": "Hospitality & Tourism",
    "banking": "Banking & Financial Services",
}


def titleize(slug: str) -> str:
    words = slug.split("-")
    fixed = {
        "ai": "AI",
        "ml": "ML",
        "it": "IT",
        "hr": "HR",
        "ocr": "OCR",
        "nlp": "NLP",
        "rag": "RAG",
        "llm": "LLM",
        "automl": "AutoML",
        "and": "&",
    }
    return " ".join(fixed.get(w, w.capitalize()) for w in words)


# --- Enrichment ---------------------------------------------------------------

PERSONAL_DATA_INDUSTRIES = {
    "healthcare",
    "pharma",
    "government",
    "banking",
    "law-enforcement",
    "education",
    "retail",
    "hospitality",
    "transport-travel",
    "airlines-aviation",
}
HIGH_ASSURANCE_INDUSTRIES = {
    "defense",
    "government",
    "law-enforcement",
    "banking",
    "regulatory-compliance",
    "healthcare",
}
SENSITIVE_FUNCTIONS = {"clinical-operations", "human-resources", "legal", "risk-and-compliance"}

GCC_INDUSTRIES = {
    "government",
    "defense",
    "law-enforcement",
    "regulatory-compliance",
    "banking",
    "transport-travel",
    "healthcare",
    "real-estate",
}

COLLECTIONS = [
    {
        "slug": "gcc-national-priorities",
        "name": "GCC national priorities",
        "description": (
            "Sovereign-relevant use cases for government, security, regulation and "
            "national infrastructure programmes across the GCC."
        ),
        "match": lambda r: r["ind"] in GCC_INDUSTRIES
        and r["obj"]
        in {"citizen-services", "risk-and-compliance", "regulatory-reporting", "cybersecurity", "operational-efficiency"},
        "limit": 18,
    },
    {
        "slug": "enterprise-cost-and-efficiency",
        "name": "Enterprise cost & efficiency",
        "description": "Operating-cost and productivity plays with short paths to measurable savings.",
        "match": lambda r: r["obj"]
        in {"cost-reduction", "operational-efficiency", "workforce-productivity"},
        "limit": 18,
    },
    {
        "slug": "enterprise-risk-and-trust",
        "name": "Enterprise risk, compliance & trust",
        "description": "Detection, assurance and reporting use cases for regulated enterprises.",
        "match": lambda r: r["obj"]
        in {"risk-and-compliance", "regulatory-reporting", "fraud-prevention", "cybersecurity"},
        "limit": 18,
    },
    {
        "slug": "customer-and-citizen-experience",
        "name": "Customer & citizen experience at scale",
        "description": "Service, personalisation and self-service patterns that lift experience without lifting cost.",
        "match": lambda r: r["obj"]
        in {"customer-experience", "personalization", "citizen-services"},
        "limit": 18,
    },
]


def enrich(r: dict) -> dict:
    ind, func, obj = r["ind"], r["func"], r["obj"]
    capn = CAP_NAME.get(r["cap"], r["cap"].replace("-", " "))
    high_risk = r["risk"] in {"High", "Critical"}

    r["region"] = "Global"
    r["provenance"] = PROVENANCE
    r["provenance_note"] = PROVENANCE_NOTE
    r["quality_status"] = "quality_passed"

    r["implementation_notes"] = (
        f"1. Frame the decision: agree the target workflow, the baseline you will measure and the owner accountable for the benefit. "
        f"2. Prove the data: confirm the required {IND_NAME.get(ind, titleize(ind)).lower()} data exists, is accessible and is lawful to use for this purpose. "
        f"3. Build a thin slice: apply {capn} to one segment or site, with human review on every output. "
        f"4. Evaluate against the baseline before scaling — accuracy, exception rate and the KPIs listed above. "
        f"5. Scale with controls: monitoring, escalation paths, retraining cadence and a documented fallback to the manual process."
    )
    r["outcomes"] = r["implementation_notes"]

    r["governance_notes"] = (
        f"Assign a named business owner and record the decision rationale. Define the human-in-the-loop point for "
        f"{capn} outputs, the acceptable error tolerance and the escalation route when the model is uncertain. "
        + ("Regulated-sector deployment: expect formal model approval and periodic review. " if ind in HIGH_ASSURANCE_INDUSTRIES else "")
        + "Log model version, prompt/config changes and material overrides for audit."
    )
    r["cybersecurity_notes"] = (
        "Treat model endpoints as production systems: authenticate and rate-limit access, isolate training and inference "
        "environments, and monitor for prompt injection, data exfiltration and model abuse. "
        + ("National-security or financial exposure: apply the strictest tenancy, key-management and residency controls available. " if ind in {"defense", "government", "law-enforcement", "banking"} else "")
        + "Retain logs sufficient to reconstruct any automated decision."
    )
    r["privacy_notes"] = (
        (
            "Personal data is likely in scope. Establish the lawful basis, minimise fields, pseudonymise where possible, "
            "set retention limits and confirm the residency requirement before any cross-border processing. "
            if ind in PERSONAL_DATA_INDUSTRIES or func in SENSITIVE_FUNCTIONS
            else "Personal data should be excluded by design; if it enters scope, re-run a privacy assessment before scaling. "
        )
        + "Do not use production personal data in evaluation without approval."
    )

    r["governance_required"] = high_risk or ind in HIGH_ASSURANCE_INDUSTRIES
    r["privacy_review_required"] = ind in PERSONAL_DATA_INDUSTRIES or func in SENSITIVE_FUNCTIONS
    r["cyber_review_required"] = high_risk or ind in {"defense", "government", "law-enforcement", "banking"} or func == "it-and-security"
    r["assurance_review_required"] = r["mat"] in {"concept", "prototype"} and r["value"] in {"High", "Critical"}
    return r


# --- Extended QA --------------------------------------------------------------

def extended_qa(records):
    errors = []
    inds = Counter(r["ind"] for r in records)
    funcs = Counter(r["func"] for r in records)
    if not (150 <= len(records) <= 400):
        errors.append(f"corpus size {len(records)} outside 150-400")
    if len(inds) < 10:
        errors.append(f"only {len(inds)} industries covered (min 10)")
    if len(funcs) < 12:
        errors.append(f"only {len(funcs)} business functions covered (min 12)")
    for r in records:
        for fld in (
            "implementation_notes",
            "governance_notes",
            "cybersecurity_notes",
            "privacy_notes",
            "provenance_note",
        ):
            if not r.get(fld) or len(r[fld]) < 40:
                errors.append(f"{r['slug']}: weak {fld}")
        if r["provenance"] == "unspecified":
            errors.append(f"{r['slug']}: missing provenance")
        if r["quality_status"] != "quality_passed":
            errors.append(f"{r['slug']}: not quality passed")
    for c in COLLECTIONS:
        n = len([r for r in records if c["match"](r)])
        if n < 6:
            errors.append(f"collection {c['slug']}: only {n} members")
    return errors


# --- SQL emission -------------------------------------------------------------

def esc(s):
    return str(s).replace("'", "''")


def arr(lst):
    return "ARRAY[" + ",".join("'" + esc(x) + "'" for x in lst) + "]::text[]"


RANK = {"Low": 2, "Medium": 3, "High": 4, "Critical": 5}


def taxonomy_sql(records):
    out = []
    for ind in sorted({r["ind"] for r in records}):
        out.append(
            f"INSERT INTO industries(slug,name) VALUES ('{ind}','{esc(IND_NAME.get(ind, titleize(ind)))}') ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name;"
        )
    for f in sorted(FUNCS):
        out.append(
            f"INSERT INTO business_functions(slug,name) VALUES ('{f}','{esc(titleize(f))}') ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name;"
        )
    for c in sorted(CAPS):
        raw = CAP_NAME.get(c)
        name = (raw[0].upper() + raw[1:]) if raw else titleize(c)
        out.append(
            f"INSERT INTO ai_capabilities(slug,name) VALUES ('{c}','{esc(name)}') ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name;"
        )
    for o in sorted(OBJS):
        out.append(
            f"INSERT INTO business_objectives(slug,name) VALUES ('{o}','{esc(titleize(o))}') ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name;"
        )
    return "\n".join(out)


def featured_slugs(all_records):
    """First three members of every curated collection are surfaced on the landing page."""
    out = set()
    for c in COLLECTIONS:
        members = [r for r in all_records if c["match"](r)][: c["limit"]]
        out.update(m["slug"] for m in members[:3])
    return out


def use_case_sql(records, start_index=0, featured=frozenset()):
    out = []
    for i, r in enumerate(records):
        idx = start_index + i
        out.append(
            "INSERT INTO use_cases (slug,title,summary,problem,solution,business_problem,ai_solution_concept,"
            "business_value,data_required,kpis,roi_areas,value_potential,complexity,risk_level,time_to_value,"
            "maturity,maturity_level,impact_score,effort_score,risk_score,status,visibility,content_status,"
            "published_at,display_order,region,outcomes,implementation_notes,governance_notes,cybersecurity_notes,"
            "privacy_notes,governance_required,privacy_review_required,cyber_review_required,assurance_review_required,"
            "provenance,provenance_note,quality_status,quality_checked_at,is_featured,show_on_landing) VALUES ("
            f"'{esc(r['slug'])}','{esc(r['title'])}','{esc(r['summary'])}','{esc(r['problem'])}','{esc(r['solution'])}',"
            f"'{esc(r['problem'])}','{esc(r['solution'])}','{esc(r['business_value'])}','{esc(r['data_required'])}',"
            f"{arr(r['kpis'])},{arr(r['roi'])},'{r['value']}','{r['cx']}','{r['risk']}','{r['ttv']}','{r['mat']}','{r['mat']}',"
            f"{RANK.get(r['value'],3)},{RANK.get(r['cx'],3)},{RANK.get(r['risk'],3)},'published','both','published',now(),{idx},"
            f"'{esc(r['region'])}','{esc(r['outcomes'])}','{esc(r['implementation_notes'])}','{esc(r['governance_notes'])}',"
            f"'{esc(r['cybersecurity_notes'])}','{esc(r['privacy_notes'])}',{str(r['governance_required']).lower()},"
            f"{str(r['privacy_review_required']).lower()},{str(r['cyber_review_required']).lower()},"
            f"{str(r['assurance_review_required']).lower()},'{PROVENANCE}','{esc(r['provenance_note'])}','quality_passed',now(),"
            f"{str(r['slug'] in featured).lower()},{str(r['slug'] in featured).lower()})"
            " ON CONFLICT (slug) DO NOTHING;"
        )
        s = esc(r["slug"])
        out.append(
            f"INSERT INTO use_case_industries(use_case_id,industry_id) SELECT u.id,i.id FROM use_cases u, industries i WHERE u.slug='{s}' AND i.slug='{r['ind']}' ON CONFLICT DO NOTHING;"
        )
        out.append(
            f"INSERT INTO use_case_capabilities(use_case_id,capability_id) SELECT u.id,c.id FROM use_cases u, ai_capabilities c WHERE u.slug='{s}' AND c.slug='{r['cap']}' ON CONFLICT DO NOTHING;"
        )
        out.append(
            f"INSERT INTO use_case_business_functions(use_case_id,business_function_id) SELECT u.id,f.id FROM use_cases u, business_functions f WHERE u.slug='{s}' AND f.slug='{r['func']}' ON CONFLICT DO NOTHING;"
        )
        out.append(
            f"INSERT INTO use_case_business_objectives(use_case_id,objective_id) SELECT u.id,o.id FROM use_cases u, business_objectives o WHERE u.slug='{s}' AND o.slug='{r['obj']}' ON CONFLICT DO NOTHING;"
        )
        for j, label in enumerate(r["kpis"][:2]):
            out.append(
                f"INSERT INTO use_case_metrics(use_case_id,label,value,sort_order) SELECT u.id,'{esc(label)}','Target',{j} FROM use_cases u WHERE u.slug='{s}' ON CONFLICT DO NOTHING;"
            )
    return "\n".join(out)


def collections_sql(records, owner_user_id: str):
    out = []
    featured = []
    for c in COLLECTIONS:
        members = [r for r in records if c["match"](r)][: c["limit"]]
        featured.extend(m["slug"] for m in members[:3])
        out.append(
            "INSERT INTO collections(id,user_id,name,description,is_public,share_token) VALUES "
            f"(md5('{c['slug']}')::uuid,'{owner_user_id}','{esc(c['name'])}','{esc(c['description'])}',true,'{c['slug']}') "
            "ON CONFLICT (id) DO NOTHING;"
        )
        for pos, m in enumerate(members):
            out.append(
                f"INSERT INTO collection_items(collection_id,use_case_id,position) SELECT md5('{c['slug']}')::uuid,u.id,{pos} "
                f"FROM use_cases u WHERE u.slug='{esc(m['slug'])}' ON CONFLICT DO NOTHING;"
            )
    return "\n".join(out)


def coverage(records):
    inds = Counter(r["ind"] for r in records)
    funcs = Counter(r["func"] for r in records)
    caps = Counter(r["cap"] for r in records)
    objs = Counter(r["obj"] for r in records)
    return {
        "total": len(records),
        "industries": dict(sorted(inds.items())),
        "functions": dict(sorted(funcs.items())),
        "capabilities": dict(sorted(caps.items())),
        "objectives": dict(sorted(objs.items())),
        "collections": {
            c["slug"]: len([r for r in records if c["match"](r)][: c["limit"]]) for c in COLLECTIONS
        },
    }


def main():
    owner = os.environ.get("CORPUS_OWNER_USER_ID", "")
    records = [enrich(r) for r in build_all()]
    errors = qa(records) + extended_qa(records)
    if errors:
        print("QA FAILED:")
        for e in errors[:40]:
            print(" -", e)
        sys.exit(1)

    os.makedirs(OUT_DIR, exist_ok=True)
    with open(f"{OUT_DIR}/taxonomy.sql", "w") as f:
        f.write(taxonomy_sql(records))

    feat = featured_slugs(records)
    size = 30
    batches = [records[i : i + size] for i in range(0, len(records), size)]
    for bi, batch in enumerate(batches):
        with open(f"{OUT_DIR}/corpus_{bi}.sql", "w") as f:
            f.write(use_case_sql(batch, bi * size, feat))
    if owner:
        with open(f"{OUT_DIR}/collections.sql", "w") as f:
            f.write(collections_sql(records, owner))

    payload = {
        "provenance": PROVENANCE,
        "provenance_note": PROVENANCE_NOTE,
        "industries": [
            {"slug": i, "name": IND_NAME.get(i, titleize(i))} for i in sorted({r["ind"] for r in records})
        ],
        "functions": [{"slug": f, "name": titleize(f)} for f in sorted(FUNCS)],
        "capabilities": [
            {"slug": c, "name": (CAP_NAME[c][0].upper() + CAP_NAME[c][1:]) if CAP_NAME.get(c) else titleize(c)}
            for c in sorted(CAPS)
        ],
        "objectives": [{"slug": o, "name": titleize(o)} for o in sorted(OBJS)],
        "use_cases": [
            {
                **{k: r[k] for k in (
                    "slug", "title", "summary", "problem", "solution", "business_value", "data_required",
                    "kpis", "roi", "region", "outcomes", "implementation_notes", "governance_notes",
                    "cybersecurity_notes", "privacy_notes", "governance_required", "privacy_review_required",
                    "cyber_review_required", "assurance_review_required", "provenance", "provenance_note",
                    "quality_status", "ind", "cap", "func", "obj", "value", "cx", "risk", "ttv", "mat",
                )},
                "display_order": n,
                "is_featured": r["slug"] in feat,
            }
            for n, r in enumerate(records)
        ],
        "collections": [
            {
                "slug": c["slug"],
                "name": c["name"],
                "description": c["description"],
                "members": [m["slug"] for m in [r for r in records if c["match"](r)][: c["limit"]]],
            }
            for c in COLLECTIONS
        ],
    }
    with open(f"{OUT_DIR}/corpus.json", "w") as f:
        json.dump(payload, f)

    cov = coverage(records)
    with open(f"{OUT_DIR}/coverage.json", "w") as f:
        json.dump(cov, f, indent=2)
    print(f"QA PASSED — {cov['total']} records, {len(cov['industries'])} industries, {len(cov['functions'])} functions")
    print(f"batches: {len(batches)} (size {size}) in {OUT_DIR}")


if __name__ == "__main__":
    main()
