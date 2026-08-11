# Launch runbook — 14 August 2026 (Lite + Pro Founding Access)

Operational response plan for the launch window of candidate **v1.0.0-rc.1**
(`src/lib/release.ts` → `RELEASE_VERSION`, `package.json` → `version`, release marker
`release/2026-08-14`). Companions: `docs/release/release-candidate-2026-08-14.md`,
`docs/release/migration-manifest-2026-08-14.md`, `docs/process/change-freeze-2026-08-14.md`,
`docs/product/known-issues-2026-08-14.md`.

This document describes only mechanisms that exist in this repository today. Configuration values
are recorded in §1.1. Owner **names** are the one class of value this document will not invent:
they are confirmed by the launch decision owner at the pre-launch briefing and written into the
table in §1 before GA.

---

## 1. Owners and escalation

Named owners are recorded at the pre-launch briefing. Roles are fixed; names are filled in.

| Role                      | Responsibility                                                                       | Owner          | Backup         |
| ------------------------- | ------------------------------------------------------------------------------------ | -------------- | -------------- |
| **Launch decision owner** | Holds Go / Conditional Go / No-Go; only person who may call stop-launch or rollback  | TO BE RECORDED | TO BE RECORDED |
| **Product owner**         | Scope, launch copy, known-issue acceptance, waiver approval (Administration → Pilot) | TO BE RECORDED | TO BE RECORDED |
| **Technical owner**       | Publish/update, rollback execution, migrations, feature flags, infrastructure        | TO BE RECORDED | TO BE RECORDED |
| **Security owner**        | Authorisation/RLS defects, secret exposure, abuse response                           | TO BE RECORDED | TO BE RECORDED |
| **Data owner**            | Backups, restore drill, forward-fix migrations, production-data checklist sign-off   | TO BE RECORDED | TO BE RECORDED |
| **Support owner**         | Inbound requests via Administration → Requests, user comms, SLA tracking             | TO BE RECORDED | TO BE RECORDED |
| **Comms owner**           | Status messaging to users and design partners                                        | TO BE RECORDED | TO BE RECORDED |

Escalation path: on-call responder → technical owner → launch decision owner. Security or data-loss
suspicion escalates directly to security owner **and** launch decision owner in parallel; no waiting
on the chain.

Escalation channels: the primary launch channel is the automated alert destination configured as
`ALERT_WEBHOOK_URL` (see §1.1) plus the support mailbox used by Administration → Requests.
`scripts/monitoring/probe-production.mjs` and `.github/workflows/monitoring.yml` deliver pages to
`ALERT_WEBHOOK_URL`; when it is unset the script logs the alert instead of delivering it, which is
treated as a monitoring outage, not a quiet success.

### 1.1 Recorded configuration

| Key                          | Value                                                                                                | Where it is set                                          |
| ---------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Canonical production host    | `https://usecasesx.aigilityx.com` (apex primary; `www` redirects)                                    | Project settings → Domains                               |
| `PRODUCTION_URL`             | `https://usecasesx.aigilityx.com`                                                                    | GitHub repository **variable** (used by `monitoring.yml`) |
| `MONITOR_BASE_URL`           | same as `PRODUCTION_URL` when running `bun run monitor:launch` by hand                               | shell environment                                        |
| `ALERT_WEBHOOK_URL`          | incident webhook of the launch channel — **secret**, never printed, never committed                  | GitHub repository **secret**                             |
| Stable pre-DNS fallback host | `https://project--5f1afe16-db24-4d59-8a08-e6e5fe9f3f92.lovable.app`                                  | platform-assigned, immutable                             |
| Previous-good artefact       | **none — this is the first public release.** Method B in §3.1 is unavailable until a second candidate exists; use Method A (History revert) | see §3.1                                                 |

Until DNS resolves, monitoring and smoke checks run against the stable fallback host so the checks
are never skipped; they are re-run against the canonical host immediately after the domain is live.

---

