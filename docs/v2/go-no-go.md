# UseCasesX™ V2 — Go / No-Go Decision Pack

**Prompt:** V2-21 + independent post-implementation verification  
**Date:** 2026-09-24  
**Reviewer posture:** Independent product / architecture / security / QA (code inspection + automated evidence + live schema probe). **No application code was modified for this pass.**  
**Authoritative SRS:** [`srs-prd-v2.md`](./srs-prd-v2.md)  
**Target DB:** Supabase `mclidfbrstkoivzjqitf`  
**Lovable project (published):** `b817e2a7-8bc3-41b9-ab70-265fb6c2c4ea` (Cloud DB **disabled** — app uses external Supabase; R-ENV-01 remains)

---

## 1. Executive readiness verdict

**No-Go for production / customer-facing MLR release.**

Foundations for Phases 1–4 are substantially present in code and on the target schema, and **147/147** selected V2 unit tests pass. That is **not** sufficient under the V2-21 rule: *do not declare Go from code inspection alone*. Live dual-tenant RLS failed, MLR gaps remain (Canvas V2, Value Contract V2), no role-based pilot was executed, and recovery tagging is missing.

| Dimension | Status |
|-----------|--------|
| Code completeness vs prompt pack (ex. V2-07/13/16) | Strong for landed prompts |
| Schema present on target DB | Confirmed (probe 2026-09-24) |
| Live tenant isolation proof | **Failed** — demo sign-in invalid |
| Human pilot (6 roles) | **Not executed** |
| MLR (Canvas V2 + Value Contract + P0 security) | **Incomplete** |
| Marketing / air-gap / SCIM claims | Correctly **not** asserted in docs |

---

## 2. Explicit decision

# **No-Go**

**Forced by:**

1. **P0 security / tenant isolation unproven** on target DB (`bun run test:rls` → `Invalid login credentials`). Risk **R-SEC-01** remains **Open**.
2. **Broken / incomplete core MLR journey pieces:** V2-07 Canvas V2 **NOT RUN**; V2-13 Value Contract **NOT RUN** (acceptance scenario 6 unmet at SRS FR-11 fidelity).
3. **No production-like pilot evidence** (Executive Sponsor, CAIO, Business Owner, Facilitator, Technical Reviewer, Risk Reviewer) — task success / time / confusion / defects / decision quality not recorded.
4. **Recovery tag `v2-baseline-2026-09-22` absent** (R-REC-01) — rollback pin incomplete.

**Conditional Go is not issued.** A Conditional Go would require at minimum: green dual-tenant RLS on seeded accounts, V2-07 + V2-13 landed or formally de-scoped from MLR in writing, and a completed six-role pilot with defect triage. None of those gates are met.

---

## 3. SRS §14 acceptance scenarios

| # | Scenario | Result | Evidence |
|---|----------|--------|----------|
| 1 | Pro: discover → customize → cited canvas → score → export brief | **Partial** | Repository + customize + scoring V2 + implementation brief exist. **FR-03 13-section Canvas V2 UI not shipped** (V2-07 NOT RUN). Wizard remains 9-step; section catalogue only in `canvas-sections.ts`. |
| 2 | Facilitator workshop → owned use cases + provenance | **Code-ready / unpiloted** | V2-15 unit tests pass; SQL applied (`workshop_cluster_proposals` exists). No live multi-user pilot. |
| 3 | Reviewer request changes → approve pilot with conditions; immutable actor/rationale/version | **Code-ready / unpiloted** | Gates model + `decision_gate_*` tables present (n=0 rows). SoD unit tests pass. No live review run. |
| 4 | Agentic blocked until limits/checkpoints/kill switch | **Unit-proven** | `solution-design-v2` tests + `assertPilotAuthorizationReady`. No runtime pilot. |
| 5 | Portfolio scenarios without mutating baseline | **Unit-proven** | `portfolio-deps-scenarios-v2` tests; tables exist (n=0). |
| 6 | Value owner baseline/target/actual; forecast vs realized | **Fail (MLR)** | Legacy `use_case_benefits` UI exists; **V2-13 Value Contract / ledger / forecast-vs-realized dashboard not run**. |
| 7 | Cross-tenant denial (UI/URL/API/search/export/storage/AI) | **Fail (P0)** | RLS e2e **failed** (credentials). Unit cross-tenant asserts pass only. |
| 8 | CyberX handoff consented, versioned, honest delivery | **Code-ready** | V2-11 package fallback; `/cyberx/c3g/intake` still “Coming Soon” stub (honest). Endpoint often unset → package path. |
| 9 | AI unavailable → core workflows manual | **Design-met / unpiloted** | Circuit breaker + manual fallback flags; Apply-required AI drafts. Not exercised with provider down. |
| 10 | Arabic RTL primary journeys | **Partial** | Locale provider + AR report strings + unit RTL checks. No recorded browser RTL walkthrough. |

