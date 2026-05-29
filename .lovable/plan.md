# Align with UseCaseX™ PRD (AIgilityX AI Hub)

The PRD is ~50 pages and defines a much larger product than what's currently shipped. I'll keep the existing Institutional/Sovereign visual system and reshape the app around the UseCaseX™ scope, phased so we don't ship a half-built monster.

## Brand & IA alignment (Phase A — do now)

- Rebrand product surface to **UseCaseX™** ("AI Use Cases Repository Module of AIgilityX AI Hub™")
- Positioning line: *"Explore 100+ AI Use Cases for Your Industry — Find What to Automate, Govern, and Scale Next."*
- Header / footer / metadata / OG tags updated; add `UseCaseX Free` vs `UseCaseX Pro` framing
- Routes restructured to match PRD:
  - `/ai-hub/usecasex` — landing (hero, industries, featured, how-it-works, CTAs)
  - `/ai-hub/usecasex/explore` — faceted explore page (current `/`)
  - `/ai-hub/usecasex/:slug` — detail page
  - Legacy `/`, `/cases/:slug` redirect to new routes
- Quietly fix the SSR hydration mismatch on capability chips (deterministic ordering)

## Taxonomy alignment (Phase A)

Replace seeded lookups with the **official Version 1 lists** from the PRD:
- **18 Industries** (Defense, Healthcare, Real Estate, Manufacturing, Pharma, Transport & Travel, Airlines & Aviation, Food & Agribusiness, Retail & E-Commerce, Education & Academia, Media & Entertainment, Automotive & Industrial, Supply Chain & Logistics, Regulatory & Compliance, Law Enforcement, Government & Public Sector, Hospitality/Gaming/Leisure, Banking/Finance/Insurance)
- **20 Business Functions** (Strategy → Executive Decision Support)
- **20 AI Types** (replaces current `ai_capabilities`) — Predictive, Generative, Agentic, Conversational, CV, NLP, RPA, Decision Intelligence, Knowledge Graph, Digital Twin, Simulation, Recommendation, Copilot, Advisor, Workflow Automation, Governance & Assurance, Sovereign, Edge, Multimodal, Voice
- **17 Business Objectives** (new facet) — Revenue Growth, Cost Reduction, … Operational Resilience
- Drop `gov_functions` table from UI (Government becomes an industry)

## Schema additions (Phase A migration)

Extend `use_cases` to carry PRD fields used by Free/Lite + scoring:
- `business_problem`, `ai_solution_concept`, `business_value`, `data_required`, `kpis text[]`, `roi_areas text[]`
- `value_potential`, `complexity`, `risk_level`, `time_to_value`, `maturity_level` (enums)
- `is_featured`, `show_on_landing`, `display_order`
- New tables: `business_objectives`, `use_case_business_objectives`, `lead_captures`, `cta_events`
- Seed 18 industries + 20 functions + 20 AI types + 17 objectives + ~12 featured sample use cases

## Free / Lite UX (Phase B)

- Landing page sections per FR-002: hero, industry-focused grid, featured use cases, "how it works", "Explore 100+", CTA to register Pro
- Explore page filters per FR-003/004: Industry, Function, AI Type, Business Objective, Value Potential, Complexity, Risk, Maturity, Time to Value + sort
- Detail page per FR-004: business problem, AI solution concept, value, data, KPIs, ROI, risk, governance notes; CTA strip → AdvisorX / FlowX / PrivacyX / AssureX (tracked in `cta_events`)
- **FR-005 Lead Capture modal** before PDF download / Pro upsell (writes to `lead_captures`)
- **FR-006 Lite PDF** export (one use case)

## Pro (registered) UX (Phase C)

- Supabase Auth (email + Google) with `/login`, `/register`, `_authenticated` layout
- Profile creation on first login
- Save use cases, notes, priority, portfolios (`draft → ready for pilot`)
- **Scoring engine** with PRD formula:
  `total = strategic_alignment*0.20 + value_potential*0.25 + feasibility*0.20 + risk_inverse*0.15 + readiness*0.10 + time_to_value_inverse*0.10`
- Pro dashboard: totals, quick wins, high-risk, charts by industry/function/AI type
- Pro PDF report (multi-use-case portfolio export)

## Admin CMS (Phase D)

- `/admin` (admin/moderator roles) — manage taxonomies, use cases (full PRD form: Identification / Classification / Strategic / Risk & Governance / Publishing), workflow (draft → review → approved → published → archived), `use_case_audit_log`, leads inbox, analytics
- AI-assisted intake (Lovable AI Gateway, `google/gemini-2.5-flash`) to draft a use case from a paragraph
- Bulk CSV import

## API-Ready Extension Layer (Phase E)

- `/api/public/usecasex/use-cases`, `/use-cases/:slug`, `/taxonomies` (signed/keyed, rate-limited)
- CTA hook routes (`?source=usecasex&use_case_id=…`) for CyberX C3G™, SARPI™, AdvisorX™, FlowX™, PrivacyX™, AssureX™, AuditX™, RegulatorX™, ComplyX™, ARES™, ConversX™, SimulaX™, AI ROI Calculator™
- `integration_events` logging

## Technical notes

- Stack stays TanStack Start + Supabase + Tailwind v4; existing Sovereign AI Hub palette preserved
- New `use_cases` columns added non-destructively (nullable + defaults) so existing seeded rows keep working
- Auth & RLS: public can read `published` only; authors manage own drafts; admins/moderators manage all (already in place — extend to new tables)
- AI scoring + intake via Lovable AI Gateway (no extra keys needed)

## Proposed execution order

I'll execute **Phase A now** (rebrand, IA, taxonomy migration, schema additions, hydration fix) and pause for your approval before Phase B–E, since each is a meaningful build. If you'd rather I push straight through B and C in the same pass, say so and I'll keep going.
