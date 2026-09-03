# Launch readiness recovery — phased plan

Today the public launch verdict is No-go. Four of six gates are cleared; the two blocking
gates are **Pilot cohort enrolled** (0 seats provisioned, target 15–25) and **Pilot evidence
recorded** (0 onboarding intakes, 0 checkpoint responses). Everything else — browser P0/P1,
launch checks, pipeline verification — is green.

Verified today: `pilot_invitations` = 0 rows, `pilot_onboarding_profiles` = 0,
`pilot_checkpoint_responses` = 0. Enrolment today is admin-invite only, which is why no seats
exist. The plan opens self-serve enrolment first, then keeps roster import available.

Approach: fix in phases, each phase ending with the readiness page re-measured so the
percentages move visibly.

---

## Phase 1 — Self-serve pilot enrolment (unblocks "Pilot cohort enrolled")

- New public page **/pilot/apply**: name, work email, organization, role, sector, country,
  and what they want from the pilot. Validation, error/empty/success states, mobile and
  keyboard accessible.
- Applications land as pilot seats with `source = self_serve` and a `requested` status —
  they do not silently become approved seats.
- Administration → Pilot gains an **Applications** queue: approve (issues the invite +
  claim link), decline (with reason), or merge into an existing seat by email.
- Approved seats flow through the existing claim → onboarding → activation path, so cohort
  counts start filling immediately.
- Entry points: footer, /launch join steps, /pricing Founding Access CTA.

## Phase 2 — Evidence capture (unblocks "Pilot evidence recorded")

- Make the participant portal drive evidence: after claim, the onboarding intake is a
  required first step, then checkpoint 1 is surfaced as the next mission with a visible
  progress state.
- Add nudges inside the product (portal banner + admin-triggered reminder) rather than
  relying only on email, since sender DNS is still pending.
- Admin evidence view shows, per seat: intake complete, checkpoints answered, blockers
  reported — so the gate detail line becomes explainable.

## Phase 3 — Publish and live smoke record

- Publish the candidate so the canonical host serves it (the /launch and /launch-calendar
  host gates already switch to live wording automatically).
- Re-run the production smoke record against the live host and store the run.
- Re-run the browser P0/P1 suite signed in as a real participant and import the report.

## Phase 4 — Email delivery

- Once `notify.aigilityx.com` DNS verifies, switch pilot invites, application
  acknowledgements and the Founding Access welcome to the real sender.
- Show per-recipient delivery status (sent / failed / suppressed) in the pilot admin view,
  reusing the existing lead delivery-status pattern.

## Phase 5 — Roster import and re-measure

- Import your roster rows when you supply them, deduplicated against self-serve applicants
  by work email, and invite them in one batch.
- Re-run launch checks, refresh the readiness ledger, and record the release-candidate
  decision with owners and timestamps.

---

## Technical notes

- New table `pilot_applications` (or a `requested` status plus `source = self_serve` on
  `pilot_invitations` — chosen at build time to stay additive). Any new table ships with
  `GRANT` → `ENABLE ROW LEVEL SECURITY` → policies in the same migration; no `anon` read
  grants, writes go through a validated public server function using the service role after
  input validation and simple abuse limits.
- Public submission via an unauthenticated `createServerFn`; approval, decline and merge via
  `.middleware([requireSupabaseAuth])` functions that re-check `has_role` server-side.
- No new readiness UI: the existing gate/score computation in `src/lib/release/readiness.ts`
  is untouched, so scores move purely from real data.
- Additive migrations only; rollback is disabling the apply route and leaving the rows in
  place.
- Each phase ends with typecheck, lint, build, route/nav integrity, RLS test for any new
  table, and a readiness refresh.

## Expected effect

Phases 1–2 clear both blocking gates, which the readiness model says recover up to 61.4 and
33.4 weighted points — enough to take Investor, Client, Deployment and Production out of
No-go once real seats and evidence exist. Phase 3 removes the "not live" caveat; Phases 4–5
harden delivery and complete the cohort.
