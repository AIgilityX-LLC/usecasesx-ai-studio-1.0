# UseCasesX™ V2 — Architecture Decisions

**Prompt:** V2-02 (refreshed)  
**Date:** 2026-09-22  
**SRS:** [`srs-prd-v2.md`](./srs-prd-v2.md) §§1, 5–8, 10, 15  

---

## ADR-V2-001 — System of record boundaries

**Status:** Accepted  
**Decision:** UseCasesX is SoR for opportunities, use-case designs, prioritization, portfolio dependencies, value hypotheses, approval readiness and benefit realization tracking. CyberX C3G/SARN is SoR for authoritative governance/risk/control/assurance. SARPI is SoR for organizational readiness. SovereignIQ/AdvisorX is SoR for controlled advisory intelligence.  
**Consequence:** Integrations exchange **versioned** records. UI must never claim CyberX “synced” without delivery proof; fallback is a downloadable signed-context package (FR-15 / V2-11).

## ADR-V2-002 — One codebase, entitlement differentiation

**Status:** Accepted  
**Decision:** Lite / Pro / Enterprise remain one TanStack Start modular monolith; differentiate via `useEntitlement` / `usePlan` / `RequirePlan` / `Can` and `feature-flags.ts`.  
**Consequence:** `/pro` and `/enterprise` stay marketing shells; Enterprise capabilities remain flag-gated until Release D verifies them.

## ADR-V2-003 — Versioning model

**Status:** Accepted (schema landed V2-04; enforce NOT NULL later)  
**Decision:** Stable entity ID + immutable business version ID; drafts mutate; submit/publish creates snapshots; decisions bind to a version.  
**Consequence:** Prefer adapting existing tables over parallel `v2_*` renames. Soft delete for business/audit records. See `docs/v2/data-dictionary.md` and migration `20260923120000_v2_04_versioned_core_model.sql`.

## ADR-V2-004 — AI gateway

**Status:** Accepted (extend in V2-17)  
**Decision:** All AI via server-side provider-neutral gateway (`src/lib/ai/gateway.server.ts`, `service.server.ts`). Humans Apply/Dismiss; AI never executes gate decisions. No provider secrets in browser.  
**Consequence:** Eval dataset and circuit breakers are Release D; MLR requires Apply semantics and fair-use only.

## ADR-V2-005 — Integration contracts

**Status:** Accepted  
**Decision:** Generic tenant-scoped import/API/webhook boundary before third-party connectors (V2-16). Ownership from authenticated membership server-side — never browser-supplied `organization_id` as authority.  
**Consequence:** Public routes under `src/routes/api/public/*` verify signatures; service accounts least privilege.

## ADR-V2-006 — Backend hosting (interim)

**Status:** Accepted interim / open risk R-ENV-01  
**Decision:** Application env targets Supabase `mclidfbrstkoivzjqitf`. Lovable Cloud may still inject reserved `SUPABASE_*` for its managed DB; use `DB_SERVICE_ROLE_KEY` where Secrets block the prefix.  
**Consequence:** Converge to one SoR before claiming Release B GA on Lovable-hosted preview; document which environment is authoritative per deploy.

## ADR-V2-007 — Historical launch date

**Status:** Accepted  
**Decision:** 14 August 2026 is historical (SRS §2). UI/plans must not present it as a future launch. Pro Founding Access complimentary through **31 December 2026** remains.  
**Consequence:** Copy cleanup in content/hardening; not a schema change.

## ADR-V2-008 — MLR scope vs full SRS Release B

**Status:** Accepted  
**Decision:** Minimum Lovable Release = P0 security + Canvas V2 + Evidence + Scoring V2 + Gates + Value Contract. Agentic designer (FR-04), full CyberX sync, and Enterprise controls are outside first MLR cut unless already working.  
**Consequence:** Release plan pulls Value Contract forward from SRS Release C into MLR; Enterprise/SSO/private deployment stay Release D.

## ADR-V2-009 — Decision segregation of duties

**Status:** Accepted (app enforced 2026-09-22)  
**Decision:** Reviewers cannot approve/reject/decide their own submission or pilot milestone (`assertNotSelfReview` / `decideMilestone` SoD).  
**Consequence:** Gate workflows (V2-10) must reuse the same rule; optional DB CHECK later after backfill.

## ADR-V2-010 — Canonical lifecycle + scoped permissions (V2-03)

**Status:** Accepted  
**Decision:** Canonical states and transitions live in `src/lib/lifecycle`. Existing domain statuses are mapped (never silently coerced). Launch workspace roles stay; Enterprise bundles are additive scoped permissions (`src/lib/authz/scoped-permissions.ts`). Edition unlocks centralize through `authz/editions` (entitlements helpers re-export). Gate UI deferred to V2-10.  
**Consequence:** Dual-write domain status + optional canonical audit until V2-04/V2-10; see `docs/v2/lifecycle-status-map.md`.

## ADR-V2-011 — Enterprise identity & sovereignty readiness (V2-18)

**Status:** Accepted  
**Decision:** SSO (OIDC/SAML) uses existing Supabase Auth with per-org domain allow-list + JIT; SCIM deferred; tenant `data_region` + `allowed_ai_provider_routes` are declared policy enforced at the AI gateway; support access is time-bound without impersonation; air-gap is documented as abstractions only (`docs/v2/sovereignty-abstractions.md`) with no support claim.  
**Consequence:** Live IdP round-trip requires `CAPABILITY_SSO` and Auth dashboard provider registration. Arabic RTL ships for primary journeys/reports; Urdu later via the same i18n keys.
