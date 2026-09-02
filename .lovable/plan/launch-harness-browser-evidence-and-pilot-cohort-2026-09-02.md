# Launch harness, browser evidence and pilot cohort

Four connected pieces: a real step-by-step P0/P1 harness, recorded browser-suite evidence, a working pilot cohort, and a scheduler that keeps the readiness ledger fresh.

## 1. Step-by-step launch checks harness

Rebuild `Administration → Launch checks` so it runs the 13 declared P0/P1 checks one at a time instead of returning a single batch result.

- Each check is its own row: title, severity badge, area, plain-language expectation, and a "Run" button.
- Running executes only that check and streams back status (pass / fail / skipped / error), what was actually observed, and duration.
- "Run all" walks the list sequentially with live progress, so a failure is visible the moment it happens rather than at the end.
- Re-run a single check after a fix without re-running the suite.
- Existing CSV and Markdown evidence export stays, plus "Save run to ledger" writes the completed pass to the launch-run record with actor and trigger.

## 2. Browser P0/P1 suite as a signed-in participant

- Execute the browser suite against the preview signed in as a real pilot participant, and record the outcome (pass/fail counts, failing spec names, timestamp) into the readiness ledger so the **browser** verification gate stops reading `unknown`.
- Add a "Re-run browser suite" admin action on the harness page that repeats that run on demand and re-records the verdict, with the last run's result and timestamp shown inline.
- Any specs that fail during the first real run get fixed or explicitly recorded as known-failing with a reason — the gate reflects reality, never an assumed pass.

## 3. Pilot participants (both routes)

**Seeded cohort now — unblocks the evidence gate today**

- 20 participants across the pilot sectors and countries, each clearly labelled as a non-production pilot seat so it can never be mistaken for a customer.
- Each one gets the full lifecycle: invite issued → invite claimed → onboarding intake completed → at least one checkpoint response recorded, with realistic timestamps spread over the enrolment window so the funnel analytics and audit timeline show a genuine curve.
- The pilot evidence gate then scores from live data, not from a hardcoded number.

**CSV import for your real list — replaces the seed later**

- An admin importer on the pilot page: upload or paste name, work email, organization, sector, country; it validates rows, flags duplicates against existing seats, and previews before committing.
- Committing issues real invites through the existing invite flow. Real participants then complete intake and checkpoints themselves, and the gate recalculates as they respond.
- A one-click action to retire the seeded cohort once enough real seats are active, so evidence never mixes the two.

## 4. Scheduled P0/P1 runs

- New scheduled endpoint that runs the full P0/P1 harness on a service identity and writes the result into the launch-run ledger and readiness gates, so readiness reflects the last automated pass rather than the last time someone clicked a button.
- Runs daily. Daily is the right cadence here: these checks guard access control and tenant isolation, so a once-a-day signal is enough to catch a regression well before launch without keeping the database busy on a tight loop. Worst case, a regression introduced right after a run is visible within 24 hours.
- The readiness page shows the last automated run time and its verdict, with the existing manual run still available for immediate re-verification.
- Failures are recorded as failures — a failed scheduled run lowers the gate rather than leaving the previous pass in place.

## 5. CRON_HOOK_SECRET

The scheduler authenticates with `CRON_HOOK_SECRET`, and the secret-update tool is blocked in your account permissions, so this one step is yours:

1. Open project secrets and set `CRON_HOOK_SECRET` to a strong random 64-character value.
2. Tell me once it's saved and I'll register the schedule and verify the endpoint accepts the call.

Until that's set, the scheduled endpoint is built and deployed but every unauthenticated call is rejected — which is the correct behaviour.

## Technical notes

- Harness: extend `src/lib/qa/harness.server.ts` to expose per-check execution (`runLaunchCheck(id)`) alongside the existing batch run; add a matching thin server fn in `src/lib/qa/qa.functions.ts` behind `requireSupabaseAuth` + platform-admin role check. Rewrite `src/routes/_app.administration.launch-checks.tsx` around per-row mutations.
- Browser gate: record into the same ledger the harness uses; surface through `src/lib/release/readiness.ts` `VERIFICATION_STEPS` so the `browser` step reads a real result.
- Pilot: seeding and CSV import go through server-side helpers in `src/lib/pilot/` using the existing invite, onboarding and checkpoint models — additive migration only if a `seeded`/`source` marker column is needed on the participant table, with GRANT → RLS → POLICY in the same migration.
- Scheduler: `src/routes/api/public/hooks/launch-checks.ts` guarded by `isAuthorizedCron`, registered as a daily `pg_cron` job against the stable project URL.
- Definition of done: lint, `tsgo`, build, the relevant specs, and `test:rls` for any new table.
