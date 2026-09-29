# UseCasesX™ V2 — Release Plan

**Prompt:** V2-02 (refreshed)  
**Date:** 2026-09-22  
**Authoritative SRS:** [`docs/v2/srs-prd-v2.md`](./srs-prd-v2.md) §12 Release strategy  
**Inputs:** V2-00 knowledge · V2-01 current-state audit · SRS V2.0  
**Rule:** No product feature implementation in this document.

---

## 1. Stable recovery point

| Item | Value |
|------|--------|
| **Documented pin** | `v2-baseline-2026-09-22` (create this git tag before V2-03) |
| **Last pushed `main` SHA** | `673ab58` — *Fix board status inserts and Lovable service-role secret fallback* |
| **Target database** | Supabase project `mclidfbrstkoivzjqitf` |
| **Required before V2-03** | (1) `git tag v2-baseline-2026-09-22` on agreed commit · (2) dashboard backup/snapshot of target DB · (3) note both in risk-register decision log |
| **Working tree note** | As of this refresh, uncommitted local work may include SoD self-review fix, signup UI gate, and `docs/v2/*`. Include desired fixes in the tagged commit before starting Phase 1. |

**Rollback model:** revert application to tagged commit; leave additive schema in place; feature-flag off incomplete surfaces. Prefer forward-fix over destructive rollback.

---

## 2. Minimum Lovable Release (MLR)

Ship **only**:

| MLR slice | SRS / prompt | Notes from V2-01 |
|-----------|--------------|------------------|
| **P0 security** | NFR Security · R-SEC-01/02 | SoD self-review **mitigated in code** (unit tests pass). Dual-tenant RLS live proof still **open**. Backend env clarity (R-ENV-01). |
| **Canvas V2** | FR-03 · V2-07 | Expand beyond 7-section workshop public-value canvas |
| **Evidence** | FR-05 · V2-05 | Reusable evidence service (not workshop-only) |
| **Scoring V2** | FR-06 · V2-09 | Versioned, evidence-backed; no automatic compliance labels |
| **Decision gates** | FR-08 · V2-10 | Intake → … → Retirement; human decide only; SoD |
| **Value Contract** | FR-11 · V2-13 | Real tables — retire mocks |

**Explicitly later (not MLR)** unless already verified working:

- Enterprise-only custom gates/taxonomies/SSO/SCIM (FR-18 / V2-18)  
- Private / air-gapped deployment claims  
- Full APIs/webhooks (V2-16), AI eval harness GA (V2-17), content seed overhaul (V2-19)  
- Portfolio scenarios engine, advanced workshop V2 (Release C)  
- Agentic designer (FR-04 / V2-08) — **Release B in SRS**; optional for MLR if capacity allows after Canvas+Gates  

MLR maps to **Release A + a subset of Release B + Value Contract pulled forward from Release C** (see §3).

---

## 3. Releases A–D (aligned to SRS §12)

### Release A — Stabilize and rebaseline

| | |
|--|--|
| **Scope** | Close P0 isolation/security; lifecycle + permissions foundation (V2-03); versioned core model (V2-04); evidence + append-only audit foundation (V2-05) |
| **Depends on** | V2-01/02 accepted · SRS on disk · recovery tag + DB snapshot |
| **Owners** | Backend / data · Security / QA · Product (acceptance) |
| **Evidence** | RLS dual-tenant denial · SoD tests · migration rehearsal notes · permission matrix tests |
| **Exit gate** | Phase 1: tenancy, permission, version, and evidence tests pass; no open P0 without dated accept |

### Release B — Decision-ready Studio

| | |
|--|--|
| **Scope** | Opportunity intake V2 (V2-06) · Canvas V2 (V2-07) · Agentic spec (V2-08, if in MLR+) · Scoring V2 (V2-09) · Gates (V2-10) · Gov preview / CyberX handoff contract (V2-11) |
| **Depends on** | Release A exit |
| **Owners** | Frontend Studio · Backend · AI platform (suggestions only) |
| **Evidence** | Opportunity → canvas → score → human gate with immutable version + evidence; forbidden/self-approval tests |
| **Exit gate** | SRS: user can reach a human gate decision with evidence and history |

### Release C — Portfolio-to-value

| | |
|--|--|
| **Scope** | Dependencies / scenarios / Opportunity Map (V2-12) · **Value Contract + benefits** (V2-13 — **also MLR**) · Roadmap brief (V2-14) · Workshop Mode V2 (V2-15) |
| **Depends on** | Release B (Value Contract may start after V2-04/05 if flagged) |
| **Owners** | Portfolio / value · Facilitator UX |
| **Evidence** | Non-mutating scenarios · currency-safe benefit rollups · exports with version stamps |
| **Exit gate** | Priority linked to dependency, roadmap, and measurable value |

### Release D — Enterprise and ecosystem

| | |
|--|--|
| **Scope** | Import/API/webhooks (V2-16) · AI gateway eval (V2-17) · SSO/i18n/sovereignty (V2-18) · Content governance (V2-19) · Hardening (V2-20) · Pilot + Go/No-Go (V2-21) |
| **Depends on** | Release B minimum; C preferred for Go |
| **Owners** | Platform · Security · Product |
| **Evidence** | Contract tests · WCAG · tenant matrix · `docs/v2/go-no-go.md` |
| **Exit gate** | Explicit **Go / Conditional Go / No-Go**; any P0 tenant leak or core-journey break ⇒ No-Go |

---

## 4. Prompt → release map

| Prompt | Release | In MLR? |
|--------|---------|---------|
| V2-03, V2-04, V2-05 | A | Yes (foundation) |
| V2-06, V2-07, V2-09, V2-10 | B | Yes |
| V2-08, V2-11 | B | Optional for first MLR cut |
| V2-13 | C (pulled into MLR) | **Yes** |
| V2-12, V2-14, V2-15 | C | No |
| V2-16…V2-19 | D | No |
| V2-20, V2-21 | D | Hardening required before production claim |

---

## 5. Owners (roles)

| Area | Owner role |
|------|------------|
| FR acceptance / MLR scope | Product |
| Schema / RLS / migrations | Backend / data |
| Studio Canvas / gates UI | Frontend |
| AI gateway / suggestions | AI platform |
| Security / a11y / RLS proof | Security + QA |
| Go/No-Go | Product + Security + Eng lead |

---

## 6. Evidence contract (every implementation prompt)

Universal completion contract: changed files · schema/migrations/RLS · tests (incl. negative tenant isolation where data changes) · visual/functional evidence · unresolved risks · rollback/forward-fix · next prompt ID.

---

## 7. Gate check (V2-02)

| Criterion | Met? |
|-----------|------|
| Approved scope has rollback | Yes (§1) |
| Dependencies explicit | Yes (§3–4) |
| No destructive migration in plan | Yes — additive only (see data-migration-plan) |
| MLR defined | Yes (§2) |
| Enterprise / private deployment deferred | Yes (§2) |

**Next implementation prompt after tag + snapshot:** **V2-03**.
