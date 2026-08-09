# Phase 3 Verification — Opportunity-to-Portfolio and Workshop Outcome

Goal: produce evidence that a Pro user can go Discover → Portfolio → Export without database intervention, that a facilitator can turn workshop inputs into a portfolio and report, that every chart reconciles with its source rows, and that nothing private leaks. Ends with an explicit Go / Conditional Go / No-Go for Phase 4.

This is a verification phase. No feature work, no schema change. The only files created are test specs, a reconciliation script and the report documents. Any defect found is logged in the report, not fixed inline, unless it is a P0 permission or data-integrity defect.

## What already exists

Coverage present today: RLS isolation, tenancy isolation, authz matrix, audit immutability, opportunities RLS, collaboration workspace + timeline, workshop permissions + invitations, handoff lifecycle, CSV/PDF export contract and receipt, print layout across three browsers, mobile responsive, navbar, demo smoke, and 191 unit tests.

Gaps that block a defensible Phase 3 sign-off:

1. No single spec that walks one Pro user end-to-end Discover → Opportunity → Studio → Score → Portfolio → Roadmap → Export.
2. No facilitator spec that converts workshop outputs into a portfolio and then a report.
3. No reconciliation check — Opportunity Map counts, portfolio rollups, roadmap buckets, benefit totals and handoff analytics are each computed in the UI layer and never compared against the underlying rows.
4. No anonymous-access sweep asserting that every Pro/Enterprise route redirects or gates rather than rendering data.
5. No AI-outage behaviour test.

## Work items

### 1. Journey specs (Playwright, workspace fixture)

- `tests/journey-opportunity-to-portfolio.spec.ts` — one Pro user, no admin client writes: capture an opportunity, convert it to a studio use case, score it, add it to a new portfolio, place it on the roadmap, add a benefit, export a package. Assert each step persisted, and that the next screen reads the row the previous step wrote.
- `tests/journey-workshop-to-portfolio.spec.ts` — facilitator runs a workshop, promotes voted items to use cases, creates a portfolio from them, generates the executive report, and confirms the report cites the workshop as provenance.
- Both use the existing `tests/fixtures/workspace.ts` provisioning so each run is isolated.

### 2. Data reconciliation harness

- `scripts/qa/reconcile-phase3.mjs` — for a target workspace, read the source rows through the service-role client (server-side script only, never shipped to the browser) and recompute every aggregate the UI displays: Opportunity Map counts by status/urgency, portfolio item counts and decision mix, roadmap period buckets, benefit expected-value totals by state, handoff counts by target/status, activity-timeline event counts.
- Output a table of `surface | UI value | source value | delta`. Any non-zero delta is a defect row in the report.
- UI values are read from the same pure domain functions the components call (`portfolio` model, `roadmap`, `opportunity-map`, `benefits.model`, `handoff.analytics`) so the comparison tests the mapping, not a screenshot.

### 3. Access and exposure evidence

- `tests/anonymous-access-sweep.spec.ts` — enumerate every route from the generated route tree, visit each signed-out, and assert the protected ones redirect to `/auth` and never render workspace data. Fails loudly on any new route added without a gate.
- Extend role coverage: viewer cannot export or change status; contributor cannot manage members; facilitator can manage only their workshop.
- Private-report exposure: a share token for portfolio A must not read portfolio B; a revoked member must lose read access on the next request; export receipts must record an `audit_events` row that the actor cannot edit or delete.
- Seat-limit and fair-use gating re-checked at the boundary (at limit, over limit).

### 4. Resilience and presentation

- AI outage: stub the AI gateway to fail and confirm narrative surfaces show a labelled degraded state, that generation is blocked rather than inventing facts, and that non-AI export still completes.
- Desktop 1280 and mobile 390 passes over the journey surfaces, checking loading, empty, error and role-based states.

### 5. Reports

- `docs/testing/phase-3-test-report.md` — per-scenario result, defect list with severity (P0–P3), and the acceptance-criteria table.
- `docs/testing/phase-3-reconciliation.md` — the delta table plus method notes.
- `docs/testing/phase-3-access-evidence.md` — route sweep matrix, revocation and share-token results, export audit IDs.
- Decision section in the test report: Go if zero P0 and zero reconciliation delta; Conditional Go if only P2/P3 remain with named owners and dates; No-Go on any P0 permission or data-integrity defect.

## Technical notes

- All new specs run under the existing Playwright config, which boots the app on port 8080 and captures trace, screenshot and video on failure.
- Backend-dependent specs skip with a warning when credentials are absent, matching the current CI behaviour, so the Phase 3 run must be executed in a credentialed environment for the evidence to count.
- The reconciliation script is a Node script under `scripts/qa/`, invoked manually; it is not imported by app code and never bundled.
- No migration is required. If the run exposes a missing RLS policy, that becomes a separate, staged change with its own approval — it is not folded into this phase.

## Sequencing

1. Reconciliation harness (fastest signal on data integrity).
2. Two journey specs.
3. Access and exposure sweep.
4. Resilience and responsive passes.
5. Write the three documents and issue the decision.
