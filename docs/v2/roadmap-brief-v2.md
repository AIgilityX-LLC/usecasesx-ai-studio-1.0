# V2-14 — Roadmap and implementation brief

**Status:** Implemented  
**SRS:** FR-10  
**Migration:** `supabase/migrations/20260923280000_v2_14_roadmap_brief.sql`

## What changed

| Area | Change |
|------|--------|
| Waves / milestones / owner / deps | Existing `portfolio_items` delivery fields retained |
| Gate + status | `gate_key`, `roadmap_status` on membership; editable in Roadmap dialog |
| Implementation brief | Versioned `implementation_briefs` (draft → immutable publish) |
| Brief sections | Outcomes, scope, assumptions, architecture, data needs, human controls, measures, acceptance criteria, handoff links |
| Exports | CSV / SpreadsheetML XLSX / accessible PDF / JSON — each with tenant, filters, record/scoring versions, generated-at, confidentiality |

## Files

- `src/lib/roadmap/implementation-brief.ts`, `export-envelope.ts`, `brief.server.ts`, `brief.functions.ts`
- `src/lib/roadmap-export.ts` (envelope + xlsx/pdf)
- `src/components/roadmap/ImplementationBriefPanel.tsx`, `RoadmapItemDialog.tsx`
- `src/routes/_app.studio.use-case.$id.brief.tsx`, `_app.roadmap.tsx`
- `tests/unit/roadmap-workshop-v2-14-15.test.ts`

## Operator step

Apply `20260923280000_v2_14_roadmap_brief.sql`, open **RoadmapX** (gate/status + export menu) and Studio → **Implementation brief**.
