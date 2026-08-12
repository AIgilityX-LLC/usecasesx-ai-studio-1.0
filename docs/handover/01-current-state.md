# 01 — Current State Inventory

Measured from the repository and live database, not from memory.

## Stack

| Layer | Today |
|---|---|
| Framework | TanStack Start v1, React 19, Vite 7 |
| Runtime | Cloudflare Workers (`nodejs_compat`) for SSR + server functions |
| Styling | Tailwind CSS v4 via `src/styles.css` tokens, shadcn/ui + Radix |
| Data | TanStack Query, Zod, react-hook-form |
| Backend | Supabase (Postgres, Auth, Storage) |
| Package manager | Bun |
| Tests | ~458 Bun unit tests in `tests/unit`, Playwright specs, `*.e2e.ts` scripts |

## Size

- **115** route files in `src/routes/`.
- **~90** modules in `src/lib/` covering repository, opportunities, studio, scoring, portfolio,
  roadmap, workshops, pilot, reports, observability, ops, authz, AI boundary, i18n, legal.
- **108** tables in the `public` schema.
- **16** migration files in `supabase/migrations/` (the visible, additive set).
- **~30** npm scripts, including release/verification gates.

## Database surface (public schema, 108 tables)

Grouped by domain:

- **Identity & tenancy**: `profiles`, `user_roles`, `organizations`, `organization_members`,
  `organization_units`, `workspaces`, `workspace_members`, `workspace_invitations`,
  `workspace_export_preferences`.
- **Repository / catalogue**: `use_cases`, `use_case_versions`, `use_case_submissions`,
  `ai_use_cases`, `ai_capabilities`, `collections`, `collection_items`, `use_case_boards`,
  `saved_use_cases`, `shortlists`, plus ~15 `use_case_*` join tables (industries, countries,
  gov_functions, business_functions, processes, patterns, capabilities, strategic_themes,
  objectives, links, metrics, benefits).
- **Taxonomy**: `taxonomy_*` (sectors, tags, processes, value_themes, strategic_themes,
  maturity_levels, lifecycle_stages, risk_levels, meta), `industries`, `countries`, `gov_functions`,
  `business_functions`, `business_objectives`.
- **Opportunities & scoring**: `opportunities`, `scorecards`, `scorecard_results`, `use_case_scores`,
  `feasibility_scores`, `data_readiness_assessments`, `blueprints`.
- **Portfolio & roadmap**: `portfolios`, `portfolio_items`, `portfolio_shares`.
- **Workshops**: `workshops`, `workshop_items`, `workshop_participants`, `workshop_invitations`,
  `workshop_votes`, `workshop_outcomes`, `workshop_public_value_canvas`,
  `workshop_canvas_versions`, `workshop_canvas_documents`.
- **Collaboration**: `collab_assignments`, `collab_comments`, `collab_review_states`.
- **Deliverables & reports**: `use_case_deliverables`, `use_case_deliverable_versions`,
  `generated_reports`.
- **Pilot & release governance**: `pilot_invitations`, `pilot_settings`,
  `pilot_checkpoint_responses`, `pilot_audit_events`, `pilot_reminders`,
  `pilot_reminder_dispatches`, `pilot_launch_check_runs`, `pilot_rc_waivers`,
  `pilot_verdict_snapshots`.
- **Audit & telemetry**: `audit_events`, `use_case_audit_log`, `module_events`, `product_events`,
  `cta_events`, `integration_events`, `ai_usage_events`, `use_case_views`, `use_case_downloads`,
  `use_case_ratings`, `use_case_feedback`, `product_feedback`, `request_status_alerts`.
- **Commercial & legal**: `plans`, `entitlements`, `lead_captures`, `consent_records`,
  `data_export_requests`, `data_deletion_requests`.
- **Suite integration**: `platform_modules`, `external_module_links`, `integration_links`,
  `suite_handoff_requests`.
- **Demo**: `demo_reset_log`, `demo_sample_copies`.

## Storage buckets

`avatars`, `benefit-evidence`, `canvas-documents`. Size/MIME/extension limits and signed-URL TTLs
are enforced in application code, not bucket config.

## What is high-value and must be ported, not rewritten

1. `src/lib/domain/**`, `src/lib/scoring*`, `src/lib/roadmap*`, `src/lib/portfolio*`,
   `src/lib/opportunity-map*`, `src/lib/deliverables*`, `src/lib/reports/**` — mostly pure
   TypeScript with no framework coupling. Highest ROI to lift into `packages/domain`.
2. Zod schemas and validation contracts across `src/lib/**` → `packages/contracts`.
3. `src/lib/authz/**` (editions, roles, flags, catalogue, permission-service) — the entitlement
   model. Port as-is; change only the source of plan truth (billing instead of complimentary).
4. Export builders: `portfolio-export`, `roadmap-export`, `opportunity-map-export`,
   `deliverables.export`, `report-language` (en/fr/es/de).
5. All `tests/unit/**` — they encode the business rules. Port before porting the code they cover.
6. Verification scripts: `verify-release-candidate.mjs`, `check-nav-integrity.mjs`,
   `verify-route-tree.mjs`, `ops/launch-monitor.mjs`, `seed/**`.
7. The SQL migration set and RLS policy design (`docs/architecture/tenancy-rls-design.md`).

## What is framework-specific and gets replaced

- `src/routes/**` → Next.js App Router segments (see `06-route-map.md`).
- `*.functions.ts` (`createServerFn` wrappers) → API route handlers on Railway.
- `src/integrations/supabase/{client,client.server,auth-middleware,auth-attacher}.ts` → new
  Supabase clients for Next.js server/browser and a JWKS verifier in the API service.
- `src/start.ts`, `src/router.tsx`, `src/server.ts`, `src/routeTree.gen.ts` → dropped.
- `src/lib/og-image.server.ts` (satori + resvg-wasm) → Next.js `ImageResponse`.
- Cloudflare Workers-specific constraints disappear; Railway is a normal Node runtime.

## What is safe to drop

- `docs/audit/2026-07-25/**` and `docs/audits/**` — historical snapshots. Keep for reference, do not
  treat as current.
- `docs/SIGNED-IN-ROUTING-AUDIT*.md` (three versions) — superseded by `06-route-map.md`.
- Demo scenario scaffolding **only if** the product decides demos are not part of Pro. Today they
  are wired into onboarding and admin, so default is keep-and-isolate.
- `scripts/qa/reconcile-phase3.ts` — one-off.

## Known open blockers at handover (release candidate `v1.0.0-rc.1`, verdict NO-GO)

| ID | Blocker | Owner after handover |
|---|---|---|
| B1 | Canonical host `usecasesx.aigilityx.com` not connected/serving | DevOps |
| B2 | Browser P0 Playwright suite failing (~36 failures; runner + auth session) | QA |
| B3 | Demo accounts hold platform-admin roles in production data | Backend |
| B4 | 5 demo tenants unflagged / not isolated from analytics | Backend |
| B5 | Pilot cohort has 0 enrolled participants; no evidence, no recorded waiver | Product |
| B6 | Runbook §1 named incident owners still `TO BE RECORDED` | Product/Ops |
| B7 | No sender domain for transactional/auth email | DevOps |
| B8 | No billing path — Founding Access is hard-coded complimentary to 31 Dec 2026 | Backend |
| B9 | No MFA, no SSO, single AI provider with no failover | Backend |

B1–B7 are configuration/process. B8–B9 are build work (see `07-pro-launch-features.md`).
