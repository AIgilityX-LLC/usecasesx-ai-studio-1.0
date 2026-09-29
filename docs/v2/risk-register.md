# UseCasesX™ V2 — Risk Register & Decision Log

**Prompt:** V2-02 (refreshed)  
**Date:** 2026-09-22  
**SRS:** [`srs-prd-v2.md`](./srs-prd-v2.md)  

---

## 1. Risks

| ID | Severity | Risk | Mitigation | Owner | Status |
|----|----------|------|------------|-------|--------|
| R-SEC-01 | **P0** | Cross-tenant isolation not re-proven on target DB `mclidfbrstkoivzjqitf` | Seed 2 tenants; run `bun run test:rls` + UI/API denial | QA / Backend | **Open** — V2-21: `test:rls` failed (`Invalid login credentials`); forces **No-Go** |
| R-SEC-02 | P0 | Self-approval on submission / milestone review | `assertNotSelfReview` + pilot `decideMilestone` SoD; `tests/unit/submission-self-review.test.ts` (5 pass) | Backend | **Mitigated** |
| R-DOC-01 | P0 | SRS/PRD V2.0 missing | Saved verbatim as `docs/v2/srs-prd-v2.md` | Product | **Closed** |
| R-ENV-01 | P1 | Lovable Cloud vs external Supabase split-brain | Single SoR; `DB_SERVICE_ROLE_KEY`; align preview vs local | Eng | Open |
| R-DATA-01 | P1 | Value Contract UI without DB tables | W5 migration in V2-13 (MLR) | Backend | Open |
| R-DATA-02 | P1 | Thin `supabase/migrations/` (2) vs recovered (108) + full-schema dump | New work = additive migrations only; full-schema = bootstrap | Backend | Open |
| R-CANVAS-01 | P1 | Workshop canvas = 7 sections ≠ FR-03 13-section Studio Canvas | V2-07 | Product / FE | Open |
| R-INT-01 | P1 | CyberX intake “Coming Soon” stub | V2-11 package fallback + queue (never fake sync) | Integrations | **Mitigated** (V2-11) |
| R-MOCK-01 | P2 | `usecasex.mock.ts` still present | Retire after W5 dual-read | Backend | Open |
| R-PROD-01 | P1 | Signup UI paused (`SIGNUPS_ENABLED=false`) | Intentional ops gate; one-line re-enable | Product | Accepted |
| R-A11Y-01 | P2 | WCAG 2.2 AA not re-verified | V2-20 | QA | Open |
| R-AI-01 | P2 | No formal AI eval dataset / thresholds | V2-17 | AI | Open |
| R-REC-01 | P1 | Recovery tag not yet created on git | Create `v2-baseline-2026-09-22` + DB snapshot | Eng | Open |
| R-DATA-03 | P1 | V2-04 migration committed but not yet applied / validated on live DB | Apply SQL; run validation queries + `tests/v2-04-versioned-core-rls.e2e.ts` | Backend | Open |
| R-LIFE-01 | P2 | Domain statuses remain dual-written until V2-04/V2-10 | Canonical map in `src/lib/lifecycle`; see `lifecycle-status-map.md` | Backend | **Accepted** (V2-03) |

---

## 2. Decision log

| Date | Decision | Prompt | Notes |
|------|----------|--------|-------|
| 2026-09-22 | Phase 0 auditor pass; no feature build without gates | Pack | — |
| 2026-09-22 | Reconcile knowledge without SRS; DOC-01 open | V2-00 | Superseded by SRS attach |
| 2026-09-22 | Refresh current-state audit | V2-01 | SEC-01 open; SEC-02 then mitigated in code |
| 2026-09-22 | Attach SRS/PRD V2.0 verbatim → `docs/v2/srs-prd-v2.md` | Ops | Closes R-DOC-01 |
| 2026-09-22 | Enforce SoD on submission + pilot review paths | Security fix | Closes R-SEC-02 as Mitigated |
| 2026-09-22 | **MLR** = P0 security + Canvas V2 + Evidence + Scoring V2 + Gates + Value Contract | V2-02 | Enterprise/SSO/private deferred |
| 2026-09-22 | Align Releases A–D to SRS §12; pull Value Contract into MLR | V2-02 | See release-plan |
| 2026-09-22 | Recovery pin: tag `v2-baseline-2026-09-22` on agreed commit (base SHA `673ab58` + include desired uncommitted fixes); snapshot DB | V2-02 | R-REC-01 until tagged |
| 2026-09-22 | Additive-only migrations; no destructive MLR plan | V2-02 | data-migration-plan |
| 2026-09-22 | Canonical lifecycle + scoped permissions + Enterprise bundles (no gate UI) | V2-03 | `src/lib/lifecycle`, `scoped-permissions`; unmapped statuses reported |
| 2026-09-23 | Smallest additive versioned core: adapt UC versions; add opportunity_versions + canvas sections; defer evidence/decisions/value | V2-04 | See data-dictionary + erd-core-model |
| 2026-09-23 | Reusable evidence_items + signed URLs + activity view; audit metadata redacted | V2-05 | See evidence-foundation.md |

---

## 3. Approved planning scope

| In scope for next build waves | Deferred |
|-------------------------------|----------|
| Release A (V2-03…05) + MLR Studio/value slices | Full Enterprise SSO/SCIM, air-gap claims, third-party connectors |
| Value Contract (V2-13) as MLR | Portfolio scenarios / workshop deep (unless capacity) |
| P0 RLS proof (R-SEC-01) | Invented seed ROI / fake metrics |

**Blocker to implement V2-03:** create recovery tag + DB snapshot (R-REC-01). R-SEC-01 may proceed in parallel as first A task but must close before Release A exit.

---

## 4. Universal completion — V2-02

- **Changed files:** `docs/v2/release-plan.md`, `data-migration-plan.md`, `architecture-decisions.md`, `risk-register.md`, `prompt-pack-execution-log.md`  
- **Schema/migrations/RLS:** none applied  
- **Tests:** none required for this prompt (planning only)  
- **Evidence:** SRS on disk; V2-01 audit; SoD unit tests already green for R-SEC-02  
- **Unresolved risks:** R-SEC-01, R-ENV-01, R-REC-01, MLR product gaps  
- **Rollback:** revert these docs; no data change  
- **Next:** Tag recovery point → **V2-03**
