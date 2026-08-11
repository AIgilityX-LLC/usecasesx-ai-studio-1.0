# Launch readiness decision — UseCasesX v1.0.0-rc.1 (target 14 August 2026)

Independent, evidence-based review of the frozen candidate. No code, schema, configuration or
production data was changed while producing this decision.

## 1. Candidate under review

| Field | Value | Evidence |
| --- | --- | --- |
| Version | `1.0.0-rc.1` | `src/lib/release.ts`, `package.json` |
| Release marker / tag | `release/2026-08-14` / `v1.0.0-rc.1` (tag not yet cut) | `docs/release/release-candidate-2026-08-14.md` |
| Migrations in scope | 16, timestamp-ordered, no duplicates, manifest complete | `bun run verify:release` |
| Build ID | `VITE_BUILD_ID` (CI commit sha); `local` outside CI | `releaseBuildId()` |
| Published host | none — project is unpublished; canonical `https://usecasesx.aigilityx.com` not connected | `docs/release/production-config-2026-08-14.md` §1 |

Verification executed for this review (read-only):

- `bun run test:unit` — **458 pass / 0 fail**, 48 files.
- `bun run verify:release` — 5 checks pass, **1 FAIL**: migration 16 contains `DELETE FROM`
  (`cta_events` synthetic-row cleanup, recorded as an exception in the manifest but the gate still
  fails, so the automated integrity gate is red).
- Supply-chain security scan — **0 findings**, current.
- Browser P0/P1 suite — last recorded run 75 pass / 36 fail (runner + spec drift), and no
  credentialed run exists. Not re-executed here.

## 2. Readiness scorecard (0–5)

| Dimension | Score | Basis |
| --- | --- | --- |
| Product journey (Discover→Advisory) | 4 | Journey routes implemented and unit-covered; end-to-end signed-in browser proof missing |
| Data integrity | 3 | Additive migrations, manifest complete, restore drill documented; integrity gate red on entry 16 |
| Security / privacy | 4 | RLS + `has_role`, security-definer publish path, anonymous read checks on 14 private tables, 0 dependency findings; two demo accounts still hold platform roles |
| Reliability / operations | 3 | Runbook, monitor script and rollback policy exist; owners, `PRODUCTION_URL`, `ALERT_WEBHOOK_URL` and previous-good tag are **TO BE RECORDED** |
| Performance | 3 | Keyset pagination and parallel lookups landed; no load evidence from a production host |
| Accessibility | 3 | AA intent implemented; 36 browser failures include mobile overflow, unverified |
| Content / trust | 4 | Terms, Privacy, AI notice, consent centre, data rights shipped; production destinations asserted but unverified live |
| Analytics | 3 | Attribution/session/search tracking fixed and verified locally only; demo exclusion missing on `v_enterprise_interest_weekly` |
| Support / operations process | 3 | Requests triage with SLA shipped; escalation channel and on-call owners unrecorded |
| Commercial readiness | 4 | Edition config matches the contract (launch 14 Aug 2026, Founding complimentary to 31 Dec 2026, Pro>Lite limits); Enterprise correctly presented as Design Partner only |

Weighted view: engineering substance is launch-grade; the deficit is **evidence and operational
identification**, not features.

## 3. Automatic No-Go checks

| Check | Result | Evidence |
| --- | --- | --- |
| Critical data exposure | PASS | Anonymous reads refused on all 14 private tables |
| Destructive migration uncertainty | **FAIL** | `verify:release` red on migration 16; exception is documented in prose only, not enforceable by the gate |
| Failed authentication / broken auth | UNVERIFIED | No credentialed browser run on a production-like host |
| Data loss | PASS | Additive-only policy; restore drill recorded |
| Broken core journey | UNVERIFIED | Browser suite 75/36 with runner drift; no signed-in pass |
| Unresolved critical security issue | PASS | 0 scanner findings; publish path uses security-definer function, not client trust |
| Private report exposure | PASS | Signed URLs re-verify access; TTLs tightened |
| Absent rollback / forward-fix | **FAIL** | Rollback procedure exists but the previous-good tag, `PRODUCTION_URL` and `ALERT_WEBHOOK_URL` are unrecorded, so rollback is not executable today |

