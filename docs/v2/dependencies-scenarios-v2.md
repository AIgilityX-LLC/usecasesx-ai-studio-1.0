# V2-12 — Dependencies, Opportunity Map and scenarios

**Status:** Implemented  
**SRS:** FR-09  
**Migration:** `supabase/migrations/20260923260000_v2_12_dependencies_scenarios.sql`

## What changed

| Area | Change |
|------|--------|
| Dependency types | data · model · vendor · platform · integration · policy · skills · prerequisite use case |
| List first | Portfolio **Dependencies** tab; accessible adjacency **Graph** derived from the same list |
| Legacy sync | Prerequisite deps also append to `portfolio_items.depends_on` for roadmap |
| Scenarios | Saved on `portfolio_scenarios`; weights/budget/capacity/constraints — **never mutate** membership baseline |
| Insights | Explainable rules: duplicates, shared enablers, bottlenecks, concentration, no-regret |
| Opportunity Map | Concentration insights on the **filtered** set; map/table/export already share the same filtered records |
| Portfolio | Charts + table + export already use `visibleEntries` (same filters) |

## Files

- `src/lib/portfolio/dependencies-scenarios.ts`, `portfolio-deps.server.ts`, `portfolio-deps.functions.ts`
- `src/components/portfolios/PortfolioDependenciesScenariosPanel.tsx`
- `src/routes/_app.portfoliox.tsx`, `_app.opportunity-map.tsx`
- `tests/unit/portfolio-deps-scenarios-v2.test.ts`

## Operator step

Apply `20260923260000_v2_12_dependencies_scenarios.sql`, open **PortfolioX** → Dependencies & scenarios, and **Opportunity Map** with filters + table/export.