## 2. Publish / update procedure

The exact artefact being published is the immutable tag, not "latest main".

1. **Confirm the version.** `RELEASE_VERSION` in `src/lib/release.ts` and `version` in
   `package.json` must both read `1.0.0-rc.1`; the footer marker shows `v1.0.0-rc.1 · <build id>`
   (`releaseLabel()`). `VITE_BUILD_ID` is the commit sha in CI and `local` otherwise.
2. **Verify candidate integrity** on the exact commit:
   `bun install --frozen-lockfile`, `bun run verify:release`, `bun run lint`, `bunx tsgo --noEmit`,
   `bun run verify:routes`, `bun run build`, `bun run test:unit`, `bun run check:nav-integrity`.
3. **Verify environment** for the target: `node scripts/verify-deploy-env.mjs production`
   (names only, never values).
4. **Publish.** Frontend changes go live only after the Publish/Update action in Lovable; backend
   (database, server functions) deploys immediately. Custom domain is connected in
   Project settings → Domains; a first publish is required before the domain flow is available.
5. **Record the run.** Administration → Release candidate: re-run the authenticated launch-readiness
   checks and let the run be written to the audit history.

### Post-publish smoke tests (in order, ~10 minutes)

| #   | Check                                                        | How                                                                                                |
| --- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| 1   | Public routes answer, no 5xx, acceptable latency             | `MONITOR_BASE_URL=<host> node scripts/ops/launch-monitor.mjs`                                      |
| 2   | Indexability + privacy directives correct                    | included in the monitor (`/robots.txt`, `/sitemap.xml`, `noindex` on private routes)               |
| 3   | Public API contract responds                                 | included in the monitor (`/api/public/usecasex/use-cases`, `/taxonomy`)                            |
| 4   | Social preview renders                                       | included in the monitor (`/og/use-case/<slug>`)                                                    |
| 5   | Browser P0 journeys                                          | CI `launch-readiness.yml` → `bun run test:p0` (CI is the source of truth for browser evidence)     |
| 6   | Sign-in, submit → approve → published, private report access | `bun run test:e2e`, `bun run test:submissions`, `bun run test:rls`, `bun run test:cross-workspace` |
| 7   | Production data posture                                      | Administration → Production data (anonymous-read checks, demo labelling)                           |
| 8   | Configuration posture                                        | Administration → Production readiness                                                              |

A failed smoke check is triaged with §4 severities before any further change lands.

---

## 3. Rollback and forward-fix

### 3.1 Application (code) rollback — reversible

- **Method A (fastest):** Lovable chat revert / History → select the last known-good version, then
  Publish/Update. Use for a launch-surface regression.
- **Method B:** redeploy the previous tag from source control. **Not available for this launch:**
  `v1.0.0-rc.1` is the first public artefact, so there is no earlier good tag. Method A is the
  rollback path on 14 August; Method B becomes available from `v1.0.0-rc.2` onward, whose
  previous-good tag is `v1.0.0-rc.1`.
- Rollback authority: technical owner, on the launch decision owner's call.
- After rollback: re-run §2 smoke checks 1–4 and record the outcome in the release notes.

### 3.2 Database — **not** a code revert

Schema changes are never rolled back by reverting the application.

- All 16 candidate migrations are **additive** apart from the single analytics data correction
  recorded as an exception in the migration manifest (enforced by `bun run verify:release`, which
  now honours manifest-recorded exceptions and fails on anything else), so the schema
  may stay ahead of an older application version and the previous app runs unchanged against it.
