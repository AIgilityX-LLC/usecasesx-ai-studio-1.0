# Runbook — Application down

**Symptoms:** Uptime check fails on `/api/public/health` or users see blank/error pages.  
**SLO:** `platform_availability` (99.9%).

## Immediate (0–5 min)

1. Open `/api/public/health` and `/api/public/ready` — note `status`, `correlationId`, failing checks.
2. Check latest deploy / Cloudflare Worker status and Lovable publish status.
3. Confirm DNS and TLS for the production host.
4. Search structured logs for `level":"error"` with the same `correlationId` window.

## Triage

| Health body | Likely cause | Action |
| ----------- | ------------ | ------ |
| `env_supabase_url` fail | Missing Worker secrets | Restore `SUPABASE_URL` / publishable key; redeploy |
| Process ok, ready 503 | DB dependency | Follow `database-failure.md` |
| 5xx HTML only | SSR crash | Inspect Worker logs; roll back last deploy (`failed-deployment.md`) |

## Mitigation

- Prefer **rollback** of the last known-good deploy over hot-fixing in production.
- Do not disable RLS or broaden grants to “restore” traffic.
- Keep customers informed with a status note; avoid inventing root cause.

## Close-out

- Record timeline, correlation ids, and error budget burn.
- File follow-up for regression test if a deploy caused the outage.
