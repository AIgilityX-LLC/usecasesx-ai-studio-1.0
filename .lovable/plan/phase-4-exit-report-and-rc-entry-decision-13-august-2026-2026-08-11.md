# Phase 4 Exit Report and RC Entry Decision — 13 August 2026

## Decision: CONDITIONAL GO

The build, tests and isolation gates pass. Release-candidate freeze can begin, conditional on four items closing before 13 August. The one true blocker is evidence, not code: the pilot has never been activated, so "pilot proves core journey usable" cannot be asserted.

---

## 1. Evidence collected (measured today, not assumed)

Automated gates — all green:

| Gate                      | Result                                                          |
| ------------------------- | --------------------------------------------------------------- |
| Unit/integration suite    | 388 pass, 0 fail (40 files)                                     |
| Nav integrity             | 45 nav targets + 6 redirects resolve, 0 dead links              |
| /compare analytics wiring | 7/7 events wired, compiles                                      |
| Typecheck (tsgo)          | clean                                                           |
| Lint                      | 0 errors, 258 warnings                                          |
| Production build          | success (Workers bundle generated)                              |
| Playwright                | v1.61.1 available; browser P0 needs a signed-in preview session |

Production data state:

| Signal                                    | Count     |
| ----------------------------------------- | --------- |
| Published use cases                       | 54        |
| Submissions                               | 2         |
| Profiles                                  | 5         |
| Portfolios                                | 1         |
| Opportunities / reports / AI usage events | 0 / 0 / 0 |
| Audit events / product events             | 64 / 26   |
| Pilot invitations                         | 0         |
| Pilot checkpoint responses                | 0         |
| Open blocking/high feedback               | 0         |

---

## 2. Pilot activation summary

Pilot infrastructure is complete and verified (invitations, settings, checkpoints, audit events, bulk enrollment up to 25 seats, CSV/PDF export, reminders, triage panel, 7-day evidence-gap watchdog). Nothing has been run through it.

- Seats issued: 0 of the 15–25 target
- Participants activated: 0
- Checkpoint responses: 0
- Advisory interest signals: 0

Completion rate: not computable. Top three drop-offs cannot be reported from evidence. The only observable funnel loss is upstream of the pilot itself: 0 invitations issued because no participant email list has been supplied.

Inferred risk order from telemetry rather than pilot data (explicitly labelled as inference, not evidence): Discover → Capture Opportunity is the widest gap (0 opportunities against 54 published use cases and 5 profiles), then Prioritize → Portfolio (1 portfolio), then Export → Advisory (0 generated reports). These are hypotheses for the pilot to test, not findings.

Triage verdict stays **No-Go on evidence** until seats are issued and at least ~8 participants complete the journey with checkpoint answers.

---

## 3. Security, privacy and data-loss review

No P0. Scan returns 4 warn-level findings, 0 critical, 0 high:

1. `module_events` INSERT policy does not bind `user_id` to `auth.uid()` — analytics attribution spoofing.
2. `cta_events` INSERT policy has the same gap.
3. `workshop_items` "Authors edit unreviewed items" UPDATE policy re-checks ownership but not `status`, so an author can self-approve out of the curation workflow.
4. Signed-in users can EXECUTE a `SECURITY DEFINER` function — needs a per-function review of which are intended to be callable.

Verified sound: no service-role or AI-provider secret in client code or public config; workspace/tenant ownership on tenant rows; publishing routed through the `SECURITY DEFINER` publish function rather than a weakened RLS policy; signed-URL TTLs, MIME/size limits and storage authorization re-verification in place; AI fair-use rate limits and input sanitization in place; export/download audit log and abuse shield in place; data export, deletion (30-day grace) and consent flows in place with owner-scoped RLS.

No data-loss, auth, migration or build issue found. All migrations to date are additive.

---

## 4. Open risks and owner/decision

| ID  | Risk                                                      | Sev                                              | Decision                                                                                                                                |
| --- | --------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Pilot never activated; core-journey usability unproven    | P1 (release-gating for the acceptance criterion) | Owner: product. Issue 15–25 seats immediately or accept an explicit "launch without pilot evidence" waiver.                             |
| R2  | `workshop_items` author self-approval                     | P1                                               | Fix before freeze — tighten `WITH CHECK` to pin `status = 'submitted'` for non-facilitators. Additive policy change.                    |
| R3  | `module_events` / `cta_events` user_id spoofing           | P2                                               | Fix before freeze (cheap, additive `WITH CHECK`). Analytics integrity only, no PII exposure.                                            |
| R4  | `SECURITY DEFINER` execute surface                        | P2                                               | Owner: engineering. Enumerate functions, revoke EXECUTE from `authenticated` where callers should be server-only.                       |
| R5  | Browser P0 suite not executed against a signed-in preview | P2                                               | Owner: QA. Run the authenticated release regression pass once a preview session exists; unit/integration coverage stands in until then. |
| R6  | 258 lint warnings                                         | P3                                               | Accept for RC; burn down post-launch.                                                                                                   |
| R7  | Near-empty product tables (0 opportunities/reports)       | P3                                               | Expected pre-launch; do not seed fake production records.                                                                               |

---

## 5. Product claims vs edition matrix

Claims reviewed across the marketing surfaces, footer, legal/help routes and the transparency pages. Consistent with the matrix: Lite as unauthenticated public discovery; Pro Founding Access complimentary through 31 December 2026 with fair-use limits stated; Enterprise presented as design-partner engagement, not as a live self-serve capability. No UI advertises planned Enterprise capability as available. Plan gating resolves through the central entitlement helpers rather than inline checks.

One wording check to make during freeze: every surface that mentions Pro complimentary access must state the fair-use limitation in the same block, so the offer is never shown unqualified.

---

## 6. RC entry decision

**Conditional Go for 13 August**, conditions in order:

1. Close R2 (workshop item self-approval) and R3 (event attribution) with one additive policy migration. No table drops, no ownership changes, no RLS weakening.
2. Complete the R4 `SECURITY DEFINER` execute audit and revoke where server-only.
3. Either activate the pilot with 15–25 seats and reach ~8 completed journeys with checkpoint answers, or record a signed waiver accepting launch without pilot evidence. This is the decision that flips Conditional Go to Go or No-Go.
4. Run the authenticated browser P0 pass and attach the standardized evidence artifacts.

If condition 3 is neither met nor waived by 12 August, the honest verdict is **No-Go on the acceptance criteria** even with all code gates green.

---

## Technical notes

- This is a plan-mode report: no code, schema, configuration or production data was modified.
- Changed files: none.
- Migrations/policies: none applied. Two additive policy changes proposed (R2, R3) plus targeted `REVOKE EXECUTE` statements (R4).
- Tests run: unit/integration 388 pass, nav integrity, compare analytics, typecheck, lint, production build.
- Evidence: counts and gate output in sections 1–3, captured 11 August 2026.
- Rollback/forward-fix: nothing to roll back. The proposed policy changes are forward-fixable by re-widening `WITH CHECK` in a follow-up additive migration; no data migration is involved.
- Recommended next prompt: **RC-01 — apply the R2/R3/R4 policy hardening migration and re-run the security scan**, then **PILOT-ACT-01 — issue pilot seats from a supplied email list**.
