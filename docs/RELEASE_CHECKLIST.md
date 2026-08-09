# Release checklist — Lite + Pro Founding Access

Target date: **14 August 2026**. Every box must be ticked before a production
promotion. A failed item is a No-Go, not a note in the release thread.

## 1. Build and quality gates

- [ ] `bun run lint` — 0 errors
- [ ] `tsgo` typecheck — 0 errors
- [ ] `bun run build` — route-tree verify + production build pass
- [ ] `bun run verify:routes` and `bun run check:nav-integrity` pass (no dead nav)
- [ ] Unit suite green (`bunx vitest run`)
- [ ] Playwright suites green: `test:e2e`, `test:navbar`, `test:mobile`
- [ ] `bun run test:rls` green for every table added since the last release

## 2. Journey verification (Phase 3)

- [ ] `tests/journey-opportunity-to-portfolio.spec.ts`
- [ ] `tests/journey-workshop-to-portfolio.spec.ts`
- [ ] `tests/journey-private-report-access.spec.ts`
- [ ] `tests/anonymous-access-sweep.spec.ts`
- [ ] `tests/handoff-smoke.spec.ts`
- [ ] `scripts/qa/reconcile-phase3.ts` reports zero reconciliation drift

## 3. Security and tenancy

- [ ] RLS enabled with policies + `GRANT`s on every new `public` table
- [ ] Roles remain in `user_roles` only; no plan/role checks inlined in components
- [ ] Security scan shows no unresolved critical findings
- [ ] No secrets in client bundles, logs, or committed config
- [ ] Anonymous sweep confirms no Pro surface leaks to unauthenticated users

## 4. Data and migrations

- [ ] All migrations additive; no destructive drops or renames
- [ ] Rollback path documented for every migration in this release
- [ ] No production data seeded from application code

## 5. Entitlements and editions

- [ ] Lite journey usable end to end while signed out
- [ ] Pro Founding Access gates resolve through `useEntitlement`/`usePlan`
- [ ] Enterprise-only surfaces (ERP verification, advanced roles) remain flagged off
- [ ] Fair-use meter reports accurate remaining credits and blocks at the limit

## 6. Deploy and observability

- [ ] Staging deploy green, smoke suite passing against the staging URL
- [ ] Required env vars verified via `scripts/verify-deploy-env.mjs`
- [ ] Monitoring workflow probing production with alerting configured
- [ ] Rollback: previous release artifact identified and re-deployable

## 7. Content and compliance

- [ ] No placeholder metrics or fake production data on any route
- [ ] Every route has a unique `head()` (title < 60 chars, description < 160)
- [ ] WCAG 2.1 AA spot-check: contrast, focus rings, keyboard nav
- [ ] Responsive down to 360 px

## 8. Release record

- [ ] Release notes generated (`node scripts/release-notes.mjs`) and reviewed
- [ ] Tag pushed (`vX.Y.Z`) and draft release published
- [ ] Go / Conditional Go / No-Go decision recorded with owner and date

**Decision:** ______  **Owner:** ______  **Date:** ______
