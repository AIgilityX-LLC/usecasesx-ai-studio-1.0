# Reports Hub

**Status:** implemented (navigation + catalogue).  
**Global sidebar:** a single **Reports** entry → `/reports`.  
**Catalogue source:** `src/lib/reports/reports-hub.ts`.

## Inventory

| Report | Audience | Permission | Required data | Live formats | Status | Existing | Missing |
| ------ | -------- | ---------- | ------------- | ------------ | ------ | -------- | ------- |
| Executive Summary | Executives, AI leaders | `report.read` (+ generate) | Saved use cases, scores, profile | PDF, CSV, benefits CSV | Available | Department AI Use Case Report recipe | Dedicated exec layout; XLSX/PPTX |
| Board Pack | Board / investment committee | `report.read` | Saved use cases, scores | PDF, CSV, benefits CSV | Available | Board AI Opportunity Brief | PPTX board pack |
| Portfolio Report | Portfolio managers, PMO | `report.read` | Portfolio + items + content + benefits | PDF, CSV, benefits CSV | Available | AI Opportunity Portfolio Report | Multi-portfolio compare |
| AI Investment Report | CFO / investment committee | `report.read` | Funding, ranks, benefits | — | Planned (Not live) | Closest: Portfolio / Quick Wins | Investment template + exports |
| ROI / Value Report | Value office, finance | `report.read` | Scores, Studio benefits | PDF, CSV, benefits CSV | Available | AI Readiness and ROI Next-Step Report | ERP chapter; XLSX |
| Governance Summary | Governance / risk | `report.read` | Gate reviews/events | — | Planned (Not live) | `/reviews` + UC governance preview | Gate roll-up report |
| Use Case Business Case | Owners, sponsors | `report.read` | Saved use cases, scores, benefits | PDF, CSV, benefits CSV | Available | AI Use Case Summary Report | DOCX template |
| Export Center | Workspace members by role matrix | `report.read` | Same as chosen report | PDF, CSV, benefits CSV | Available | `report-access` + export helpers | Bulk jobs; XLSX/PPTX adapters |

## Modular export adapters (future)

Live: `pdf` (print), `csv`, `csv_benefits` via `src/lib/reports/report-access.ts` + `report-export.ts`.  
Reserved (not offered as buttons): `xlsx`, `pptx`, `docx` in `FUTURE_OUTPUT_FORMATS`.

Do not add report types to the global sidebar. New recipes register in `REPORTS_HUB_ITEMS` only.
