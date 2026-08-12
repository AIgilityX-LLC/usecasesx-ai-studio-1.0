# 11 — Deployment Runbook (Vercel · Railway · Supabase)

## Vercel — `apps/web`

**Project settings**
- Root directory `apps/web`; framework preset Next.js; install `pnpm install --frozen-lockfile`;
  build `pnpm turbo run build --filter=web...`; Node 22.
- Enable Turborepo remote cache and "ignored build step" so unrelated API commits don't rebuild web.
- Environment variables per environment (production / preview / development):
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_API_BASE_URL`,
  `NEXT_PUBLIC_SITE_URL`, `SENTRY_DSN`, `REVALIDATE_SECRET`.
  **No service-role key. No Stripe secret. No email key.**
- Preview deployments use the preview Supabase project and the Railway PR environment URL.

**Domains**
1. Add `usecasesx.aigilityx.com` and `www.usecasesx.aigilityx.com`.
2. Set the apex as primary; `www` and any `*.vercel.app` alias redirect to it (308).
3. Verify HTTPS, HSTS, and that `NEXT_PUBLIC_SITE_URL` matches the primary exactly — canonical tags,
   `og:url`, and sitemap entries are all built from it.

**ISR invalidation**: the API calls `POST {web}/api/revalidate` with a shared `REVALIDATE_SECRET`
when a use case is published, unpublished, or edited. The handler validates the secret, then
`revalidatePath` / `revalidateTag` for the affected paths.

## Railway — `apps/api`

**Service settings**
- Monorepo root; build `pnpm install --frozen-lockfile && pnpm turbo run build --filter=api...`;
  start `node apps/api/dist/index.js`.
- Health check path `/readyz`, timeout 10 s. Liveness `/healthz`.
- Minimum 2 replicas in production so a deploy never drops to zero. Autoscale on CPU/RPS.
- Region matched to the Supabase project region to keep DB latency low.
- Graceful shutdown: handle `SIGTERM`, stop accepting connections, drain in-flight requests.

**Variables**: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`SUPABASE_JWT_ISSUER`, `AI_GATEWAY_URL`, `AI_GATEWAY_KEY`, `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, `EMAIL_API_KEY`, `EMAIL_SENDER_DOMAIN`, `CRON_HOOK_SECRET`,
`ALERT_WEBHOOK_URL`, `SENTRY_DSN`, `ALLOWED_ORIGINS`, `LOG_LEVEL`.

**Custom domain**: `api.usecasesx.aigilityx.com`. Add it to the web app's
`NEXT_PUBLIC_API_BASE_URL` and to `ALLOWED_ORIGINS` on the API in the matching direction.

**Cron** (Railway scheduled jobs hitting `/v1/jobs/*` with `CRON_HOOK_SECRET`):

| Schedule | Job |
|---|---|
| every 15 min | alert threshold evaluation (RLS/storage/export denials, rate limits) |
| hourly | email retry sweep, export job reaper |
| daily 06:00 UTC | pilot reminders, evidence-gap watchdog, launch checks re-run |
| weekly Mon 05:00 UTC | usage rollups, analytics aggregation |

## Supabase

- Separate projects for production, staging, and preview. Never point preview at production.
- Auth settings: email confirmation on, anonymous sign-ups off, HIBP leaked-password protection on,
  auth email rate limit raised only after sending is active.
- Redirect allow-list: canonical host, `www`, staging, and the Vercel preview pattern. Auth callbacks
  are derived from the serving origin at call time — no hardcoded localhost or preview host.
- Storage buckets `avatars`, `benefit-evidence`, `canvas-documents` with policies mirroring the API's
  enforcement.
- Migrations applied by the tech lead: preview → staging → production, each verified with
  `pnpm test:rls`.

## Release process

1. Cut `release/x.y.z` from `main`. Bump the version in `packages/domain/src/release.ts`.
2. CI runs the full gate (see `10-testing-and-dod.md`).
3. Apply pending migrations to staging; run the P0 suite authenticated against staging.
4. Tag `vx.y.z`. Deploy API first (backward-compatible), then web.
5. Post-deploy verification, in order:
   - `GET api.usecasesx.aigilityx.com/readyz` → 200
   - `pnpm monitor:launch` against the canonical host
   - anonymous P0 path + one authenticated P0 path
   - sitemap, canonical tag, and `og:image` on 3 sampled public pages
   - a live sign-up email and a password-reset email to a real inbox
6. Watch Sentry and the alert webhook for 60 minutes.
7. Publish release notes; keep the previous Railway image and Vercel deployment as rollback targets.

## Rollback

| Failure | Action | Time |
|---|---|---|
| Web regression | Vercel → promote the previous production deployment | < 2 min |
| API regression | Railway → redeploy the previous image | < 5 min |
| Both | Repoint DNS to the frozen legacy deployment (kept warm 14 days) | < 15 min + TTL |
| Bad migration | Forward-fix with an additive migration. **Never** roll a schema back — additive-only is what makes web/API rollback safe | varies |
| Data incident | Platform support restore request; rebuild path = ordered migrations + launch-corpus script | hours |

Set DNS TTL to 300 s at least 48 hours before launch so a DNS rollback is fast.

## Incident severities

| Sev | Definition | Response | Comms |
|---|---|---|---|
| P0 | Core journey down, data exposure, auth broken, billing charging incorrectly | immediate, all hands | status page + email within 30 min |
| P1 | Major feature broken, exports failing, email not sending | < 2 h | status page |
| P2 | Degraded UX, single surface broken with a workaround | next business day | release notes |
| P3 | Cosmetic, docs, minor a11y | backlog | none |

Escalation goes to `ALERT_WEBHOOK_URL` then to the named owners in
`docs/operations/launch-runbook-2026-08-14.md` §1. **Those seven owner names are still unrecorded and
are a launch blocker** — fill them before go-live.

## Monitoring

- Sentry on both apps, releases tagged, source maps uploaded, alerting on new issues and error-rate
  spikes.
- Synthetic probe every 5 minutes against `PRODUCTION_URL`: home, discover, a public use-case page,
  `/readyz`. Alert on two consecutive failures.
- Business alerts: submission approvals stalled > 24 h, checkout success rate drop, email bounce rate
  > 2 %, AI failure rate > 10 %, rate-limit events spiking.
- Dashboards: Railway CPU/memory/latency, Vercel function duration and cache hit rate, Supabase
  connections and slow queries.