- **No `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, `DELETE FROM`, `RENAME COLUMN` or
  `DISABLE ROW LEVEL SECURITY` is authorised during the launch window.**
- **Forward-fix only:** a defective policy or routine is corrected with a _new_ additive migration
  (`CREATE OR REPLACE FUNCTION`, `DROP POLICY IF EXISTS` + `CREATE POLICY`, plus the matching
  `GRANT`s in the same migration). Editing an already-applied migration file is a P0 process
  violation.
- **Before any production apply:** request an on-demand data export (Cloud → Advanced settings).
  Restore capability is rehearsed by `scripts/ops/restore-drill.mjs`; the last recorded drill is in
  `docs/release/backup-restore-drill-2026-08-11.md` / `docs/release/restore-drill.json`.
- Data-loss suspicion: stop writes to the affected surface via its feature flag (§5), page the data
  and security owners, and do not attempt in-place repair before an export exists.

### 3.3 Version discipline for a launch fix

Any change that lands on the candidate produces a new tag (`v1.0.0-rc.2`, …). Tags are never moved.
A fix is retested with §2 steps 2–4 and the smoke set before the decision owner accepts it.

---

## 4. Incident severities and response

Severity follows `docs/process/change-freeze-2026-08-14.md`, extended with live-service targets.

| Severity    | Definition                                                                                                                                                         | Acknowledge    | First update | Target mitigation                           | Who is engaged                               |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------- | ------------ | ------------------------------------------- | -------------------------------------------- |
| **S1 / P0** | Unauthorised or cross-workspace data access, secret exposure, data loss, sign-in broken, a core-journey step that cannot complete, sustained 5xx on a launch route | 15 min         | 30 min       | 2 h (mitigate, even by disabling a feature) | Technical + security + launch decision owner |
| **S2 / P1** | Degraded but usable: AI unavailable, exports failing, emails not delivering, one non-core surface broken, latency > 5 s on a launch route                          | 1 h            | 4 h          | 24 h                                        | Technical owner, support owner               |
| **S3 / P2** | Cosmetic, single-record, or content defect with a workaround                                                                                                       | 1 business day | Weekly note  | Post-launch train                           | Product owner                                |

### User communication

- **S1:** in-product notice on the affected surface plus a message from the comms owner to the pilot
  cohort and design partners within 60 minutes. State impact and next update time; never state a
  cause that has not been confirmed.
- **S2:** notice on the affected surface only ("temporarily unavailable"), plus a note in the
  support queue reply. A disabled capability must read as _not available right now_, never as an
  upsell and never as if a planned Enterprise capability were live.
- **S3:** no proactive comms; answered in the support queue.

### Stop-launch triggers (any one of these halts the launch)

1. Confirmed unauthorised access, cross-tenant leakage, or service-role/AI-secret exposure.
2. Confirmed loss or corruption of customer data, or a failed on-demand export before apply.
3. Sign-in / sign-up unusable for all users.
4. A core-journey step (Discover → … → Advisory) that cannot complete for a normal user.
5. Error rate above the monitor threshold on launch routes for two consecutive probe cycles after a
   mitigation attempt.
6. A destructive or non-manifest migration reaching production.

On a stop-launch call: publish the previous good version (§3.1), disable affected non-essential
features (§5), notify the cohort, and record the decision with owner and timestamp in
`docs/product/release-notes-2026-08-14.md`.

---

## 5. Feature-flag contingencies

Non-essential capability is switched off by configuration, without a code change. Browser switches
are read in `src/lib/feature-flags.ts`; capability defaults live in `src/lib/authz/flags.ts` and
resolve through `useEntitlement` / `usePlan` / `RequirePlan` / `Can`. Setting a `VITE_PUBLIC_*`
switch to `"false"` disables the surface; a capability flag is disabled by setting its
`VITE_CAPABILITY_*` variable to `"false"`.

| Capability                                                                                                                   | Switch                                          | Disable when                                  | User-visible effect                                                  |
| ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | --------------------------------------------- | -------------------------------------------------------------------- |
| AI Use Case Studio                                                                                                           | `VITE_PUBLIC_STUDIO_ENABLED=false`              | AI provider outage, abuse spike, cost runaway | Studio entry points hidden; repository unaffected                    |
| My Use Cases                                                                                                                 | `VITE_PUBLIC_MY_USE_CASES_ENABLED=false`        | Submission/lifecycle defect                   | Personal list hidden; discovery unaffected                           |
| Boards / collections                                                                                                         | `VITE_PUBLIC_BOARDS_ENABLED=false`              | Board write or pagination defect              | Boards hidden                                                        |
| Lifecycle analytics                                                                                                          | `VITE_PUBLIC_LIFECYCLE_ANALYTICS_ENABLED=false` | Aggregate views wrong or slow                 | Analytics section hidden rather than showing a wrong number          |
| Workshop collaboration (incl. Sovereign Public Value Canvas™)                                                                | `VITE_CAPABILITY_WORKSHOP_MODE=false`           | Collaboration or canvas document defect       | Workshop surfaces report "not available"; existing records untouched |
| Opportunity Map                                                                                                              | `VITE_CAPABILITY_OPPORTUNITY_MAP=false`         | Map render or export defect                   | Map reports "not available"                                          |
| Tenancy v2 surfaces                                                                                                          | `VITE_TENANCY_V2_ENABLED` (already off)         | keep off unless explicitly launched           | No workspace switcher UI                                             |
| Enterprise-designed capabilities (`stageGates`, `multiEntity`, `integrations`, `sso`, `fullAudit`, `erpBenefitVerification`) | already off by default                          | keep off                                      | Surfaces state they are not live                                     |

**Essential and therefore never disabled during the window:** authentication, the public repository
and discovery surfaces, use-case detail pages, submission review/publish, RLS and authorisation,
audit writes, and the legal/transparency pages.

Disabling a flag is a **configuration** change under the freeze: allowed, but must be recorded
(who, when, why, expected re-enable condition) in the release notes.

Reports and exports have no dedicated switch. If exports must be stopped, disable the surface that
offers them (lifecycle analytics, boards, workshop) and reply to export requests from the support
queue; do not remove routes during the window.

---

## 6. Launch monitoring

### Automated

| What                                                                  | Mechanism                                                                                                  | Cadence                  |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------ |
| Public route availability, 5xx spike, latency                         | `.github/workflows/monitoring.yml` → `scripts/monitoring/probe-production.mjs` (`PRODUCTION_URL` variable) | every 15 min             |
| Launch-window deep probe (routes, indexability, public API, OG image) | `node scripts/ops/launch-monitor.mjs`                                                                      | every 30 min, first 24 h |
| Build / deploy failure and Playwright regressions                     | `monitoring.yml` alert jobs (issue + `ALERT_WEBHOOK_URL` page)                                             | on workflow completion   |
| Browser P0 journeys                                                   | `.github/workflows/launch-readiness.yml` → `bun run test:p0`                                               | on run + on demand       |

### Manual watch list (executable checks)

| Signal                         | Where                                              | Escalate when                                           |
| ------------------------------ | -------------------------------------------------- | ------------------------------------------------------- |
| Auth success / failure         | Administration → Observability                     | failure rate rises against the first-hour baseline      |
| Application errors             | Administration → Observability                     | any new repeating error on a launch surface             |
| Authorisation / RLS blocks     | Administration → Observability (abuse shield)      | block threshold alert fires → treat as S1 until cleared |
| AI usage, rate-limit events    | Administration → Observability                     | sustained rate-limit hits or an unexplained volume jump |
| Email / invitation delivery    | Administration → Pilot programme (invite dispatch) | invitations queued but not delivered                    |
| Sign-ups and activation        | Administration → Analytics, Launch learning        | sign-ups without a first discovery action               |
| Database load and slow queries | Cloud database health / slow-query view            | slow queries appearing on list reads                    |
| Support inbound                | Administration → Requests (SLA tracking)           | two or more reports of the same defect                  |
| Candidate integrity            | Administration → Release candidate                 | any gate flips to failing                               |

Baseline convention: the first hour after publish is the baseline. Compare later cycles against it;
do not compare against an invented target.

---

## 7. 24-hour review checklist

Run at T+24 h with the launch decision owner present.

- [ ] Deployed version confirmed as the intended tag (footer marker + `verify:release`)
- [ ] `node scripts/ops/launch-monitor.mjs` clean on the production host; metrics artefact kept
- [ ] Monitoring workflow ran on schedule; no unacknowledged alerts
- [ ] Auth: sign-up and sign-in succeed; no unexplained failure cluster
- [ ] Core journey completed end-to-end by a real signed-in user (evidence recorded)
- [ ] Submit → review → publish exercised once; audit rows present with correlation IDs
- [ ] Authorisation: no RLS/storage block spike; anonymous sweep still clean
- [ ] AI: no rate-limit storm, no provider errors, fair-use meter accurate
- [ ] Emails / pilot invitations delivered
- [ ] Support queue triaged; every S1/S2 has an owner and an SLA
- [ ] Database: no slow-query regression, no unexpected growth
- [ ] Feature flags: record every flag changed and why; plan re-enable
- [ ] Known issues list updated with anything actually observed
- [ ] Decision recorded: continue / hold / roll back (owner + timestamp)

## 8. 72-hour review checklist

- [ ] Trend review over three days: error rate, latency, auth failures, AI events
- [ ] Activation funnel reviewed (sign-up → discovery → capture → portfolio) with demo data excluded
- [ ] Pilot evidence: invitations, checkpoint responses and reports present, or waiver recorded
- [ ] Every S1 closed; every S2 has a dated fix plan on the post-launch train
- [ ] Any forward-fix migration added to `docs/release/migration-manifest-2026-08-14.md`
- [ ] Disabled features re-enabled or an owner-approved extension recorded
- [ ] Backup/restore posture still valid; a fresh export taken if schema changed
- [ ] Release notes finalised with verification results and observed issues
- [ ] Freeze lifted or extended by recorded decision (`docs/process/change-freeze-2026-08-14.md`)
- [ ] Runbook corrected wherever reality differed from this document

---

## 9. Verification of this runbook against the actual setup

Checked on authoring, against the repository rather than assumption:

| Claim in this runbook                    | Verified against                                                                                                                                                                     |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Version and build identity               | `src/lib/release.ts`, `package.json` (`1.0.0-rc.1`)                                                                                                                                  |
| Integrity, lint, build, unit commands    | `package.json` scripts (`verify:release`, `lint`, `build`, `test:unit`, `test:p0`, …)                                                                                                |
| Environment name checks                  | `scripts/verify-deploy-env.mjs`                                                                                                                                                      |
| Availability probe and alert delivery    | `scripts/monitoring/probe-production.mjs`, `.github/workflows/monitoring.yml`                                                                                                        |
| Browser evidence in CI                   | `.github/workflows/launch-readiness.yml`                                                                                                                                             |
| Additive-only migrations, forward-fix    | `docs/release/migration-manifest-2026-08-14.md`                                                                                                                                      |
| Restore capability                       | `scripts/ops/restore-drill.mjs`, `docs/release/restore-drill.json`                                                                                                                   |
| Feature switches and capability defaults | `src/lib/feature-flags.ts`, `src/lib/authz/flags.ts`                                                                                                                                 |
| Admin monitoring surfaces                | `src/routes/_app.admin-observability.tsx`, `_app.administration.{analytics,requests,pilot,production-data,production-readiness,release-candidate,launch-checks,launch-learning}.tsx` |
| Public API and preview endpoints         | `src/routes/api/public/usecasex/*`, `src/routes/og.use-case.$slug.ts`, `src/routes/sitemap[.]xml.ts`                                                                                 |

Not verifiable from the repository and therefore left open: named owners, escalation channel,
`ALERT_WEBHOOK_URL` / `PRODUCTION_URL` configuration, the canonical production host, the email
sender domain, and the previous-good tag for rollback. All are marked **TO BE RECORDED** above and
must be filled in before GA.