Two automatic checks fail and two cannot be evaluated.

## 4. Decision

**NO-GO for an unconditional 14 August launch. Conditional Go available**, conditions below.
Version to ship once conditions clear: **`v1.0.0-rc.1`** (unchanged if no code lands; any P0 fix
produces `v1.0.0-rc.2` and the tag is re-cut, never moved).

Public message confirmed as accurate and permitted: Lite public discovery; Pro Founding Access
complimentary through 31 December 2026 under fair-use limits; Enterprise available only via paid
Design Partner engagement. No surface claims live Enterprise capability.

## 5. Conditions to convert to Go

| # | Condition | Impact if unmet | Mitigation | Owner | Date |
| --- | --- | --- | --- | --- | --- |
| C1 | Record runbook owners, escalation channel, previous-good tag, `PRODUCTION_URL`, `ALERT_WEBHOOK_URL` | Rollback and alerting not executable | Fill runbook fields; set repo variables/secrets | Technical owner | 12 Aug |
| C2 | Make migration 16 pass the integrity gate (teach `verify:release` an approved-exception list keyed to the manifest) | Integrity gate stays red; destructive-change uncertainty | Additive script change plus manifest key; no SQL change | Data owner | 12 Aug |
| C3 | Revoke the two demo platform role grants and flag the five unlabelled demo tenants | Demo actors hold admin power; demo activity pollutes analytics | Audited remediations already on Administration → Production Data | Security owner | 12 Aug |
| C4 | Connect `usecasesx.aigilityx.com` (+`www`, apex primary), publish the candidate, re-run live SEO/analytics/OG verification and the production-readiness probe from that host | Canonical/OG/analytics unverified in production | Domain connect → publish → `monitor:launch` + live SEO review | Technical owner | 13 Aug |
| C5 | Execute the browser P0 suite with a signed-in session and repair runner/spec drift; all P0 assertions green | Core journey unproven | Fix Playwright runner path; triage the 36 failures as P0/P1 | Technical owner | 13 Aug |
| C6 | Activate the 15–25 seat pilot cohort or record an admin waiver with rationale | No user evidence behind the release | Bulk CSV enrolment + invite dispatch, or waiver override | Product owner | 13 Aug |
| C7 | Exclude demo tenants from `v_enterprise_interest_weekly` | Inflated commercial signal | Additive view change mirroring the other analytics views | Data owner | 13 Aug |

C1–C5 are launch-blocking. C6 may be satisfied by a recorded waiver. C7 may ship as a day-1
forward-fix if labelled a known issue.

## 6. Open risks accepted at launch (if Conditional Go is taken)

- Build ID reads `local` for any non-CI build; publish must run through CI to keep the sha.
- Email sender domain not provisioned — invitation/notification delivery may degrade to defaults.
- No production load evidence; capacity assumptions come from local runs only.

## 7. Rollback / forward-fix

- **Code**: re-publish the previous-good tag (C1 must record it). No schema revert accompanies a
  code rollback.
- **Database**: forward-fix only, additive migration with a manifest entry. No drops, destructive
  renames, RLS weakening or ownership reassignment.
- **Feature reduction**: disable non-essential capability (AI Studio, workshop collaboration,
  reports) via `src/lib/authz/flags.ts` rather than rolling back the release.

## 8. First 24-hour monitoring priorities

1. Authentication success/failure rate and sign-in errors.
2. 5xx rate and unhandled errors on public routes (`monitor:launch` every 15 min).
3. AI endpoint rate-limit and fair-use rejection volume.
4. RLS/storage denial spikes (Administration → Observability thresholds and alerts).
5. Signup → activation funnel and CTA/attribution capture continuity.
6. Database load and slow queries.
7. Support inbox and Administration → Requests SLA breaches.
8. Live SEO/indexability and OG preview correctness on the canonical host.

## 9. Next prompt

Recommended next prompt ID: **PHASE-6-A — execute conditions C1–C5** (record runbook owners and
config, add the manifest-keyed exception to `verify:release`, apply the two production-data
remediations, connect the domain and publish, then run the credentialed browser P0 suite and live
verification).
