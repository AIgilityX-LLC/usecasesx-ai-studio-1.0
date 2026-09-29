# UseCasesX™ V2 — Current-State Audit (V2-01)

**Prompt:** V2-01 — Non-destructive current-state audit  
**Auditor date:** 2026-09-22  
**Prior draft:** `docs/v2/current-state-audit.md` (2026-09-07) — refreshed and superseded by this revision  
**Mode:** Read-only. No functional or schema changes.  
**SRS/PRD V2.0 file:** **NOT FOUND in repo** — FR IDs below follow the 2026-09-07 audit matrix + V2 prompt pack scope; absolute FR wording cannot be verified until the SRS is attached.

---

## 1. Method

| Source | Used |
|--------|------|
| Route tree under `src/routes/` | Yes — file inventory |
| `src/integrations/supabase/types.ts` | Spot checks (`value_contracts` / `benefits_ledger` / agentic tables = absent) |
| `src/lib/ai/gateway.server.ts`, `docs/architecture/ai-boundary.md` | Yes |
| `src/lib/feature-flags.ts`, `src/hooks/useEntitlement*` / `RequirePlan` | Yes |
| `src/lib/submissions.functions.ts` `reviewSubmission` | Code review |
| `src/routes/auth.tsx` `SIGNUPS_ENABLED` | Yes |
| `supabase/migrations/` | Count = **2** files (vs large `docs/migration/_recovered_migrations/` + `full-schema.sql`) |
| Live browser journeys / dual-tenant RLS e2e | **Not executed this session** (no second-tenant credentials provisioned) |
| Lovable project knowledge | Empty response |

---

## 2. Implemented and verified (code-backed)

| Capability | Evidence |
|------------|----------|
| Global repository browse / detail | `_app.repository.tsx`, `_app.use-cases.$slug.tsx`, `use_cases` |
| Opportunity capture | `_app.opportunities.*`, `opportunities` table / functions |
| Studio / boards / customize | `_app.ai-use-case-studio.tsx`, `_app.boards.*`, `_app.studio.use-case.$id.*` |
| Scoring (5-pillar style) | `scoring.functions.ts`, `use_case_scores` / scorecard surfaces |
| Portfolio / roadmap | `_app.portfoliox.tsx`, `_app.studio.portfolio.tsx`, `_app.roadmap.tsx` |
| Workshops | `_app.workshops.*` |
| Demo scenarios copy-to-workspace | `_app.demo-scenarios.tsx`, `demo-scenarios.write.ts` (status fix shipped) |
| AI gateway (provider-neutral) | `src/lib/ai/gateway.server.ts`, `service.server.ts` |
| Entitlements / flags | `useEntitlement`, `RequirePlan`, `feature-flags.ts`, `authz/*` |
| Admin / ops surfaces | `_app.administration.*`, production-data, launch-checks |
| Suite handoff UI shells | SARPI, AdvisorX, C3G routes under studio + top-level |
| Security baseline docs | `docs/security/security-baseline.md` |
| Auth sign-in | `/auth` with signup UI gated (`SIGNUPS_ENABLED = false`) |

---

## 3. Partial / mocked / broken / duplicate / dead

