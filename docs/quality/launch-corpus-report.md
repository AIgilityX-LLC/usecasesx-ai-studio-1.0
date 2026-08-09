# Launch corpus — coverage, quality and provenance

Status: **seeded and published** · Corpus size: **180 use cases** · Quality gate: **180 / 180 `quality_passed`**

This document records what is in the global UseCasesX™ repository at launch, how it
was produced, and the checks it must pass before anything becomes publicly visible.

## 1. Provenance policy

Every published record carries a `provenance` label and a plain-language
`provenance_note` shown to readers in the *Source & provenance* panel on the use
case detail page.

| Label | Meaning |
| --- | --- |
| `aigilityx_editorial` | Authored by the AIgilityX editorial team with AI assistance and human review. |
| `community_contribution` | Submitted by a member and reviewed before publication. |
| `partner_contribution` | Supplied by a named delivery or technology partner. |
| `external_sourced` | Derived from an identified external source, which must be linked. |
| `workspace_authored` | Private tenant content; never part of the global corpus. |
| `unspecified` | Default. Cannot be published — blocked at database level. |

**The launch corpus is 100% `aigilityx_editorial`.** No third-party study, vendor
benchmark, customer outcome or named reference organisation is claimed anywhere in
the corpus. KPI and ROI entries are stated as *targets to validate*, not as
measured results. `organization` is deliberately left empty so no implied customer
attribution exists.

## 2. Quality gate

`quality_status` is one of `unverified`, `needs_review`, `quality_passed`,
`rejected`. A database trigger (`public.validate_use_case_provenance`) rejects any
attempt to set `status = 'published'` unless the record has a provenance label and
`quality_status = 'quality_passed'`, so the gate cannot be bypassed from the app,
an import, or an admin action.

Checks enforced by `scripts/seed/launch_corpus.py` before a record is emitted:

1. Slug uniqueness across the whole corpus.
2. Taxonomy references resolve (industry, capability, business function, objective).
3. Required narrative fields present and non-trivial: title, summary, problem,
   solution, business value, data required.
4. At least two KPIs and ROI areas per record.
5. Implementation notes, governance notes, cybersecurity notes and privacy notes
   present on every record (min length enforced).
6. Provenance label set and quality status `quality_passed`.
7. Corpus size within 150–400, ≥ 10 industries, ≥ 12 business functions.
8. Every curated collection has ≥ 6 members.

## 3. Coverage

**Industries — 18 covered, 10 use cases each**

Airlines & Aviation · Automotive & Mobility · Banking & Financial Services ·
Defence & National Security · Education & Research · Food & Agribusiness ·
Government & Public Sector · Healthcare & Life Sciences · Hospitality & Tourism ·
Law Enforcement & Justice · Logistics & Freight · Manufacturing & Industrials ·
Media & Entertainment · Pharmaceuticals & Biotech · Real Estate & Facilities ·
Regulators & Compliance Bodies · Retail & Consumer · Transport & Travel

**Business functions — 20 covered**

| Function | Use cases | Function | Use cases |
| --- | --- | --- | --- |
| Operations | 33 | Product Management | 6 |
| Marketing & Sales | 22 | Logistics | 5 |
| Customer Service | 14 | Procurement | 3 |
| Risk & Compliance | 13 | IT & Security | 2 |
| Supply Chain | 12 | Public Services | 2 |
| Field Operations | 10 | Human Resources | 1 |
| Finance | 10 | | |
| Quality Assurance | 8 | | |
| Data & Analytics | 7 | | |
| Research & Development | 7 | | |
| Strategy & Planning | 7 | | |
| Clinical Operations | 6 | | |
| Legal | 6 | | |
| Maintenance | 6 | | |

Known thinness: Human Resources, IT & Security, Public Services and Procurement
are under-represented. These are the first backlog items for the next editorial
pass; they are not launch blockers because each is still discoverable and correct.

**AI capabilities:** 16 distinct · **Business objectives:** 16 distinct.

## 4. Curated collections

Four public collections are owned by the platform account and visible to
unauthenticated visitors. Their first three members are also flagged
`is_featured` / `show_on_landing`.

| Collection | Members | Purpose |
| --- | --- | --- |
| GCC national priorities | 18 | Sovereign-relevant government, security, regulatory and national-infrastructure use cases. |
| Enterprise cost & efficiency | 18 | Operating-cost and productivity plays with short paths to measurable savings. |
| Enterprise risk, compliance & trust | 18 | Detection, assurance and reporting for regulated enterprises. |
| Customer & citizen experience at scale | 18 | Service, personalisation and self-service patterns. |

## 5. Governance, privacy and cyber classification

Every record carries governance, cybersecurity and privacy notes plus review
flags derived from consistent rules:

- `governance_required` — risk level High/Critical, or a regulated industry
  (defence, government, law enforcement, banking, regulators, healthcare).
- `privacy_review_required` — industries or functions where personal data is
  likely in scope (healthcare, pharma, government, banking, law enforcement,
  education, retail, hospitality, transport, aviation; clinical operations, HR,
  legal, risk & compliance).
- `cyber_review_required` — High/Critical risk, national-security or financial
  exposure, or IT & security workloads.
- `assurance_review_required` — early maturity (concept/prototype) combined with
  High/Critical value potential, i.e. high claim, low evidence.

## 6. Reproducing the corpus

```bash
python3 scripts/seed/launch_corpus.py            # QA gate + emits /tmp/seed/corpus.json
CORPUS_OWNER_USER_ID=<platform-user-uuid> \
  bun run scripts/seed/apply-launch-corpus.mjs   # idempotent upsert into the repository
```

Both steps are idempotent. The QA gate exits non-zero and writes nothing when any
check fails, so a broken corpus can never reach the repository.

## 7. Backlog

1. Deepen Human Resources, IT & Security, Public Services and Procurement coverage.
2. Add reference links (`use_case_links`) where a public, citable source genuinely
   exists — then move those records to `external_sourced`.
3. Introduce a periodic re-review cadence that resets `quality_status` to
   `needs_review` when a record ages past its review window.
