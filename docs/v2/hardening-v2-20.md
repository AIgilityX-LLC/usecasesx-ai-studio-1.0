# V2-20 — Security, privacy and accessibility hardening

**Date:** 2026-09-24  
**Scope:** Verified V2 surface (Phases 1–4 code already landed)  
**Status:** Hardening pass complete for P0/P1 in-repo; live multi-tenant e2e remains operator-run.

## Executive summary

| Area | Result |
|------|--------|
| Security headers (CSP, frame, nosniff, referrer, permissions) | **Fixed P0** — applied on all responses via `src/server.ts` |
| CORS | **Fixed P1** — allow-list helper; taxonomy + roadmap export wired |
| Webhook replay | **Fixed P1** — optional timestamp/id rejection; wired on cron hooks |
| Logging redaction | **Verified** — existing `redact` / `redactRecord` covered by unit tests |
| Upload abuse | **Verified** — storage policy rejects size/MIME/ext abuse |
| Prompt injection | **Verified** — sanitize/fence covered |
| Tenant isolation | **Existing** — `tests/rls-isolation.e2e.ts` + V2-04/05 RLS specs (operator credentials) |
| AI retrieval | **Verified by design** — `retrieveAuthorizedContext` uses caller RLS client only |
| Rate/cost abuse | **Existing** — fair-use + circuit breaker (V2-17); no change |
| Session | **Existing** — Supabase Auth + `requireSupabaseAuth`; no impersonation (V2-18) |
| Retention/deletion | **Partial** — soft-delete columns present; purge jobs deferred (P2) |
| Backups/restore | **Documented** — recovery drill surfaces remain; full restore rehearsal deferred (P2) |
| A11y | **Fixed P0** — repository search/sort labels; skip link; `:focus-visible`; reduced-motion already present; Arabic RTL from V2-18 |

## P0 / P1 fixed this pass

| ID | Severity | Finding | Fix |
|----|----------|---------|-----|
| H-SEC-01 | P0 | No global security headers on Worker responses | `withSecurityHeaders` in `src/server.ts` |
| H-A11Y-01 | P0 | Repository search/sort unlabeled (A11Y-C1) | `htmlFor` / `aria-label` on `/repository` |
| H-A11Y-02 | P1 | No skip link / weak focus-visible | Skip link in `__root.tsx` + CSS |
| H-SEC-02 | P1 | Public CORS always `*` | `publicCorsHeaders` + env `PUBLIC_API_CORS_ORIGINS` |
| H-SEC-03 | P1 | Cron hooks lacked optional replay protection | `assertOptionalWebhookReplay` on evidence-cleanup + launch-checks |

## Deferred P2 (owner / target date)

| ID | Item | Owner | Target |
|----|------|-------|--------|
| H-P2-01 | Full axe-core Playwright suite on core journeys | QA lead | 2026-10-15 |
| H-P2-02 | Signed-in h1 audit on dashboard / my-use-cases / portfolio (A11Y-C3) | Frontend | 2026-10-08 |
| H-P2-03 | Durable webhook idempotency table for all cron hooks (beyond email delivery) | Backend | 2026-10-22 |
| H-P2-04 | Soft-delete retention purge job + legal-hold flag | Platform | 2026-11-01 |
| H-P2-05 | Offline backup restore drill evidence pack for Go/No-Go | Ops | with V2-21 |
| H-P2-06 | HSTS only behind confirmed HTTPS edge config | Platform | 2026-10-15 |
| H-P2-07 | Expand CORS allow-list wiring to remaining `/api/public/usecasex/*` routes | Backend | 2026-10-08 |
| H-P2-08 | Keyboard-only recorded walkthrough of Studio → Gates → Export | QA | with V2-21 |

## Operator verification checklist

1. `bun run test:rls` (or project demo accounts) — two-tenant board/use-case isolation.  
2. Hit any page and confirm response headers include `X-Frame-Options: DENY` and CSP.  
3. Replay a cron hook with same `X-Webhook-Id` → expect `409`.  
4. Zoom 200% and toggle OS “reduce motion” on landing + `/repository`.  
5. Switch locale to Arabic and confirm `dir=rtl` on `<html>`.  
6. Upload `.exe` / oversized file to evidence bucket — denied.

## Tests

`tests/unit/hardening-v2-20.test.ts` — headers, redaction, sanitize, upload abuse, replay, RTL, content transitions.

## Code touchpoints

- `src/lib/security/hardening.ts`  
- `src/server.ts`  
- `src/lib/cron-auth.server.ts`  
- `src/routes/api/public/hooks/{evidence-cleanup,launch-checks}.ts`  
- `src/routes/api/public/usecasex/{taxonomy,roadmap/export}.ts`  
- `src/routes/_app.repository.tsx`, `src/routes/__root.tsx`, `src/styles.css`
