# Runbook — Suspected security incident

**Symptoms:** Anomalous admin actions, tenant cross-talk reports, webhook abuse, credential exposure, XSS/SSRF alerts.  
**SLO:** `security_event_logging` 100%; audit trail immutable.

## Immediate (contain)

1. Preserve evidence — do **not** delete `audit_events` or truncate logs.
2. Capture `correlationId` / `request_id` windows and actor ids.
3. If keys may be leaked: rotate publishable / service / cron / AI keys in the secret store; redeploy.
4. Disable compromised users/sessions via Auth admin; revoke platform grants if needed (`revokePlatformGrantFn`).

## Classify

| Severity | Examples |
| -------- | -------- |
| Critical | Confirmed tenant breakout, service_role in browser, ransomware-like deletes |
| High | Privilege escalation, forged actor audit rows blocked but attempted at scale |
| Medium | Brute-force auth, webhook signature failures spike |
| Low | Single suspicious export; no persistence |

## Investigate

- Query audit via `queryAuditEventsFn` / export (tenant admin or platform auditor).
- Review structured `security` logs (`logSecurityEvent`).
- Re-run `bun run test:rls` against the environment when safe.
- Check storage buckets and public API signature verification.

## Eradicate / recover

- Patch the defect; do not leave temporary RLS holes.
- Follow `backup-restore.md` only if integrity is compromised.
- Notify affected Enterprise customers per contractual incident process.

## Close-out

- Timeline, indicators of compromise, keys rotated, PR/hotfix links.
- Update threat model / security test cases if a new class of attack appeared.
