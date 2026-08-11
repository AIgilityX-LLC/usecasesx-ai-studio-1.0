# Production configuration and capacity — 14 August 2026 launch

Scope: Lite + Pro Founding Access, release candidate `v1.0.0-rc.1`, marker `release/2026-08-14`.
Live version of this record: **Administration → Production Readiness** (platform admins only), which
reads the running deployment and exports Markdown/CSV evidence. Secrets appear by name and presence
only; no value is read into the report, the UI, or any log line.

## 1. Domain, HTTPS and environment separation

| Item | State |
| --- | --- |
| Canonical origin | `https://usecasesx.aigilityx.com` — every canonical tag, `og:url` and sitemap entry is built from it |
| HTTPS | Enforced by the hosting platform; certificates are provisioned automatically |
| Redirects | Non-primary hosts (including `www` and the `.lovable.app` subdomain) must be added to the project and the canonical host set as primary so all others redirect to it |
| Environment separation | Preview and published builds resolve the same backend project reference; the readiness probe fails if the server-side and browser-side backend URLs diverge |
| Dev callbacks | No localhost or preview host is hardcoded; auth callbacks are derived from the serving origin at call time |

**Action before announcement:** connect `usecasesx.aigilityx.com` (and `www`) to the published
project, mark the apex as primary, and re-run the readiness report from that host so the "served
from the canonical host" probe passes.

## 2. Secrets

Required server-side names: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`LOVABLE_API_KEY`, `CRON_HOOK_SECRET`.
Publishable browser names: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.
Optional overrides (defaults apply when absent): `EMAIL_SENDER_DOMAIN`,
`AI_FAIR_USE_PER_USER_PER_DAY`, `AI_FAIR_USE_PER_WORKSPACE_PER_DAY`.

Privileged names are read only inside server handlers. The readiness probe converts each to a
boolean at the point of read, so a value cannot reach the client or an artifact.

## 3. Auth, sender identity and email capacity

Flows verified as origin-derived: sign-up verification, password reset, email change confirmation,
workspace/pilot invitation, founding-access upgrade confirmation.

| Item | State | Mitigation |
| --- | --- | --- |
| Sender identity | No project sender domain provisioned; auth email uses the platform default sender | Provision a sender subdomain (e.g. `notify.aigilityx.com`) and verify DNS before public announcement |
| Throughput | Bounded by the platform hourly auth-email allowance | Invite in batches of 25 or fewer per hour; raise the hourly allowance once sending is active |
| Deliverability | **Not measured** — needs a live send from the published canonical host | Run one sign-up, one reset and one invitation to a real inbox and attach results to the release record |

## 4. Database, migrations, storage and recovery

- Managed Postgres on the smallest instance tier; current utilisation is a small fraction of the
  tier, leaving ample headroom for a 15–25 seat cohort plus Founding Access sign-ups.
- 15 migrations, timestamp-ordered and additive. Demo and sample data live in seed scripts, never in
  a migration. `verify:release` fails the build on unordered or destructive SQL.
- Row-level security is enabled on every tenant table, with grants issued in the same migration.
- Upload limits (size, MIME, extension) and signed-URL TTLs are enforced in application code on
  every upload path for `avatars`, `benefit-evidence` and `canvas-documents`; bucket-level ceilings
  are not settable on this managed backend.
- Backups and point-in-time recovery are operated by the managed platform. The product team cannot
  trigger a restore; recovery is a platform support request. Rebuild path is the ordered migration
  set plus the launch-corpus reference-data script.

## 5. AI quotas, timeouts and outage fallback

- Fair use: Pro 60 requests/user/day and a workspace/day ceiling, burst 8/user/minute; Lite 5/user/day,
  burst 3/user/minute. Enforcement is server-side and produces rate-limit audit events.
- Every AI task is time-boxed (30–60s depending on task) with at most one retry, on transient
  failures only.
- Outage fallback: all AI surfaces are assistive. On rate-limit, timeout or provider failure the
  surface degrades to manual entry and the core journey (Discover → … → Export) continues.
- Single upstream gateway; no second provider is wired in. Accepted for launch because AI is
  assistive, and retained in the known-issues scope.

## 6. Error logging, alerting and incident ownership

- Submission, approval, export, storage and AI paths write correlated audit events; pilot and
  submission audit trails are append-only.
- Threshold alerts for cross-workspace attempts, storage denials, export denials and rate-limit
  enforcement surface on **Export & AI Activity**.
- Support contact: `support@usecasesx.ai`. Incident owner (P0), product support, data recovery and
  security/abuse owners are listed on the Production Readiness page and in every exported report.

## 7. Summary of open items

1. Canonical host not yet serving the published app (blocks the host probe and deliverability test).
2. Sender domain not provisioned (auth email uses the default sender).
3. Email deliverability evidence not captured.
4. Backups/restore not self-serve; recovery depends on platform support.
5. Single AI provider.

None of these require a code change. Items 1–3 are configuration steps; 4–5 are documented
limitations with mitigations above.