**Score:** 0 fully closed with runtime evidence · several unit/code partials · **2 hard fails** (#6, #7) · pilot gaps across the rest.

---

## 4. Requirements traceability (Must / FR coverage)

Legend: **T** traced in code · **S** schema/policy · **U** unit test · **R** runtime/live evidence · **—** missing

| FR | Title | T | S | U | R | Notes / false-positive risk |
|----|-------|---|---|---|---|------------------------------|
| FR-01 | Repository / patterns | Y | Y | Y | Partial | V2-19 patterns n=30; search a11y labels added. Semantic search not fully proven live. |
| FR-02 | Opportunity intake | Y | Y | Y | — | Quick/guided + PII gate; smoke not recorded this pass. |
| FR-03 | Canvas V2 (13 sections) | Catalogue only | Sections table | Catalogue unit | — | **False-positive if claimed complete:** V2-07 NOT RUN. |
| FR-04 | Agentic / AI System Designer | Y | Y | Y | — | |
| FR-05 | Evidence | Y | Y | Y | Schema empty | Tables ok; no live attach evidence. |
| FR-06 | Scoring V2 | Y | Y | Y | — | |
| FR-07 | Governance preview | Y | Y | Y | — | Informational; not legal advice (correct). |
| FR-08 | Decision gates | Y | Y | Y | Schema empty | |
| FR-09 | Portfolio / scenarios | Y | Y | Y | — | |
| FR-10 | Roadmap / brief | Y | Y | Y | — | |
| FR-11 | Value Contract | Partial legacy | `use_case_benefits` | Model only | Partial | **V2-13 NOT RUN** — do not claim FR-11 complete. |
| FR-12 | Workshop V2 | Y | Y | Y | — | |
| FR-13 | Collaboration | Partial pre-V2 | — | — | — | Not a V2 prompt focus; not re-verified. |
| FR-14 | AI copilot | Y | Feedback table | Y | — | Eval dataset offline only; no scored harness run. |
| FR-15 | Integrations / handoffs | Partial | — | Handoff unit | — | V2-16 APIs/webhooks NOT RUN. CyberX stub honest. |
| FR-16–18 | Admin / i18n / enterprise | Partial | SSO/support tables | Y | — | SSO capability flag off by default; SCIM deferred; no air-gap claim. |

**Traceability coverage (Must FR-01…FR-12 + FR-14 for MLR path):** ~70% code/schema · ~55% automated unit · **&lt;15% observed runtime**.

---

## 5. Journey regression matrix (seeded tenants / roles)

| Journey | Automated | Live / pilot | Isolate/cleanup |
|---------|-----------|--------------|-----------------|
| Onboarding / auth | — | Signup UI gated (`SIGNUPS_ENABLED=false`) | N/A |
| Repository search | Unit search + a11y labels | Not browser-recorded | — |
| Customize / drafts | Existing draft specs (not re-run) | — | — |
| Scoring | Unit V2 green | — | — |
| Review / gates | Unit SoD + gates green | RLS/demo fail blocks tenant setup | — |
| Portfolio / map | Unit scenarios green | — | — |
| Value | Legacy benefits UI | FR-11 gap | — |
| Workshop | Unit V2 green | Multi-user not run | — |
| Exports | Unit envelope / XLSX/PDF helpers | — | — |
| Admin / content | Content governance unit | Patterns n=30 on DB | Seed retained (not test junk) |
| Recovery | `recovery-drill` unit exists | **No git tag; no restore drill pack** | — |

**Test tenants:** Demo accounts used by `test:rls` **do not authenticate** on target (`Invalid login credentials`). Seeded test tenants were **not** created/removed this pass — isolation prerequisite failed first.

---

## 6. Pilot protocol status

| Role | Planned tasks | Recorded? |
|------|---------------|-----------|
| Executive Sponsor | Prioritize / approve investment narrative | **No** |
| CAIO | Portfolio + governability view | **No** |
| Business Owner | Intake → canvas → score | **No** |
| Facilitator | Workshop convert + provenance | **No** |
| Technical Reviewer | Solution design / agentic readiness | **No** |
| Risk Reviewer | Gates + governance preview + SoD | **No** |

Pilot sheet fields required by V2-21 (task success, time, confusion, defects, decision quality) are **blank**. Vanity NPS was not collected (correct).

---

## 7. Security / tenant matrix

| Path | Expected | Evidence this pass |
|------|----------|--------------------|
| UI / direct URL | Deny cross-tenant | Not re-proven live |
| API / server fn | RLS + auth middleware | Design OK; live dual-tenant fail |
| Search / export | Tenant-scoped | Not re-proven |
| Storage paths | `workspace/…` prefixes | Unit path helpers; denial e2e not run |
| AI retrieval | Caller RLS client only | Design + unit boundary |
| SoD self-approve | Denied | **5 unit tests pass** |
| Headers CSP / frame | Present | Unit hardening; live header smoke not recorded |
| Webhook replay | Optional 409 | Unit; live cron smoke not recorded |
| Upload abuse | MIME/size reject | Unit storage-policy |

**P0 finding GNG-SEC-01:** Cannot prove isolation on `mclidfbrstkoivzjqitf` until demo (or dedicated) accounts exist and `test:rls` / `test:tenancy` / `test:cross-workspace` pass.

---

## 8. AI evaluation and fallback

| Item | Status |
|------|--------|
| Gateway / prompts / schemas | Present (V2-17) |
| Apply / Dismiss / Feedback | Present; `ai_suggestion_feedback` table empty |
| Circuit breaker / manual fallback | Unit-covered |
| Eval dataset `2026-09-24.1` | Offline fixtures only — **no scored run against a live model** |
| Training policy | Documented non-training without agreement |

Silent AI mutation: opportunity AI drafts require explicit Apply — **no false claim of auto-write** found in intake path review.

---

## 9. Accessibility / performance

| Item | Status |
|------|--------|
| Skip link + `:focus-visible` | Landed (V2-20) |
| Repository search/sort labels | Landed |
| Full WCAG 2.2 AA / axe suite | **Deferred P2** (H-P2-01) |
| Keyboard walkthrough Studio→Gates→Export | **Not recorded** (H-P2-08) |
| Arabic RTL | Code ready; browser proof missing |
| Performance budget | Not measured this pass |

---

## 10. Migration / recovery evidence

| Check | Result |
|-------|--------|
| V2 tables on target | **Present** — `evidence_items`, gates, solution designs, scenarios, briefs, SSO/support, canvas sections, governance previews, workshop clusters, AI feedback |
| Pattern seed | **30** `use_case_patterns` rows |
| Opportunity versions | n=3 (backfill activity) |
| Benefits legacy | n=3 `use_case_benefits` |
| Lovable Cloud DB for published project | **Disabled** — confirms env split (R-ENV-01) |
| Git recovery tag | **Missing** |
| Backup / restore drill pack | **Missing** (H-P2-05) |

Forward-fix preferred: leave additive schema; feature-flag incomplete surfaces; fix RLS accounts before any Go revisit.

---

## 11. P0 / P1 / P2 findings

### P0

| ID | Finding | Repro | Impact |
|----|---------|-------|--------|
| GNG-SEC-01 | Dual-tenant RLS not proven; demo login fails | `npx bun@1.2.19 run test:rls` → `Invalid login credentials` | Blocks security exit; forces No-Go |
| GNG-MLR-01 | Canvas V2 (V2-07) not implemented | Prompt log NOT RUN; Studio wizard still 9-step; no 13-section gate-completeness UI | Broken MLR core journey vs FR-03 / scenario 1 |
| GNG-MLR-02 | Value Contract V2 (V2-13) not implemented | Prompt log NOT RUN; no FR-11 ledger/forecast-vs-realized | Broken MLR / scenario 6 |

### P1

| ID | Finding | Repro |
|----|---------|-------|
| GNG-REC-01 | No `v2-baseline-*` git tag / restore pack | `git tag -l "v2-*"` empty |
| GNG-ENV-01 | Lovable project Cloud DB disabled vs external Supabase SoR | `get_database_status` → enabled false; app `.env` → `mclidfbrstkoivzjqitf` |
| GNG-PILOT-01 | Six-role pilot not run | No pilot sheet |
| GNG-API-01 | V2-16 import/API/webhooks NOT RUN | Execution log |
| GNG-STUB-01 | AdvisorX route + CyberX intake still Coming Soon | Routes present; acceptable if not marketed as live sync |
| GNG-MOCK-01 | `usecasex.mock.ts` still in tree | Grep; R-MOCK-01 |

### P2

| ID | Finding |
|----|---------|
| GNG-A11Y-01 | Full axe / keyboard evidence deferred |
| GNG-AI-01 | Live AI eval harness not scored |
| GNG-CORS-01 | CORS allow-list not expanded to all public routes (H-P2-07) |
| GNG-RTL-01 | Arabic RTL browser proof missing |

---

## 12. False-positive completion claims (independent review)

| Claim risk | Reality |
|------------|---------|
| “Phase 2 Studio complete” | Canvas V2 missing; journey uses wizard/legacy sections |
| “Phase 3 value complete” | Benefits UI ≠ FR-11 Value Contract |
| “Security hardened / ready” | Headers/code yes; **tenant proof no** |
| “SSO/enterprise ready” | Config surfaces + docs; live IdP + `CAPABILITY_SSO` not proven |
| “Air-gapped / SCIM” | Explicitly **not** claimed in V2-18 docs — good |
| “CyberX synchronized” | Package fallback only when endpoint missing — good; intake stub still Coming Soon |
| Prompt pack “DONE” rows | Mean **code+migration landed**, not Go-ready |

**Dead UI:** ModuleStub on impact-assessment; AdvisorX / CyberX intake Coming Soon.  
**Mocked integration:** ERP verification flagged Enterprise/off.  
**Stale docs:** Release plan still lists recovery tag as pre-V2-03 requirement — still open after V2-20.

---

## 13. Incident / support readiness

| Item | Ready? |
|------|--------|
| Support access grants (no impersonation) | Code + schema; unpiloted |
| Break-glass docs | Partial (enterprise docs) |
| On-call / severity for tenant leak | Not evidenced |
| Signup paused | Yes (`SIGNUPS_ENABLED=false`) — reduces uncontrolled onboarding risk |
| Audit append-only | Design present; not drill-tested |

---

## 14. Exact remediation order (before any Go revisit)

1. **Seed two isolated demo tenants + roles** on `mclidfbrstkoivzjqitf`; fix credentials; run `test:rls`, `test:tenancy`, `test:cross-workspace`, V2-04/05 RLS specs. Close **R-SEC-01**.
2. **Create recovery tag + DB snapshot**; document restore command. Close **R-REC-01**.
3. **Implement V2-07 Canvas V2** (13 sections, gate-based completeness, evidence links) — MLR.
4. **Implement V2-13 Value Contract + benefits ledger** (forecast vs realized) — MLR.
5. Operator smoke: security headers, webhook replay 409, Arabic `dir=rtl`, AI-down manual path.
6. **Six-role pilot** with timed tasks and defect log; triage P0/P1.
7. Re-run this pack → issue Conditional Go only if P0 clear and MLR scenarios 1, 3, 4, 6, 7 pass with evidence links.
8. Optional follow-ons: V2-16 APIs; live SSO; retire mocks; axe suite.

---

## 15. Rollback / forward-fix

| Action | Guidance |
|--------|----------|
| App rollback | Revert to last known-good commit once tagged; additive SQL remains |
| Feature hide | Flag off incomplete Studio / enterprise surfaces |
| Destructive schema rollback | **Not approved** |
| Test data | After successful RLS seed, delete or isolate marked `RLS-*` / pilot rows |

---

## 16. Evidence index

| Artifact | Path / command |
|----------|----------------|
| Unit suite (V2 slice) | 147 pass / 0 fail — 2026-09-24 |
| RLS attempt | `test:rls` → Invalid login credentials |
| Schema probe | Service-role head counts on V2 tables (see §10) |
| Prompt log | [`prompt-pack-execution-log.md`](./prompt-pack-execution-log.md) |
| Hardening | [`hardening-v2-20.md`](./hardening-v2-20.md) |
| Risks | [`risk-register.md`](./risk-register.md) |
| This decision | `docs/v2/go-no-go.md` |

---

## 17. Independent verification checklist (return set)

1. **Executive readiness:** Not ready for customer MLR Go.  
2. **Requirements traceability:** ~70% code · low runtime — see §4.  
3. **Findings:** §11 (P0×3 forcing No-Go).  
4. **Tenant/security matrix:** §7.  
5. **AI eval/fallback:** §8.  
6. **A11y/performance:** §9.  
7. **Migration/recovery:** §10.  
8. **Remediation order:** §14.  
9. **Decision:** **No-Go**.

---

*Signed as independent verification for V2-21. Re-open only after remediation order items 1–6 produce linked evidence.*
