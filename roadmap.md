# Roadmap

## In progress

- [x] Step-by-step P0/P1 harness page (`/administration/launch-checks`) with per-check run + results
- [x] Browser P0/P1 suite evidence gate (`checks.browser`) with Playwright report import + re-run action
- [x] Pilot roster CSV import marked `source: "import"`; labelled rehearsal seats (`source: "seed"`) excluded from evidence
- [ ] Scheduled launch-check hook (`/api/public/hooks/launch-checks`) + daily pg_cron job
- [ ] Consolidated `/administration/readiness` page: investor · demo · client · deployment · production readiness with go-live verdict

## Open

- [ ] Enrol 15-25 real pilot participants (invite → onboarding intake → ≥1 checkpoint) so the pilot evidence gate scores — needs the real roster from the user
- [ ] Run the browser P0/P1 suite signed in as a participant and import the report
- [ ] Verify `notify.aigilityx.com` DNS so confirmation and auth emails dispatch
- [ ] Set a strong 64-char `CRON_HOOK_SECRET` so scheduled checks can trigger
