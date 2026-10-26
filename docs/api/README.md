# API documentation index

External HTTP lives under `src/routes/api/public/*` (signature / caller verification required). App-internal logic uses `createServerFn`, not Edge Functions.

## Public surfaces (code)

| Area | Path |
| ---- | ---- |
| Use case catalog | `src/routes/api/public/usecasex/use-cases.ts`, `use-cases.$slug.ts` |
| Taxonomy | `src/routes/api/public/usecasex/taxonomy.ts` |
| Roadmap export | `src/routes/api/public/usecasex/roadmap/export.ts` |
| Cron / hooks | `src/routes/api/public/hooks/*` (email alerts, ERP reconciliation, evidence cleanup, launch checks, pilot reminders) |

## Related docs

- Server boundaries: `docs/architecture/architecture-principles.md` §5, `docs/security/security-baseline.md` §4
- AI API shape: `docs/architecture/ai-boundary.md`
- CSV export contract: `docs/architecture/csv-export-contract.md`
- Handover route map: `docs/handover/06-route-map.md`

Nothing was moved; this index only links existing material.
