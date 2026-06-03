# UseCasesX™ — Pre-Beta Release Checklist (`v1.0.0-beta.1`)

Use this as the single source of truth when cutting the pre-beta release.
Tick every box before announcing tester access.

---

## 1 · Pre-flight (T-1 day)

- [ ] Confirm `main` builds clean (no TypeScript errors, no Vite warnings).
- [ ] Run `bunx vitest run` — all suites green.
- [ ] Review `docs/PRE_BETA_TEST_PLAN.md` results from the latest QA pass.
- [ ] Confirm both required patches are live:
  - [ ] **MINOR-1** — admin RLS extended to all 7 admin-tier roles
        (migration `*_admin_tier_rls_patch.sql`).
  - [ ] **CONTENT-1** — taxonomy seeded (`industries`, `business_functions`,
        `ai_capabilities`, `platform_modules` non-empty).
- [ ] Open Lovable Cloud (Connectors → Lovable Cloud) and verify the
      managed backend status is **ACTIVE_HEALTHY**.
      If it shows `COMING_UP`, `RESTARTING`, `UPGRADING`, `RESIZING`,
      `RESTORING`, or `ACTIVE_UNHEALTHY`, wait until healthy before
      shipping.
- [ ] Run the Supabase linter — confirm no new **ERROR**-level findings
      (existing WARNs for SECURITY DEFINER public RPC are accepted).

## 2 · Tag the release

- [ ] Bump version in `package.json` to `1.0.0-beta.1`.
- [ ] Create release notes file: `docs/releases/v1.0.0-beta.1.md`.
  - Highlights of v1.0 (Free/Lite, Pro, Admin, SARPI / CyberX C3G stubs).
  - Known limitations (MINOR-1 fixed; STUB-1: SARPI/CyberX intake pages
    are friendly stubs by design).
  - Demo accounts (link to `docs/DEMO_TESTING.md`).
- [ ] Commit on `main` (handled by Lovable autosave).
- [ ] In GitHub, create tag **`v1.0.0-beta.1`** pointing at the
      release-notes commit. Mark it as a **pre-release**.

## 3 · Publish from Lovable

- [ ] Click **Publish** in the top-right.
- [ ] In Publish Settings, set **visibility = public** so testers with
      the link can reach the published URL.
- [ ] Verify the stable URLs respond `200 OK`:
  - Production: `https://project--8c200374-44e0-46bb-98cf-28acedbdad9c.lovable.app`
  - Preview:    `https://project--8c200374-44e0-46bb-98cf-28acedbdad9c-dev.lovable.app`
- [ ] (Optional) Wire a custom domain if it has been provisioned.

## 4 · Post-publish smoke (T+15 min)

- [ ] Anonymous visit to landing — hero, industry section, explore link work.
- [ ] `/ai-hub/usecasex/explore` shows seeded industries and AI capabilities
      in the filter rail.
- [ ] Open any published use case → Lite PDF lead capture → submit → row
      lands in `lead_captures`.
- [ ] Sign in as `pro@aigilityx.com` (`Demo@786`) → dashboard loads.
- [ ] Sign in as `admin@aigilityx.com` → `/ai-hub/usecasex/admin` loads,
      Leads + CTA Analytics tabs return data.
- [ ] SARPI CTA on a Pro detail page → routes to `/sarpi?source=usecasex…`
      and shows the friendly stub.
- [ ] CyberX C3G CTA → routes to `/cyberx/c3g/intake?source=usecasex…`
      and shows the friendly stub.
- [ ] Check `cta_events` and `integration_events` each gained a new row.
- [ ] DevTools console clean — no red errors on landing / explore / detail.

## 5 · Enable tester access

- [ ] Share the **published** URL (not the preview URL) with testers.
- [ ] Distribute demo credentials from `docs/DEMO_TESTING.md` — all five
      accounts use password `Demo@786`.
- [ ] Provide the tester intake form:
  - Where to file bugs (GitHub Issues label `pre-beta`).
  - Severity guide (Blocker / Major / Minor / Cosmetic).
  - Expected response SLA (e.g., 2 business days for Blocker).
- [ ] Pin `docs/PRE_BETA_TEST_PLAN.md` in the tester comms channel so
      they know which flows are in-scope.

## 6 · Daily during pre-beta

- [ ] Re-run Lovable Cloud `cloud_status` once per day; expect
      `ACTIVE_HEALTHY`.
- [ ] Triage new issues into `Blocker / Major / Minor / Cosmetic`.
- [ ] Block GA promotion until: 0 Blockers, ≤ 2 Majors, taxonomy
      reviewed by content owner, SARPI + CyberX C3G modules out of stub.

---

## Roll-back

If a Blocker surfaces in the first 24 hours:

1. In Lovable, **Restore** to the last known-good version before
   `v1.0.0-beta.1` and re-publish.
2. Mark the GitHub release as **draft**.
3. Notify testers in the comms channel — keep the message factual.
4. Open a `pre-beta-rollback` issue with the diagnosis and the fix plan.
