# Roadmap

## In progress

- [x] Step-by-step P0/P1 harness page (`/administration/launch-checks`) with per-check run + results
- [x] Browser P0/P1 suite evidence gate (`checks.browser`) with Playwright report import + re-run action
- [x] Pilot roster CSV import marked `source: "import"`; labelled rehearsal seats (`source: "seed"`) excluded from evidence
- [x] Scheduled launch-check hook (`/api/public/hooks/launch-checks`) + daily pg_cron job
- [x] Consolidated `/administration/readiness` page: investor · demo · client · deployment · production readiness with go-live verdict

## Open

- [x] Readiness page: named, expiring pilot-evidence waiver panel (grant / retire, audit-logged) so the launch decision can read "conditional go" without faking evidence

- [ ] Enrol 15-25 real pilot participants (invite → onboarding intake → ≥1 checkpoint) so the pilot evidence gate scores — needs the real roster from the user
- [~] Browser suite: public P0/P1 chromium run done (39 passed / 1 failed — "Market Segment" facet button); report at /mnt/documents/browser-suite-report.json, import it on Launch checks. Signed-in persona run still blocked: demo personas are not seeded in this environment.
- [ ] Verify `notify.aigilityx.com` DNS so confirmation and auth emails dispatch
- [ ] Set a strong 64-char `CRON_HOOK_SECRET` so scheduled checks can trigger

## 2026-09-02

- [x] P0 launch-check run recorded (verdict pass, 10/13, 0 failures) with the real 180-use-case corpus loaded
- [x] Pilot portal made actionable: mission steps with per-step CTAs + inline checkpoint forms
- [ ] Still blocked: real pilot roster rows (Name, Email, Organization, Sector, Country) were not supplied — cannot invite real participants or clear the signed-in browser gate without them
- [x] Production smoke run + announcement decision recorded in docs/release/production-smoke-2026-09-02.md (verdict: STOP — candidate is not published)
