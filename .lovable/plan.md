## Goal

Populate the (currently empty) database so the Repository shows at least 10 high-potential, relevant AI use cases for each of the 18 industries in the attached image, and add a clear disclaimer that the sample data is AI-generated for organizational reference.

## Current state

- The Repository page (`/repository`) reads from the database (`use_cases` + taxonomy/junction tables) via `listUseCases`. Every one of those tables is currently empty, so the page shows nothing.
- A separate mock file (`usecasex.mock.ts`) feeds the landing page/public API with ~24 sample cases — that stays as-is.
- Use cases only appear when `status = 'published'` and `visibility` is `free_lite`/`both`.

## The 18 industries (from the image)

Defense, Healthcare, Real Estate, Manufacturing, Pharmaceuticals, Transport & Travel, Airlines & Aviation, Food & Agribusiness, Retail & E-Commerce, Education & Academia, Media & Entertainment, Automotive & Industrial, Supply Chain & Logistics, Regulatory & Compliance, Law Enforcement Agencies, Government & Public Sector, Hospitality Gaming & Leisure, Banking Finance & Insurance.

## Plan

### 1. Seed taxonomy tables
Insert the 18 `industries` (slugs aligned with existing mock slugs, e.g. `defense`, `healthcare`, `real-estate`, …), plus `ai_capabilities`, `business_functions`, and `business_objectives` drawn from the existing canonical lists in `usecasex.data.ts`.

### 2. Generate use-case content
Use the AI gateway to generate, per industry, 10+ realistic high-value use cases. Each record includes: title, summary, business problem, AI solution concept, business value, data required, KPIs, ROI areas, AI capability, business function, objective, and value/complexity/risk/time-to-value/maturity ratings. This yields 180+ use cases.

### 3. Insert use cases
Insert all generated use cases into `use_cases` with `status = 'published'`, `visibility = 'both'`, a `published_at` timestamp, and unique slugs. Then wire each to its industry, capability, business function, and objective via the junction tables, and add a few headline metrics per case in `use_case_metrics`.

### 4. AI sample-data disclaimer
Add a reusable `SampleDataDisclaimer` banner component (using existing `Alert` UI + design tokens) stating the use cases are AI-generated sample data intended as a reference/starting point for organizations and should be validated before operational use. Display it:
- at the top of the Repository page, and
- on the use-case detail page (`_app.use-cases.$slug.tsx`).

### 5. Verify
Query counts per industry to confirm ≥10 each, then load the Repository in the preview to confirm cards render with industry filters and the disclaimer shows.

## Technical notes

- Taxonomy + use-case inserts go through the data-insert tool (not migrations) since tables already exist.
- Slugs must be globally unique; industry-prefixed slugs (e.g. `healthcare-clinical-triage-copilot`) avoid collisions.
- Existing mock data and the landing page are untouched.