| Item | Classification | Evidence |
|------|----------------|----------|
| Value Contract / benefits ledger | **Mocked / Partial** | UI routes exist; **no** `value_contracts` / `benefits_ledger` in generated types |
| Agentic / AI System Designer fields | **Missing** | No autonomy/kill-switch schema in types |
| Decision gates + SoD | **Partial** | `reviewSubmission` updates status without `submission.user_id !== reviewer` check (`src/lib/submissions.functions.ts` ~151–193) |
| Portfolio “scenarios” (non-mutating baseline) | **Missing / misnamed** | Demo scenarios ≠ portfolio weight scenarios |
| CyberX / governance handoff | **Partial** | UI + intake routes; authoritative sync not verified live |
| Canvas “13-section V2” | **Partial** | Public-value canvas is **7** sections in `CANVAS_SECTIONS` (`src/lib/workshops.public-value.ts`: mandate…sovereignty) — not a 13-section Studio Canvas V2 |
| CyberX C3G intake | **Stub** | `_app.cyberx.c3g.intake.tsx` head title: “Coming Soon” |
| `_app.pro.tsx` / `_app.enterprise.tsx` | Marketing shells | Not edition codebases — OK if not claiming live Enterprise |
| Migration history vs live DB | **Risk** | **2** files in `supabase/migrations/` vs **108** under `docs/migration/_recovered_migrations/` + `full-schema.sql` |
| Feature flags (Enterprise) | **Off by default** | `stageGates`, `sso`, `integrations`, `multiEntity`, `fullAudit` false in `authz/flags` / `feature-flags.ts` |
| Mock leakage | **Residual** | `src/lib/usecasex.mock.ts` still present (historic Jul audit risk) |
| Cross-tenant RLS live denial | **Not executed** | Prior audit same; still P0 |
| Signup | **UI disabled** | Flag only; logic intact |

---

## 4. Real data model and tenant ownership

- Pattern: `organization_id` + `workspace_id` on tenant tables; RLS via `user_in_workspace` / `has_role`.
- Global catalog: `use_cases`; workspace designs: `ai_use_cases` + boards.
- Known schema gaps for V2 MLR: value contracts, benefits ledger, agentic specs, immutable business-version model (V2-04), normalized evidence service (V2-05).
- Cutover note: app env points at project `mclidfbrstkoivzjqitf`; Lovable Cloud may still inject reserved `SUPABASE_*` for its managed DB — dual-backend risk.

---

## 5. Security / RLS findings

| ID | Severity | Finding |
|----|----------|---------|
| SEC-01 | **P0** | Dual-tenant RLS denial not re-proven against current target DB |
| SEC-02 | **P0/P1** | No self-approval / SoD check in `reviewSubmission` before approve |
| SEC-03 | **P1** | Service role: committed `.env` has publishable only; local `.env.local` / Lovable `DB_SERVICE_ROLE_KEY` required — misconfig breaks Pilot Mission |
| SEC-04 | **P1** | Historical migrations not in `supabase/migrations/` — drift risk between docs and live |
| SEC-05 | **P2** | `client.server.ts` edited for `DB_SERVICE_ROLE_KEY` fallback (generated-file discipline conflict with AGENTS.md) |

---

## 6. Accessibility / performance

- Not re-verified this cycle (WCAG 2.2 AA, keyboard, RTL).
- Prior July 2026 a11y notes in `docs/audit/2026-07-25/ux/` are **stale until re-run** (V2-20).
- Landing/auth CSS animations respect `prefers-reduced-motion` in recent UI work — spot-check only.

---

## 7. V2 requirement traceability (pack + prior FR matrix)

| Requirement (pack / FR) | Status | Notes |
|-------------------------|--------|-------|
| FR-01 Repository | Existing | |
| FR-02 Opportunity intake | Existing / enhance in V2-06 | |
| FR-03 Canvas V2 | Partial | 7-section workshop public-value canvas ≠ 13-section Studio Canvas; V2-07 |
| FR-04 Agentic designer | Missing | V2-08 |
| FR-05 Evidence service | Partial | Canvas evidence exists; reusable Evidence service = V2-05 |
| FR-06 Scoring V2 | Partial / Existing base | Versioned evidence-backed = V2-09 |
| FR-07 Gov preview / CyberX | Partial | V2-11 |
| FR-08 Decision gates | Partial | V2-10; SoD gap |
| FR-09 Portfolio scenarios | Partial | V2-12 |
| FR-10 Roadmap | Existing | V2-14 enhances |
| FR-11 Value Contract | Mocked | V2-13 |
| FR-12 Workshop V2 | Existing base | V2-15 |
| FR-13 Collaboration | Existing | |
| FR-14 AI Copilot gateway | Existing base | Eval harness = V2-17 |
| FR-15 Integrations API | Partial | V2-16 |
| FR-16 Administration | Existing | |
| FR-17 Reporting/exports | Existing base | |
| FR-18 Localization / RTL | Missing | V2-18 |
| NFR Security/RLS | Existing posture; live denial unverified | V2-20 |
| NFR A11y | Unknown this cycle | V2-20 |
| Lifecycle centralization | Missing as V2 model | V2-03 |
| Versioned core model | Missing | V2-04 |

