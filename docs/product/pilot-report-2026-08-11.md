# Pilot report — founding pilot cohort (`founding-pilot-2026-08`)

Date of report: 11 August 2026 · Author: engineering · Release under review: **Lite + Pro Founding Access, 14 August 2026**

Purpose: use pilot evidence to **stabilise** the release. No feature was added, no surface redesigned.

---

## 1. Evidence base actually available

Read directly from recorded signals at the time of the report (not self-reported, not estimated):

| Signal source                                     | Rows recorded                 |
| ------------------------------------------------- | ----------------------------- |
| Pilot invitations (`pilot_invitations`)           | 0                             |
| Checkpoint answers (`pilot_checkpoint_responses`) | 0                             |
| Structured reports (`product_feedback`)           | 0                             |
| AI usage events (`ai_usage_events`)               | 0                             |
| Product/funnel events (`product_events`)          | 26 (journey stage views only) |
| Audit events (`audit_events`)                     | 64                            |
| Published repository use cases                    | 54                            |

**Conclusion: the controlled pilot has not yet been run against this environment.** There is
therefore no participant funnel, no failed-AI evidence, no save-failure evidence, no no-result
search evidence and no support questions to classify. This report deliberately does **not**
manufacture any of those numbers.

## 2. What was built instead of a fabricated report

A triage layer that produces the report automatically from real signals the moment the pilot runs:

- Deterministic classification of every signal into **P0 / launch P1 / post-launch P2 / education-content / out-of-scope** (`src/lib/pilot/pilot.triage.ts`).
- Server-side assembly from existing surfaces only — cohort view, feedback queue, launch-learning aggregates, security alerts (`src/lib/pilot/pilot.triage.server.ts`).
- An admin-only, read-only panel on **Administration → Pilot programme** showing the classified findings and the explicit go/no-go verdict (`src/components/pilot/PilotTriagePanel.tsx`).

### Classification rules (auditable, unit-tested)

| Signal                                                      | Class                                              |
| ----------------------------------------------------------- | -------------------------------------------------- |
| Checkpoint answer with `blocked = true`                     | **P0**                                             |
| Report with severity `blocking`                             | **P0**                                             |
| Triggered `critical` security alert (e.g. cross-workspace)  | **P0**                                             |
| AI task with ≥50 % errors over ≥5 calls                     | **P0**                                             |
| AI task with ≥20 % errors over ≥5 calls                     | **P1**                                             |
| `high`-severity bug or performance report                   | **P1**                                             |
| ≥3 answers rating a step ≤2/5 or effort ≥4/5                | **P1** (copy / required fields / empty state only) |
| Triggered `warning` alert; other high-severity reports      | **P1 / P2**                                        |
| Everything else unresolved                                  | **P2**                                             |
| Data/content quality reports; queries returning nothing ≥3× | **Education / content**                            |
| Missing-capability and enterprise-interest reports          | **Out of scope** for 14 August                     |

### Verdict gate

- Any open **P0** → **No-Go**.
- Fewer than **10** checkpoint answers, or zero activated participants → **No-Go on evidence** (a clean-looking but thin cohort can never produce a Go).
- Open **P1** only → **Conditional Go**, each P1 needing a fix or a written mitigation.
- Otherwise **Go**.

## 3. Current verdict

**No-Go on evidence.** Zero invitations issued, zero checkpoint answers, zero activated
participants. The gate cannot be satisfied by code; it requires the cohort of 15–25 participants
to run the mission (Administration → Pilot programme → invite, then _Send reminders_).

No P0 defect is open, because no P0 defect has been evidenced. This is an evidence gap, not a
clean bill of health.

## 4. Fixes made under this task

Stabilisation only:

- Added the pilot triage and freeze-verdict layer above (read-only; no schema change, no new table, no policy change).
- No behavioural change to Lite or Pro capabilities.

No P0/P1 product defect was fixed because none is evidenced. The moment the pilot produces a
blocker, it appears as a P0 finding with the exact mission step and a deep link to the evidence.

## 5. Freeze recommendation

**Freeze scope now.** From the date of this report until 14 August 2026:

1. Only **P0 fixes** and evidence-backed copy/label/empty-state corrections are merged.
2. No new routes, tables, entitlement surfaces or redesigns.
3. Every merged fix carries a regression test and a checklist row.
4. Run the pilot immediately; re-read the triage panel daily. If a P0 appears with fewer than
   72 hours to launch, the release is **No-Go** and the launch date moves — pausing invitations
   (Administration → Pilot programme) is the incident control.

## 6. Open risks

| Risk                                                                | Impact | Mitigation                                                                                                  |
| ------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------- |
| Pilot never runs before 14 August                                   | High   | Launch verdict stays _No-Go on evidence_; either run the cohort or accept launching unvalidated in writing. |
| Browser P0 suite cannot run in the sandbox (no Playwright binaries) | Medium | CI workflow `launch-readiness.yml` runs it; treat CI as the source of truth.                                |
| Thin AI/search evidence makes those rules untested in production    | Low    | Rules are unit-tested; thresholds are conservative and adjustable without schema change.                    |
