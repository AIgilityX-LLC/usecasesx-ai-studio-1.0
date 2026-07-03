## Alignment: your 12 deliverables vs. what the platform already does

| # | Deliverable | Status | Where it lives today |
|---|---|---|---|
| 1 | AI Use Case Identification & Longlist Report | ✅ Have | Repository, Studio, Quick Wins |
| 2 | AI Use Case Assessment & Prioritization Framework | ✅ Have | Feasibility (5-pillar), Quick Wins, Portfolio |
| 3 | AI Use Case Conceptual Design Documents | ✅ Have | Blueprint (19 sections), Use-case canvas |
| 4 | AI Analytical Logic Models | ⚠️ Partial | Blueprint "AI Approach" + "MVP Prediction" freetext only — no structured model spec |
| 5 | AI Data Requirements Definition | ✅ Have | Data Readiness module |
| 6 | AI Reference Workflows & Process Diagrams | ❌ Missing | `patterns` is an empty stub |
| 7 | AI Capability Requirement Framework | ⚠️ Partial | Feasibility questions + SARPI link only |
| 8 | AI Risk & Assumption Register | ⚠️ Partial | C3G governance captures classes/controls, no itemized register |
| 9 | AI Governance Considerations Document | ✅ Have | C3G Governance + AdvisorX |
| 10 | AI Use Case Portfolio Roadmap | ⚠️ Partial | Portfolio card/table + horizons; `roadmap` is a stub |
| 11 | AI Integration Consideration Notes (Generic) | ⚠️ Partial | API Integration page is marketing-only |
| 12 | Final Handover & Knowledge Transfer Package | ❌ Missing | Blueprint export is closest, no KT package |

**Net: 5 complete, 5 partial, 2 missing.** The pieces exist but they aren't assembled into the 12 named enterprise deliverables an advisory engagement hands over.

## What I'll build

The unifying idea: a **Deliverables workspace** per use case that generates all 12 named documents from data you've already captured (canvas, feasibility, data readiness, governance, roadmap), each individually exportable to PDF/Word, plus a one-click bundle.

**1. Deliverables hub** — new route `/studio/use-case/$id/deliverables` listing all 12 as cards with status (ready / needs data / draft), each opening a structured generator + export. Linked from the use-case index and Blueprint page.

**2. Fill the partials with structured schemas** (not just freetext):
- **#4 Analytical Logic Model** — structured spec: prediction target, inputs/features, output & thresholds, model family, training/validation approach, feedback loop.
- **#7 Capability Requirement Framework** — capability inventory across strategy/data/people/tech/governance with current-vs-required rating and build/buy/partner call.
- **#8 Risk & Assumption Register** — itemized rows: risk/assumption, likelihood×impact, owner, mitigation, residual, review date.
- **#11 Integration Consideration Notes** — generic technical template: source systems, auth, data formats, latency/SLA, error handling, middleware pattern.

**3. Build the two missing ones:**
- **#6 Reference Workflows & Process Diagrams** — before/after swim-lane + step sequence builder (text-driven, renders as an ordered process diagram), replacing the `patterns` stub content.
- **#12 Final Handover & KT Package** — assembles all completed deliverables + runbook, contacts, decision log, and lessons-learned into a single exportable package (PDF/Word/zip-of-sections).

**4. Roadmap (#10)** — upgrade Portfolio roadmap export into the named "Portfolio Roadmap" deliverable with sequenced phases, dependencies and value gates.

## Data model

One new table `use_case_deliverables` (org/workspace-scoped, RLS + GRANTs) storing `use_case_id`, `deliverable_type` (enum of the 12), `content` (jsonb structured per type), `status`, timestamps — so each deliverable is saved, versioned by updated_at, and reused by the Handover package. Reuses existing `blueprints`, `feasibility_scores`, `data_readiness_assessments` where already present.

## Delivery order

1. Migration + Deliverables hub shell + navigation
2. Structured generators for the 5 partials (#4, #7, #8, #10, #11)
3. Missing builds (#6 workflows, #12 handover package)
4. Shared PDF/Word export + bundle
5. Verify: tsgo typecheck + Playwright screenshots of the hub and 2–3 generators

## Scope notes
- Enterprise/Pro-gated, consistent with existing `RequirePlan` usage.
- Reuses existing jsPDF + docx export patterns already in the Blueprint page.
- No changes to SARPI integration pages.

This is large; I can build it in the order above, or start with just the hub + the 2 missing deliverables if you want a smaller first slice. Want the full package or the smaller slice first?