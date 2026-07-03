## Context — most of this already exists

Rather than build new duplicate pages, I'll extend what's there:

- **Browse** → `/repository` is already a full browse page: full-text search + filters for industry, AI type, business function, objective, maturity, value, complexity, risk, and time-to-value, with sort, chips, presets, and a compare tray.
- **Detail** → `/use-cases/$slug` (695 lines) already renders a use-case detail.
- **Portfolio** → `/studio/portfolio` + `/portfoliox` already save & organize use cases (tables `portfolios`, `portfolio_items` exist).
- **Admin** → `/administration` (896 lines) already manages/publishes/features use cases.

So this is a **gap-fill + alignment** job, not a rebuild.

## Gaps that need new data

The requested filters/cards reference fields the `use_cases` table does not have yet:
`security_classification`, `deployment_model`, `cost_range`. Others can be **derived** from existing columns (no schema change): market segment (from `src/lib/segments.ts` industry mapping), AI pattern (from `capabilities` / `use_case_patterns`), priority & ROI range (from `impact_score` / `value_potential`), timeline (`time_to_value`).

### Migration (step 1)
Add three nullable text columns to `public.use_cases`: `security_classification`, `deployment_model`, `cost_range`. No new tables, existing RLS/grants unchanged. After approval, the types file regenerates and code changes follow.

## Plan

**1. Browse (`/repository`) — extend filters**
- Add the missing facets to the search schema + `HorizontalFilters`: market **segment**, **AI pattern**, **priority**, **ROI range**, **deployment model**, **security classification** (timeline/risk already present).
- Wire segment/priority/ROI as derived client-side filters; deployment/security via the new columns through `listUseCases`.
- Keep existing search, chips, presets, sort, and analytics intact.

**2. Detail (`/use-cases/$slug`) — executive cards + CTAs**
- Add an executive card row: ROI / mission value, cost range, timeline, maturity, complexity, risk, governance need, security classification (reading the new + existing fields, with graceful fallbacks).
- Add the standard `CtaTriad` (Assess with SARPI, Request AIgilityX Advisory, Join Pro Waitlist) — already used on other pages.

**3. Portfolio Builder — save + organize + PDF**
- Extend `/studio/portfolio`: confirm Pro-gated save/organize flows, then add **Export portfolio summary as PDF** using the existing `jsPDF` pattern (as in the blueprint/compare exports) — title, portfolio meta, and a table of included use cases with key executive metrics.

**4. Admin (`/administration`) — segments/sectors + workflow**
- Since segments & sectors are **curated views** (from `src/lib/segments.ts`), admin "management" of them = feature/show-on-landing toggles on their use cases plus curated ordering. Extend the existing admin dashboard to filter/manage by segment & sector and expose publish / feature / archive plus the existing approval/submission workflow (`use_case_submissions`, `admin-submissions`) in one place. Org-scoped private repositories already exist via workspace/organization RLS.

## Verification
Per area: `tsgo` typecheck + Playwright screenshot of `/repository` (new filters), `/use-cases/$slug` (cards + CTAs), `/studio/portfolio` (PDF export), `/administration` (segment/sector management).

## Notes / decisions to confirm
- **Extend existing pages** (recommended) rather than create parallel `/browse`, `/use-cases`, `/portfolio-builder`, `/admin` routes that would duplicate functionality. Say if you'd rather have brand-new separate routes.
- Segments/sectors stay **curated** (no new DB tables), matching the earlier decision.
</content>
<summary>Gap-fill plan: add 3 use_cases columns, extend /repository filters, add executive cards + CTAs to detail page, add PDF export to portfolio builder, and extend admin for segment/sector management — reusing existing pages instead of duplicating.</summary>
</invoke>
