# UseCasesX™ → World-Class Platform Roadmap

Benchmarked against appliedAI UCP, aiusecasehub, aiinuse.org, trail-ml, and Deloitte. Four capability gaps emerged. We deliver them in phases, all powered by **our existing database/taxonomy** (no scraping), starting with the highest-impact phase now.

## Competitive gaps we close
- **Deployment Intelligence** (aiusecasehub) — aggregate analytics over the whole corpus: top use-case types, Build vs Buy, hot AI capabilities, momentum.
- **Rich case-study format** (aiinuse) — narrative business-problem → solution → outcome with evidence framing.
- **Governance-first browsing** (trail-ml) — filter & badge by AI Act-style risk class.
- **Public API + live Feed** (aiusecasehub /api, /feed).

---

## Phase 1 — Insights Hub + Landing Refresh (build now)

### A. Insights / Deployment Intelligence
New route `/_app.insights.tsx` with a hub of data-driven cards, computed live from `use_cases` + junction tables via a public read server function (`src/lib/insights.functions.ts`):
- **Top use-case types** — counts grouped by AI capability / business function, horizontal bars (click → filtered Repository).
- **By industry** — distribution across the 18 industries.
- **Value vs Complexity** — portfolio-style scatter/heat summary across the corpus.
- **Risk profile** — breakdown by `risk_level` (sets up Phase 3 governance).
- **Coverage stats** — totals (use cases, industries, capabilities, objectives) as hero KPIs.

Reuses Recharts (already in `src/components/ui/chart.tsx`). Respects plan gating: summary KPIs public; deep insight drilldowns gated for Pro/Enterprise via existing `usePlan` / `Can`.

### B. Landing page refresh (`src/routes/index.tsx`)
Keep all current sections; update + add:
- Refresh hero copy/positioning to lead with "the world's intelligence layer for AI use cases".
- Add a **live stats band** (pulls corpus counts) — credibility like appliedAI/aiusecasehub.
- Add an **Insights preview** section (top use-case types + "Explore Insights" CTA).
- Add a **"How it works"** 3-step strip (Explore → Studio → Govern & Realize value).
- Keep existing pricing cards, industry section, and disclaimer.
- Apply a chosen visual direction (see Design step) consistently.

### Design step (before building B)
Capture the current landing, then run visual preference questions (palette / type / layout) and rendered directions, lock the winner, and apply tokens in `src/styles.css`. Existing sections restyled, not removed.

---

## Phase 2 — Rich Case-Study Format
Upgrade `src/components/UseCaseDetail.tsx` into a structured case study:
- Clear **Business Problem → AI Solution → Outcomes/KPIs → ROI areas** narrative blocks (fields already exist on `use_cases`).
- **Evidence & provenance** strip (reuses `DecisionHistory` / sample-data disclaimer; "AI-generated reference" badge).
- "Similar use cases" rail and quick actions (Add to Board, Open in Studio).
- Improved SEO/OG metadata + JSON-LD per case.

## Phase 3 — Governance-First Browsing
- Add **Risk Class** facet to `UseCaseFilters` (Minimal/Limited/High/Unacceptable, mapped from `risk_level` + `governance_required`).
- Risk badges on `UseCaseCard`; a governance lens view in Insights (risk distribution by industry).
- Deep-link from a use case to the existing C3G governance studio module.

## Phase 4 — Public API + Live Feed
- Extend existing `src/routes/api/public/usecasex/*` to serve **DB-backed** published use cases (currently mock) with pagination, filters, and an `/api/public/usecasex/feed` chronological endpoint (RSS/JSON).
- New in-app `/_app.feed.tsx` chronological stream of newly published use cases.
- A lightweight `/api-docs` page documenting the public endpoints.

---

## Technical notes
- **Data source:** all analytics computed from current Supabase tables via a publishable-key public read server function (narrow `TO anon` SELECT already exists on use-case taxonomy). No schema changes required for Phase 1.
- **Charts:** Recharts via existing chart UI primitives — no new deps.
- **Gating:** reuse `usePlan`, `Can`, `permissions.ts`; summary public, drilldowns Pro/Enterprise.
- **Routing:** new flat routes `_app.insights.tsx`, later `_app.feed.tsx`; add nav entries in `AppSidebar` + breadcrumbs.
- **Verification:** typecheck + Playwright smoke on `/insights` and refreshed landing; confirm counts match DB.

I'll implement Phase 1 (Insights Hub + landing refresh, after a quick design-direction pick) and we tackle Phases 2–4 in follow-ups.