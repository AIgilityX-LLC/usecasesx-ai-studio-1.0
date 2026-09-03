# Reaching 85% weighted readiness

## Where we stand (measured today)

| Audience | Now | Blocked by |
| --- | --- | --- |
| Investor | 75% | Pilot cohort, pilot evidence |
| Demo | 100% | — |
| Client | 67% | Pilot cohort, pilot evidence |
| Deployment | 93% | Pilot evidence |
| Production | 71% | Pilot cohort, pilot evidence |

Weighted average across the five audiences is ~81%. Verified in the database:

- Launch checks: latest run 10 passed / 0 failed / 3 skipped / 0 P0 failures.
- Browser suite: 2 recorded runs, gate cleared.
- Pilot invitations: 1 active seat (target 15–25).
- Checkpoint responses: 0. Onboarding intakes: 0. Applications: 1. Waivers: 0.

Everything except the two pilot gates is already passing. The entire gap to 85% sits
in `pilot.seats` and `pilot.evidence`.

## What actually moves the number

The scoring engine gives a failing gate 0 credit, a waived/attention gate 0.6, and a
passing gate 1.0. That produces three realistic routes:

**Route A — real cohort (best, unlocks 100%)**
Enrol 15–25 participants, get each through onboarding intake, and collect at least one
checkpoint response. Both gates flip to pass and every audience reaches 100%.

**Route B — approved evidence waiver (fastest, ~92%)**
Record an approved RC waiver for the two pilot gates. They move from fail to attention
(0.6 credit), lifting Investor to ~91%, Client to ~89%, Production to ~89%,
Deployment to ~96% — comfortably past 85% while the real cohort is still recruiting.

**Route C — partial cohort (~85–90%)**
15 seats invited plus at least one onboarding intake clears `pilot.seats` outright and
puts `pilot.evidence` at attention. Reaches the target without the full checkpoint set.

Recommended: run B now to unblock the launch decision, and work A in parallel so the
waiver is retired with real evidence rather than left standing.

## Plan

### Phase 1 — Clear the gate today (Route B)
1. Add an admin action on `/administration/readiness` to record an approved RC waiver
   into `pilot_rc_waivers` with a required written reason, approver identity, and an
   expiry date, written as an audit event.
2. Show the waiver plainly on the readiness page: which gates it covers, who approved
   it, when it expires, and a one-click revoke.
3. Make the launch verdict state "conditional go — waiver in force" rather than a plain
   go, so nothing overstates the evidence.

### Phase 2 — Make the cohort reachable (Route A/C)
4. Roster import: accept pasted or CSV rows (Name, Work email, Organization, Sector,
   Country), create invitations marked `source: "import"`, and show a per-row result.
   This is the step that is blocked purely on the real roster rows.
5. Queue invite emails so they dispatch automatically once `notify.aigilityx.com` DNS
   verifies; until then invites are created with a copyable claim link so seats can be
   filled manually.
6. Prompt onboarding intake and the first checkpoint directly on `/pilot/portal` so
   evidence lands as soon as a participant acts.

### Phase 3 — Retire the waiver
7. When seats reach 15 and at least one checkpoint response exists, the readiness page
   flags the waiver as no longer needed and offers to revoke it, returning the board to
   fully evidence-backed 100%.

## Technical notes

- Waiver storage uses the existing `pilot_rc_waivers` table; if approver/expiry columns
  are missing the migration is additive only, with grants, RLS, and policies in the same
  migration.
- Gate scoring already supports `waiverActive`; no change to `AUDIENCE_WEIGHTS` or
  `STATUS_SCORE` — the target is met by evidence, not by reweighting.
- Roster import goes through an authenticated server function with platform-admin role
  checks and per-row validation; no client-side privilege decisions.
- Both surfaces need explicit loading, empty, error, and non-admin states.

## What I need from you

- The real roster rows (Name, Work email, Organization, Sector, Country) for Phase 2.
- Confirmation that you are the approver for the Phase 1 waiver, and the reason text you
  want recorded against it.