---

## 8. Conflicts (pack vs code vs Aug plan)

1. **14 Aug 2026** still framed as launch in many product/ops docs; V2 says historical.
2. **Phase 0–5 Aug pack** vs **V2 pack**: V2 supersedes dates/scope; Aug docs remain evidence only.
3. **Mocks** (`value` surfaces) vs “no fake production data” rule.
4. **Demo “scenarios”** naming collision with portfolio scenarios.
5. **SRS body missing** — cannot close absolute Must-requirement wording.

---

## 9. P0 / P1 / P2 backlog (recommended order)

### P0
1. Provision two test tenants; run `bun run test:rls` / cross-tenant denial on target DB.
2. Enforce self-approval block in `reviewSubmission` (and any gate path).
3. Attach authoritative SRS/PRD V2.0 to `docs/v2/` or Lovable knowledge.
4. Stabilize single backend story (Lovable Cloud vs `mclidfbrstkoivzjqitf`) for hosted preview.

### P1 (MLR foundations — Phase 1 then Studio)
5. V2-03 lifecycle + permissions  
6. V2-04 additive versioned model  
7. V2-05 Evidence  
8. V2-07 Canvas V2, V2-09 Scoring V2, V2-10 Gates, V2-13 Value Contract  
9. V2-20/21 hardening + Go/No-Go  

### P2
10. V2-12 scenarios, V2-15 workshops deep, V2-16 API, V2-17 eval, V2-18 SSO/i18n/sovereignty, V2-19 content governance  

**Recommended implementation order:** V2-02 → V2-03 → V2-04 → V2-05 → (V2-06…V2-11 + V2-13) → V2-20 → V2-21.

---

## 10. Route inventory (signed-in shell — representative)

Core journey: `discover`, `repository`, `opportunities*`, `ai-use-case-studio`, `studio.use-case.$id.*` (blueprint, feasibility, deliverables, value, sarpi, advisorx, c3g), `boards*`, `portfoliox`, `roadmap`, `feasibility`, `decision`, `opportunity-map`, `workshops*`, `governance`, `handoffs`, `demo-scenarios`, `pilot*`, `administration*`, `account*`.

Public/marketing: `index`, `auth`, `pricing`, `editions`, `enterprise`, `pro`, `how-it-works`, `contact`, legal pages.

*(Full file list: 100+ `_app*.tsx` routes under `src/routes/`.)*

---

## Gate check (V2-01)

| Criterion | Met? |
|-----------|------|
| No unknown P0 tenant/security issue ignored | Documented SEC-01/02; not cleared |
| Next prompts map to verified objects | Yes (section 9) |
| No functional/schema changes | Yes |

**Unresolved for gate “no unknown P0”:** SEC-01 and SEC-02 remain open — must be closed before Studio V2 implementation, or carried explicitly into V2-02 risk register as accepted-with-mitigation.

---

## Universal completion contract — V2-01

- **Changed files:** this audit (`docs/v2/current-state-audit.md` refreshed); execution log.
- **Schema/RLS:** none.
- **Tests run:** none live this session; prior RLS e2e noted as blocked.
- **Evidence:** code citations above; migration count=2; types lack value_contracts.
- **Risks:** missing SRS; SoD; dual env; unverified RLS.
- **Rollback:** revert doc only.
- **Next:** **V2-02**.
