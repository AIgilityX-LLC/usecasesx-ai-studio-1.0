# Navigation regression report ? enterprise navigation v2

**Date:** 2026-10-12
**Scope:** UseCasesX enterprise navigation refactor (flag enterprise_navigation_v2 / VITE_ENTERPRISE_NAVIGATION_V2_ENABLED)
**Environment:** local Vite http://127.0.0.1:8080, Chromium Playwright, Cursor IDE browser
**Flag for this pass:** ON in .env.local for live preview; unit flag test asserts default OFF when env unset

Companion docs: docs/releases/enterprise-navigation-v2-rollout.md, docs/analytics/navigation-events.md.

---

## Executive verdict

| Gate | Result |
| ---- | ------ |
| Unit tests (bun test tests/unit) | **PASS** ? 719 / 719 |
| Nav integrity | **PASS** ? 51 targets + 27 redirects |
| Lint (nav-touched sources + regression spec) | **PASS** |
| Production build (NODE_OPTIONS=--max-old-space-size=8192 npm run build) | **PASS** ? nitro + client assets |
| Playwright tests/navigation-regression.spec.ts | **PASS** ? 43 passed, 4 skipped |
| Typecheck (tsgo) | **N/A locally** ? tsgo not installed; tsc --noEmit shows pre-existing workshop/workspace typing debt unrelated to nav |
| RLS (bun run test:rls) | **BLOCKED** ? Invalid login credentials (demo tenants not seeded) |

**Nav chrome verdict:** Anonymous SiteShell product routes are green across required viewports. Platform-admin isolation holds for direct URL attempts. Signed-in enterprise chrome validated via unit suites; full signed-in Playwright needs auth fixtures.

---

## Viewport matrix

| Viewport | Width | Shell | Overflow (product) | Mobile control |
| -------- | ----- | ----- | ------------------ | -------------- |
| desktop-1440 | 1440 | PASS | <=8px | Primary nav |
| desktop-1280 | 1280 | PASS | <=8px | Primary nav |
| desktop-1024 | 1024 | PASS | <=8px | Menu below lg |
| tablet-768 | 768 | PASS | <=8px | Open navigation menu |
| mobile-390 | 390 | PASS | <=8px | Menu visible; drawer open confirmed in IDE browser |
| mobile-375 | 375 | PASS | <=8px | same |

Routes: /repository, /patterns, /pricing, plus lighter / marketing-shell check.

---

## Validation checklist (20 items)

| # | Item | Status | Evidence |
| - | ---- | ------ | -------- |
| 1 | Sidebar expanded | PASS* | Unit + sidebar storage; signed-in prior browser |
| 2 | Sidebar collapsed | PASS* | Icon rail / storage keys |
| 3 | Mobile navigation | PASS | Playwright trigger + IDE browser sheet |
| 4 | Active routes | PASS | Explore current on /repository |
| 5 | Nested routes | PASS | /insights refresh |
| 6 | Browser back/forward | PASS | Playwright |
| 7 | Direct URL navigation | PASS | Public + protected probes |
| 8 | Refresh on nested route | PASS | Playwright |
| 9 | Workspace switching | PASS* | workspace-selection unit |
| 10 | Role visibility | PASS* | nav-capabilities / platform-admin-separation units |
| 11 | Plan entitlements | PASS* | entitlements-contract + flags |
| 12 | Platform-admin isolation | PASS | No platform admin chrome anonymously |
| 13 | Unauthorized routes | PASS | reviews/reports/admin-observability/administration |
| 14 | Search / command palette | PASS* | command-palette unit |
| 15 | Keyboard navigation | PASS | Tab + skip link |
| 16 | Screen-reader labels | PASS | Primary / Mobile / Skip |
| 17 | Long navigation labels | PASS* | Truncation; no product overflow |
| 18 | Empty states | PASS* | Repository main retained |
| 19 | Loading states | PASS* | networkidle + main |
| 20 | Error states | PASS* | nav.render_error boundary |

*Signed-in items rely on units when auth fixtures are unavailable.

---

## Security tests

- Direct /platform-admin* without session: no Platform administration nav; Sign in / redirect.
- Legacy /administration*: guarded; redirects in nav integrity.
- Tenant/anon cannot gain platform admin by URL alone: PASS (UI).
- RLS DB re-proof: BLOCKED (Invalid login credentials) ? seed demo tenants then re-run test:rls.

---

## Automated command results

```
nav-integrity: PASS (51 targets + 27 redirects)
unit: 719 pass / 0 fail
eslint (nav scope): 0 errors
production build: PASS
playwright navigation-regression: 43 passed, 4 skipped
test:rls: FAIL ? Invalid login credentials
```

Fix during pass: tests/unit/report-access.test.ts moved to bun:test mock.module.

---

## Known limitations

1. Playwright headless could not open Radix Sheet to assert nav[aria-label=Mobile]; trigger asserted; sheet open verified in IDE browser.
2. tsgo not available in this agent; use CI typecheck.
3. Signed-in Playwright needs demo auth fixtures.
4. Marketing / overflow soft-capped at 120px; product shells <=8px.

## Rollback

Set VITE_ENTERPRISE_NAVIGATION_V2_ENABLED=false (or omit) and redeploy. See docs/releases/enterprise-navigation-v2-rollout.md.
