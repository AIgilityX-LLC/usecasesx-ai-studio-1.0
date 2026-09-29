# UseCasesX™ V2 — Persistent Project Knowledge

**Prompt:** V2-00 — Install V2 project knowledge  
**Date recorded:** 2026-09-22  
**Status:** DONE (reconciled from prompt pack + in-repo knowledge)  
**Source gap:** Full UseCasesX SRS/PRD Version 2.0 document was **NOT FOUND** in the repository or Lovable project knowledge at audit time. Knowledge below is reconciled from: (a) V2 Step-by-Step Prompt Pack (2 Sep 2026), (b) `AGENTS.md` / `CLAUDE.md`, (c) `docs/architecture/*`, `docs/product/*`, (d) prior `docs/v2/current-state-audit.md` (2026-09-07).

---

## Exact knowledge block (pin this)

### 1. Product identity
UseCasesX™ is a **standalone Global AI Use Case Repository** and an **AI opportunity-to-value operating system**. It is part of the SovereignX AI Suite but ships as one modular monolith (TanStack Start + Lovable Cloud / Postgres), not as a fork per edition.

### 2. System-of-record boundaries
| Domain | System of record |
|--------|------------------|
| Opportunities, use-case designs, scoring, portfolio decisions, value hypotheses | **UseCasesX** |
| Authoritative governance, risk, control, assurance | **CyberX C3G / SARN** (handoff only from UseCasesX) |
| Organizational AI readiness / ROI assessment | **SARPI** |
| Advisory intelligence | **SovereignIQ / AdvisorX** |

UseCasesX must not pretend CyberX synchronization occurred when the endpoint is unavailable. Handoffs are consent-based, versioned, and may fall back to a downloadable signed-context package.

### 3. Canonical journey (must remain intact)
**Discover → Capture Opportunity → Design → Score → Prioritize → Portfolio → Roadmap → Export → Advisory.**

V2 extends this with: Evidence, versioned Canvas, Decision Gates, Value Contract, Governance applicability preview, and optional agentic system designer — without replacing the journey.

### 4. Editions and tenancy
- **One codebase** for Lite, Pro Founding Access, and Enterprise.
- Differentiate via **entitlements** (`useEntitlement` / `usePlan` / `RequirePlan` / `Can`) and **feature flags** (`src/lib/feature-flags.ts`) — never edition forks.
- Every tenant row carries **organization/workspace ownership**; RLS is mandatory; grants + policies in the same migration.
- Launch workspace roles: Owner, Admin, Contributor, Viewer, Facilitator. Advanced Enterprise roles stay gated.

### 5. AI boundary
- AI **assists**; humans **confirm** content and make **every gate decision**.
- No silent AI writes, autonomous approvals, or compliance/certification claims from scores or previews.
- Provider-neutral server-side gateway; no provider secrets in the browser.
- Every AI suggestion is drafted, reason/source where applicable, requires **Apply**.

### 6. Evidence, scoring, gates, integration, migration rules
- Evidence is first-class (link / note / allowed file) with provenance; short-lived authorized file access.
- Scoring is evidence-based and versioned; scores are not automatic compliance/safety/approval labels.
- Gates (Intake, Discovery Complete, Investment Review, Pilot Authorization, Scale Authorization, Retirement Review) are human-decided with immutable version linkage.
- Integrations: never trust client-supplied `organization_id` as authority; signed webhooks; least-privilege service accounts.
- Migrations: **additive only** at this stage — add → backfill → validate → enforce → retire. No destructive drops without staged plan.

### 7. Historical date rule (mandatory)
**14 August 2026 is historical.** No UI, plan, or marketing copy may present it as a future launch date. Pro Founding Access complimentary window remains through **31 December 2026** (fair use). Target framing for V2 work is post-launch enhancement, not “countdown to 14 Aug.”

### 8. Minimum Lovable Release (MLR) — from pack V2-02 intent
P0 security fixes + Canvas V2 + Evidence + Scoring V2 + Gates + Value Contract. Enterprise controls, private/air-gapped deployment, full SSO/SCIM, and sovereignty claims are later unless already verified working.

### 9. Engineering non-negotiables (repo contract)
- TanStack Start only; no `react-router-dom` / `src/pages/`.
- Server logic via `createServerFn`; external HTTP under `src/routes/api/public/*`.
- Roles only in `user_roles` + `has_role()`; never on `profiles`.
- Never edit generated: `routeTree.gen.ts`, `src/integrations/supabase/{client,client.server,auth-*,types}.ts`, `.env` secrets that are service-role, `supabase/config.toml` (except deliberate project-id cutovers).
- Definition of Done: typecheck, lint, build, relevant tests, RLS tests for new tables, evidence report.

---

## Conflicts with existing knowledge

| Topic | Existing (in-repo) | V2 pack / this block | Resolution |
|-------|--------------------|----------------------|------------|
| Launch date framing | Many docs still say “Release 2026-08-14” as active launch (`docs/product/release-2026-08-14.md`, ops runbooks) | 14 Aug is **historical**; do not present as future | Treat Aug docs as historical evidence; scrub future-tense UI/copy in later prompts; do not rewrite all historical runbooks in V2-00 |
| Pro complimentary end | AGENTS.md / release notes: **31 Dec 2026** | Pack does not contradict | Keep 31 Dec 2026 |
| Value Contract | Prior audit: UI + mocks, **no** `value_contracts` / `benefits_ledger` tables | MLR requires real Value Contract | Schema + RLS before marketing completeness |
| Decision gates / SoD | `reviewSubmission` has no submitter≠reviewer check | V2 requires configurable SoD | P0 for V2-03/V2-10 |
| Edition routes | `_app.enterprise.tsx`, `_app.pro.tsx` marketing shells | One codebase rule | Keep as marketing; logic only via entitlements |
| SRS V2 FR list | Prior audit matrix FR-01…FR-18 | Full SRS PDF/MD not in repo | **BLOCKER for absolute FR wording** — attach SRS V2.0 to repo or Lovable knowledge before claiming FR completeness |
| Signups | `SIGNUPS_ENABLED = false` in `src/routes/auth.tsx` (UI gate) | Not in SRS pack | Operational pause; re-enable is one-line flag |
| Lovable Cloud vs external Supabase | Committed browser `.env` → `mclidfbrstkoivzjqitf`; Lovable reserves `SUPABASE_*` secrets; `DB_SERVICE_ROLE_KEY` fallback | Pack assumes single Cloud backend | Document dual-env risk in risk register (V2-02) |

---

## Gate check (V2-00)

| Criterion | Met? |
|-----------|------|
| Product boundary unambiguous | Yes (section 2) |
| Historical date rule unambiguous | Yes (section 7) |
| V2 lifecycle / journey unambiguous | Yes (section 3); full gate state machine deferred to V2-03 |
| Conflicts listed | Yes |
| Code/schema unchanged | Yes |

**Next prompt:** V2-01 — Non-destructive current-state audit.

---

## Universal completion contract — V2-00

- **Changed files:** `docs/v2/project-knowledge-v2.md` (this file); `docs/v2/prompt-pack-execution-log.md` (status).
- **Schema/migrations/RLS:** none.
- **Tests:** none (read-only).
- **Evidence:** SRS/PRD V2.0 file search = NOT FOUND; Lovable `get_project_knowledge` empty; reconciled from pack + AGENTS.md + architecture/product docs.
- **Unresolved risks:** Missing authoritative SRS body; date-framing drift in historical docs; dual Supabase/Lovable env.
- **Rollback:** delete/revert these docs only.
- **Recommended next:** **V2-01**.
