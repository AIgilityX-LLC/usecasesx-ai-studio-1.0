# Roadmap

## In progress

- [x] Step-by-step P0/P1 harness page (`/administration/launch-checks`) with per-check run + results
- [x] Browser P0/P1 suite evidence gate (`checks.browser`) with Playwright report import + re-run action
- [x] Pilot roster CSV import marked `source: "import"`; labelled rehearsal seats (`source: "seed"`) excluded from evidence
- [x] Scheduled launch-check hook (`/api/public/hooks/launch-checks`) + daily pg_cron job
- [x] Consolidated `/administration/readiness` page: investor · demo · client · deployment · production readiness with go-live verdict

## Open

- [ ] Enrol 15-25 real pilot participants (invite → onboarding intake → ≥1 checkpoint) so the pilot evidence gate scores — needs the real roster from the user
- [~] Browser suite: public P0/P1 chromium run done (39 passed / 1 failed — "Market Segment" facet button); report at /mnt/documents/browser-suite-report.json, import it on Launch checks. Signed-in persona run still blocked: demo personas are not seeded in this environment.
- [ ] Verify `notify.aigilityx.com` DNS so confirmation and auth emails dispatch
- [ ] Set a strong 64-char `CRON_HOOK_SECRET` so scheduled checks can trigger
