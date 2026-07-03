# UseCasesX ← AIgilityX Platform 2.0 Alignment

The platform is already mature (repository, studio, boards, collections, portfolios, insights, SARPI/C3G/AdvisorX, admin panels). The `use_cases` schema already carries most doc fields (value/ROI, complexity, risk, maturity, time-to-value, governance/security notes, KPIs, roi_areas, recommended_platforms, SARPI/C3G mappings). So this is **alignment + extension**, not a rebuild. Per your choices: curated segment views (no schema change), build all four new experiences, apply the gold/navy theme, sequenced multi-step.

## Phase 1 — AIgilityX premium re-skin
Apply the executive navy/black/gold identity across the app via design tokens only (no per-component color hacks).
- Rewrite palette in `src/styles.css` (`@theme` + `:root`/`.dark`): deep navy background, near-black surfaces, gold primary accent, white/light foreground, subtle gradients + elegant shadows. Keep shadcn token names so all components inherit.
- Typography: load a refined display + body pair via `<link>` in `__root.tsx` and map `--font-*` tokens.
- Sweep for any hardcoded color utilities in shared components (Hero, SiteShell, PageHero, cards) and move to tokens.
- Verify: typecheck + Playwright screenshot of landing, repository, a detail page in both light/dark.

## Phase 2 — Market Segments & Sectors (curated views)
Introduce the SME / Enterprise / Government & Public Sector / Defense & Security / Critical Infrastructure lens as curated pages mapped onto existing industries/tags — no new tagging column.
- `src/lib/segments.ts`: static definitions of the 5 segments (slug, name, blurb, icon, hero copy, mapped industry/tag filters, priority themes from the doc).
- Landing: add a **Segment cards** band (5 cards) after the hero linking to segment pages.
- `_app.segments.$segment.tsx` (Segment Detail): hero, positioning, "what this segment cares about", curated use-case grid (queries repository filtered by mapped facets), and CTAs (SARPI / Advisory / Pro Waitlist).
- `_app.sectors.$sector.tsx` (Sector Detail): per-industry landing reusing existing industry taxonomy with curated use cases + CTAs.
- Add "Segments" entry to `AppSidebar` + breadcrumbs.

## Phase 3 — Quick Wins Matrix
`_app.quick-wins.tsx`: priority-vs-complexity 4-quadrant scatter (Quick Wins, Strategic Bets, Easy Extras, Moonshots) computed from `value_potential`/`complexity` on published use cases.
- Reuse existing public read functions + Recharts primitives.
- Clickable points → use-case detail; quadrant filters; segment/sector filter controls.
- Analytics events via existing `trackModuleEvent`.

## Phase 4 — ROI & Mission Value Calculator
`_app.roi-calculator.tsx`: dual-mode calculator.
- **Financial ROI**: inputs (investment range, expected annual benefit, payback) → ROI %, payback period, 3-yr value; seed defaults from a selected use case's ranges.
- **Mission Value** (gov/defense): non-financial scoring — mission value, risk reduction, readiness, response time, resilience, compliance — weighted composite, since defense value isn't purely financial (per doc §12).
- Export summary (reuse the compare PDF-print pattern); Pro-gated export via `usePlan`/`Can`.

## Phase 5 — Use Case Discovery Wizard
`_app.discover.tsx`: guided Q&A (segment → sector → size → AI maturity → priorities → budget → data → regulation/security) that maps answers to repository facets and returns a ranked shortlist with "Add to Portfolio / Compare / Assess with SARPI" actions. Client-side stepper; results query the existing use-case read functions.

## Cross-cutting
- **CTAs** standardized everywhere: Assess readiness with SARPI, Request AIgilityX Advisory, Join Pro Waitlist (existing lead-capture + waitlist).
- **Responsive**: grid + `min-w-0`/`shrink-0` header patterns on every new page.
- **SEO**: unique `head()` (title/description/OG) per new route; JSON-LD on detail pages.
- No DB schema changes required (curated views reuse current taxonomy); `portfolios`/`portfolio_items`/`use_case_scores`/`leads`(lead_captures) already exist.

## Technical notes
- Segment/sector mapping lives in a typed config module; pages filter the existing published-use-case read path (publishable-key public reads, RLS-safe).
- All new flat routes follow `_app.*` convention; nav added in `AppSidebar`; never edit `routeTree.gen.ts`.
- Verification each phase: `tsgo` typecheck + Playwright smoke/screenshot on the new route.

I'll start with **Phase 1 (re-skin)**, confirm the look, then proceed through Phases 2–5 in order.