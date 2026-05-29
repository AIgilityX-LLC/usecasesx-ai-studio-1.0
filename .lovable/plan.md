# AI Use Case Repository — Development Plan

A module of the AI Hub (hub.aigilityx.com) that catalogs AI use cases with rich filtering, semantic search, AI chat, comparison, maturity scoring, and exports — synthesizing patterns from World Bank AI Repository, Digital Government Hub, AI in Use, AWS GenAI samples, Nortal, Google Cloud 101, Applied AI Institute, and GSMA Foundry.

## 1. Synthesized Reference Findings

| Source | Key pattern we adopt |
|---|---|
| World Bank AI Repository | Country/sector/SDG multi-facet filters; project-level metadata (status, partners, dates) |
| Digital Government Hub | Government function taxonomy; agency + jurisdiction tags |
| AI in Use Library | Clean card grid + tag chips; "evidence" links per case |
| AWS GenAI Samples | Architecture diagrams, reference implementations, tech stack badges |
| Nortal Public Sector | Outcome-led storytelling (problem → solution → impact metrics) |
| Google Cloud 101 | Industry grouping + short standardized blurbs at scale |
| Applied AI Institute | Maturity level, business function, value lever scoring |
| GSMA Foundry | Explore page with combined facet + keyword + map view; submission workflow |

## 2. Information Architecture

Routes (TanStack Start, file-based under `src/routes/use-cases/`):
- `/use-cases` — explore (facets + search + grid/list/map toggle)
- `/use-cases/$slug` — detail page
- `/use-cases/compare` — side-by-side (up to 4)
- `/use-cases/submit` — gated submission wizard (auth required)
- `/use-cases/admin` — moderation queue + bulk import (admin role)
- `/api/public/use-cases` — read API (JSON), `/export.csv`
- `/api/public/webhooks/submission` — optional intake

## 3. Data Model (Lovable Cloud / Postgres)

Core: `use_cases` (slug, title, summary, problem, solution, outcomes, status, visibility, author_id, created_at, embedding vector).

Taxonomy (multi-facet, many-to-many join tables):
- `industries` (sector)
- `business_functions`
- `gov_functions` + `jurisdictions` + `countries`
- `ai_capabilities` (NLP, CV, GenAI, Forecasting…)
- `tech_stack` (model, cloud, vendors)
- `sdgs`, `tags`

Supporting: `organizations`, `attachments` (architecture diagrams, PDFs), `links` (evidence/sources), `metrics` (KPI name, value, unit), `scores` (maturity 1–5, impact 1–5, effort 1–5, risk 1–5), `comments`, `shortlists` (user-owned), `submissions` (draft/review/published), `imports` (CSV jobs), `audit_log`.

Roles via separate `user_roles` table + `has_role()` security-definer function: `admin`, `moderator`, `contributor`, `viewer`.

## 4. Key Features

**Browse & filter** — faceted sidebar (industry, function, region, capability, maturity, status), keyword search, sort (recent/impact/maturity), grid/list/map views, URL-synced filter state.

**Semantic search + AI chat** — pgvector embeddings on title+summary+outcomes; `/use-cases?q=…` runs hybrid (BM25 + cosine); chat panel uses Lovable AI Gateway (Gemini default) with RAG over top-k cases, citing case cards inline.

**Compare & shortlist** — checkbox on cards adds to shortlist (persisted per user); `/use-cases/compare` shows attributes side-by-side; export shortlist to CSV/PDF.

**Maturity & impact scoring** — admin sets scores; visual radar/badges on card and detail; filter by score thresholds.

**Submission workflow** — multi-step wizard (basics → problem/solution → taxonomy → metrics/evidence → review). AI-assisted intake: paste URL or text → server function calls AI Gateway to pre-fill fields; user edits → submits → moderation queue → publish.

**Bulk import / API** — admin CSV upload (mapped to schema, dry-run preview, row errors); public read REST + CSV export; signed webhook endpoint for partner intake.

**Detail page** — hero (title, org, status, scores), tabs: Overview · Architecture · Outcomes & Metrics · Tech Stack · Evidence · Related. Share + OG image per case.

## 5. Implementation Phases

1. **Foundation** — Enable Lovable Cloud; auth; user_roles + RLS; base schema + GRANTs; seed taxonomies.
2. **Explore + Detail** — Routes, faceted UI, card/detail components, URL state, SEO metadata per case.
3. **Search** — Postgres FTS + pgvector; embeddings generated on publish via server function.
4. **Submission + Moderation** — Wizard, AI-assist server fn, admin queue, audit log.
5. **Compare + Shortlist** — Per-user persistence, compare view, exports.
6. **AI Chat** — RAG panel using AI Gateway + retrieved cases.
7. **Bulk Import + Public API** — CSV importer, `/api/public/*` read endpoints, webhook intake with HMAC verification.
8. **Polish** — Analytics, OG images, sitemap, JSON-LD (`Dataset` / `Article`), accessibility pass.

## 6. Tech Notes

- TanStack Start v1 + TanStack Query loaders; server functions for all DB access (`requireSupabaseAuth` for writes).
- Lovable Cloud Postgres with pgvector; RLS on every table.
- Lovable AI Gateway for embeddings + chat (no extra keys).
- Tailwind v4 tokens in `src/styles.css`; shadcn components; design direction chosen separately.
- File storage (architecture diagrams, attachments) via Lovable Cloud storage.

## 7. Open Items to Confirm Before Build

- Visual design direction (I'll generate 3 prototype options next).
- Initial taxonomy seed lists (use World Bank + GSMA + Applied AI defaults, or supply your own?).
- Submitter access: any signed-in user, or invite/domain-restricted?
- Multilingual content needed at launch (EN only vs EN + others)?

Approve this plan and I'll start with Phase 1 (Cloud + schema + seed taxonomies) and then ask the design direction question.
