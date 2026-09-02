# Production smoke and announcement decision — 2026-09-02

**Decision: STOP the announcement.** No feature changes were made during this run.

## 1. Is the approved candidate live?

| Check | Result |
| --- | --- |
| Published deployment URL | **none** — the project has never been published |
| Preview URL | `https://id-preview--cf64325d-2268-4dc2-8a06-bdfad5cb3a90.lovable.app` (Lovable login required) |
| Canonical host `usecasesx.aigilityx.com` | not serving the candidate |

This is an **automatic No-Go**: acceptance criterion "approved candidate is live"
cannot be met, so smoke testing below was executed against the preview build and
the shared Lovable Cloud backend (one instance serves preview and production).

## 2. Smoke evidence (2026-09-02, 21:1x–21:2x UTC)

Data-layer journey, `tests/production-smoke.e2e.ts`, signed in as the dedicated
launch-check service account (no real user data touched):

```
✓ signed in as production demo user
✓ created and saved a Studio use case
✓ opened My Use Cases and found the saved metadata
✓ opened board detail and verified the Studio deep-link target
✅ Production smoke passed.
```

Public route probe, `scripts/monitoring/probe-production.mjs`:

```
200   252ms  /
200  1438ms  /repository
200   128ms  /discover
200   142ms  /auth
200     3ms  /robots.txt
OK — error rate 0%, p95 1438ms
```

Content and ledger reads:

- `use_cases` published: **180**; `taxonomy_sectors` published: **18**
- Latest scheduled launch-check run `b6c9955e` — 13 checks, 10 passed, 0 failed,
  3 skipped, **0 P0 failures**
- Previous run `b8650160` identical; the earlier P0 failure (`c40a6e81`) is cleared

## 3. Test-data cleanup

The smoke harness removes its own rows. Verified after the run:
`ai_use_cases` and `use_case_boards` matching `Launch Smoke%` → **0 rows**.
No destructive SQL, no schema change, no RLS change was executed.

## 4. Open No-Go items

1. **Not published.** Nothing is live to announce.
2. **`notify.aigilityx.com` DNS unverified** — confirmation and auth emails do
   not dispatch, so signup verification cannot be smoke-tested end to end.
3. **Signed-in browser suite** still unrun against a real participant cohort;
   the pilot roster has not been supplied.
4. `lead_captures` is empty — advisory/waitlist routing is unproven with real
   traffic.

## 5. Monitoring handoff

- Scheduled `launch-checks-daily` pg_cron job (03:15 UTC) writes to
  `pilot_launch_check_runs`; readiness pages read that ledger.
- `.github/workflows/monitoring.yml` runs the route probe; it needs the
  `PRODUCTION_URL` repository variable once the site is published.
- Owners on duty are **not recorded** — assign before any future Go.

## 6. Rollback / forward-fix

Nothing was deployed, so no rollback is required. Forward fix order:
verify DNS → publish the candidate → re-run this smoke record against the live
host → record owners and announcement approval.
