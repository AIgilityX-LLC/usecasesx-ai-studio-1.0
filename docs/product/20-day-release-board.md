# 20-Day Release Board — 26 July → 14 August 2026

Repository-based execution board for the **UseCasesX™ Lite + Pro Founding Access** launch on **14 August 2026**. This document is the single source of truth for scope, sequence, risk and evidence between 26 July and 14 August. It is designed to be usable without any external PM tool.

Companion documents:

- `docs/product/release-2026-08-14.md` — launch scope
- `docs/PRE_BETA_RELEASE_CHECKLIST.md` — pre-beta checklist
- `docs/PRE_BETA_TEST_PLAN.md` — test plan
- `AGENTS.md` §6 — Definition of Done
- `CLAUDE.md` — repo commands and layout

---

## 1. How to use this board

1. Work is executed as numbered **prompt IDs** (`PROMPT-NN`). Each prompt is one bounded change.
2. Every prompt is classified **P0 / P1 / P2** (see §2) and placed on a **day** in §5.
3. At end of day, the owner updates the row: status, evidence link (commit SHA, test run, screenshot path), and any risk change.
4. **Scope-change rule** — any _new_ P1 item added mid-release MUST displace an existing P1 item of equal or greater size. Record both moves in §7 (Decision Log). No silent scope growth.
5. Freeze gates (§6) are hard stops; only P0 fixes cross a freeze.

---

## 2. Priority classification

| Priority | Definition                                                                                                                 | Examples                                                                                      |
| -------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **P0**   | Launch or security blocker. If not done by 14 Aug, we cannot launch or we launch insecurely.                               | RLS gaps, auth flow break, missing legal pages, secrets in browser, dead core-journey route.  |
| **P1**   | Required customer outcome for the launched journey. If not done, a Founding Access user cannot complete Discover→Advisory. | Studio scoring persistence, export PDF, portfolio prioritization, onboarding empty states.    |
| **P2**   | Post-launch. Enhances but does not block the core journey.                                                                 | Extra deliverable generators, advanced analytics, additional export formats, cosmetic polish. |

Rule: **P2 never displaces P0/P1.** P2 is worked only when the day's P0/P1 are green.

---

## 3. Board row schema

Every row in §5 uses this shape:

| Field               | Meaning                                                          |
| ------------------- | ---------------------------------------------------------------- |
| **Date**            | Calendar day (2026).                                             |
| **Prompt ID**       | `PROMPT-NN` — matches the prompt issued to Lovable/Claude/Codex. |
| **Title**           | One-line description.                                            |
| **Priority**        | P0 / P1 / P2.                                                    |
| **Owner**           | `@owner` placeholder — assign before start of day.               |
| **Status**          | `todo` / `in-progress` / `blocked` / `done` / `deferred`.        |
| **Dependency**      | Prompt IDs that must be `done` first.                            |
| **Risk**            | Link to §7 risk ID, or `-`.                                      |
| **Evidence**        | Commit SHA, test run ID, screenshot path, or `-`.                |
| **Acceptance gate** | Objective, testable condition that flips status to `done`.       |

---

## 4. Phase map

The 20 days are organised into six phases. Every Phase 0–5 prompt is represented in §5.

- **Phase 0 — Foundations (26–29 Jul)**: repo standard, rebrand, entitlements audit, RLS audit.
- **Phase 1 — Core journey hardening (30 Jul – 3 Aug)**: Discover, Studio, Scoring, Portfolio, Roadmap end-to-end.
- **Phase 2 — Export & Advisory handoff (4–6 Aug)**: PDF/Word export, SARPI/C3G/AdvisorX handoff surfaces.
- **Phase 3 — Auth, roles, fair-use (7–9 Aug)**: Founding Access lifecycle, roles gating, fair-use limits.
- **Phase 4 — QA, accessibility, performance (10–12 Aug)**: Playwright green, WCAG AA, mobile 360, Lighthouse.
- **Phase 5 — Launch (13–14 Aug)**: freeze, smoke, publish, monitor.

---

## 5. Daily plan (26 Jul – 14 Aug 2026)

Each day lists **Objective**, **Exit condition**, and a table of prompts. Owners and evidence fill in during execution.

### Sun 26 Jul — Foundations kickoff _(Phase 0)_

- **Objective**: Repository standard live; rebrand surfaced site-wide; execution board active.
- **Exit condition**: `AGENTS.md`, `CLAUDE.md`, `README.md` and this board are merged; `bun run build` green.

| Prompt ID | Title                                                   | Priority | Owner  | Status      | Dep | Risk | Evidence | Acceptance gate                                                                     |
| --------- | ------------------------------------------------------- | -------- | ------ | ----------- | --- | ---- | -------- | ----------------------------------------------------------------------------------- |
| PROMPT-01 | Rebrand cleanup (surface + route metadata)              | P0       | @owner | done        | -   | -    | -        | Root head + all route heads updated; no "Lovable" strings in user-visible surfaces. |
| PROMPT-02 | Repo engineering standard (AGENTS/CLAUDE/README + docs) | P0       | @owner | done        | -   | -    | -        | Docs merged; contributors follow one standard.                                      |
| PROMPT-03 | 20-day release board (this doc)                         | P0       | @owner | in-progress | -   | -    | -        | Board committed with every phase represented.                                       |

### Mon 27 Jul — Founding Access lifecycle audit

- **Objective**: Understand real state of registration, plan gating, fair-use.
- **Exit condition**: Written audit merged; P0/P1 gaps added to board §5 as new rows.

| Prompt ID | Title                                            | Priority | Owner  | Status | Dep       | Risk | Evidence | Acceptance gate                                    |
| --------- | ------------------------------------------------ | -------- | ------ | ------ | --------- | ---- | -------- | -------------------------------------------------- |
| PROMPT-04 | Founding Access lifecycle & fair-use audit       | P0       | @owner | todo   | PROMPT-02 | R-01 | -        | Audit doc in `docs/product/` lists gaps + fixes.   |
| PROMPT-05 | Entitlements/`useEntitlement` inline-check sweep | P0       | @owner | todo   | PROMPT-04 | R-02 | -        | No inline plan checks outside centralized helpers. |

### Tue 28 Jul — RLS & security baseline audit

- **Objective**: Every `public` table has RLS + grants matching baseline.
- **Exit condition**: `bun run test:rls` green; `supabase--linter` clean of P0 findings.

| Prompt ID | Title                                      | Priority | Owner  | Status | Dep | Risk | Evidence | Acceptance gate                                                 |
| --------- | ------------------------------------------ | -------- | ------ | ------ | --- | ---- | -------- | --------------------------------------------------------------- |
| PROMPT-06 | RLS coverage audit + missing policies      | P0       | @owner | todo   | -   | R-03 | -        | Every tenant table: RLS enabled, grants scoped, tests pass.     |
| PROMPT-07 | Secret surface audit (browser/logs/config) | P0       | @owner | todo   | -   | R-04 | -        | No service-role / provider secret reachable from client bundle. |

### Wed 29 Jul — Nav integrity & dead-CTA sweep

- **Objective**: No dead nav, no orphan routes, no "coming soon" surfaces claiming Enterprise is live.
- **Exit condition**: `bun run check:nav-integrity` green; manual walk of core journey has zero dead ends.

| Prompt ID | Title                           | Priority | Owner  | Status | Dep       | Risk | Evidence | Acceptance gate                                              |
| --------- | ------------------------------- | -------- | ------ | ------ | --------- | ---- | -------- | ------------------------------------------------------------ |
| PROMPT-08 | Nav integrity + dead CTA sweep  | P0       | @owner | todo   | -         | R-05 | -        | Nav check script green; screenshot of walk-through attached. |
| PROMPT-09 | Enterprise-claim language sweep | P0       | @owner | todo   | PROMPT-08 | R-05 | -        | No UI implies deferred Enterprise features are live.         |

### 🔒 Thu 30 Jul — **FREEZE GATE 1: Foundations frozen** _(Phase 1 begins)_

- **Objective**: Foundations frozen; only P0 fixes may touch AGENTS/CLAUDE/README, RLS, entitlements helpers.
- **Exit condition**: All Phase 0 prompts `done`; freeze declared in §7 Decision Log.

| Prompt ID | Title                                               | Priority | Owner  | Status | Dep       | Risk | Evidence | Acceptance gate                                |
| --------- | --------------------------------------------------- | -------- | ------ | ------ | --------- | ---- | -------- | ---------------------------------------------- |
| PROMPT-10 | Discover route hardening (empty/loading/error/role) | P1       | @owner | todo   | PROMPT-06 | -    | -        | All four states render; Playwright spec added. |

### Fri 31 Jul — Studio (Capture → Design)

| Prompt ID | Title                                        | Priority | Owner  | Status | Dep       | Risk | Evidence | Acceptance gate                                                    |
| --------- | -------------------------------------------- | -------- | ------ | ------ | --------- | ---- | -------- | ------------------------------------------------------------------ |
| PROMPT-11 | Opportunity capture persistence + validation | P1       | @owner | todo   | PROMPT-06 | R-06 | -        | Capture round-trips to DB; Zod validation server-side; RLS-scoped. |
| PROMPT-12 | Blueprint builder autosave + resume          | P1       | @owner | todo   | PROMPT-11 | -    | -        | Draft persists; reload restores state.                             |

### Sat 1 Aug — Scoring

| Prompt ID | Title                                    | Priority | Owner  | Status | Dep       | Risk | Evidence | Acceptance gate                                                |
| --------- | ---------------------------------------- | -------- | ------ | ------ | --------- | ---- | -------- | -------------------------------------------------------------- |
| PROMPT-13 | 5-pillar feasibility scoring persistence | P1       | @owner | todo   | PROMPT-12 | -    | -        | Scores saved per use case; Quick Wins recompute deterministic. |
| PROMPT-14 | Scoring role-gate (Contributor+ only)    | P1       | @owner | todo   | PROMPT-13 | R-02 | -        | Viewer sees read-only; server rejects unauthorized writes.     |

### Sun 2 Aug — Prioritize & Portfolio

| Prompt ID | Title                                    | Priority | Owner  | Status | Dep       | Risk | Evidence | Acceptance gate                                                       |
| --------- | ---------------------------------------- | -------- | ------ | ------ | --------- | ---- | -------- | --------------------------------------------------------------------- |
| PROMPT-15 | Prioritization matrix stable + shareable | P1       | @owner | todo   | PROMPT-13 | -    | -        | Matrix state URL-serializable; loads for teammates in same workspace. |
| PROMPT-16 | Portfolio views: filter, sort, compare   | P1       | @owner | todo   | PROMPT-15 | -    | -        | `check:compare` script green; Playwright compare spec green.          |

### 🔒 Mon 3 Aug — **FREEZE GATE 2: Core journey feature-complete**

- **Objective**: Discover → Portfolio functional end-to-end for a Founding Access user.
- **Exit condition**: E2E spec `tests/production-smoke.e2e.ts` completes Discover → Portfolio with real workspace data.

| Prompt ID | Title                         | Priority | Owner  | Status | Dep       | Risk | Evidence | Acceptance gate                                                    |
| --------- | ----------------------------- | -------- | ------ | ------ | --------- | ---- | -------- | ------------------------------------------------------------------ |
| PROMPT-17 | Roadmap export from Portfolio | P1       | @owner | todo   | PROMPT-16 | -    | -        | Roadmap renders from Portfolio selection; export triggers Phase 2. |

### Tue 4 Aug — Export I: PDF _(Phase 2)_

| Prompt ID | Title                                  | Priority | Owner  | Status | Dep       | Risk | Evidence | Acceptance gate                                            |
| --------- | -------------------------------------- | -------- | ------ | ------ | --------- | ---- | -------- | ---------------------------------------------------------- |
| PROMPT-18 | Blueprint PDF export (server function) | P1       | @owner | todo   | PROMPT-12 | R-07 | -        | PDF generated server-side; size, fonts, branding verified. |

### Wed 5 Aug — Export II: Word + Roadmap

| Prompt ID | Title                         | Priority | Owner  | Status | Dep          | Risk | Evidence | Acceptance gate                                |
| --------- | ----------------------------- | -------- | ------ | ------ | ------------ | ---- | -------- | ---------------------------------------------- |
| PROMPT-19 | Blueprint Word (.docx) export | P1       | @owner | todo   | PROMPT-18    | R-07 | -        | .docx opens in Word/Pages; sections match PDF. |
| PROMPT-20 | Roadmap export (PDF)          | P1       | @owner | todo   | PROMPT-17,18 | -    | -        | Roadmap PDF matches on-screen Gantt.           |

### Thu 6 Aug — Advisory handoff surfaces

| Prompt ID | Title                                            | Priority | Owner  | Status | Dep       | Risk | Evidence | Acceptance gate                                           |
| --------- | ------------------------------------------------ | -------- | ------ | ------ | --------- | ---- | -------- | --------------------------------------------------------- |
| PROMPT-21 | SARPI / C3G Governance / AdvisorX handoff intake | P1       | @owner | todo   | PROMPT-16 | R-08 | -        | Handoff creates auditable event; no dead CTA.             |
| PROMPT-22 | Append-only audit event pipeline verified        | P0       | @owner | todo   | PROMPT-21 | R-08 | -        | Audit table receives events; no updates/deletes possible. |

### Fri 7 Aug — Auth & roles _(Phase 3)_

| Prompt ID | Title                                            | Priority | Owner  | Status | Dep       | Risk | Evidence | Acceptance gate                                            |
| --------- | ------------------------------------------------ | -------- | ------ | ------ | --------- | ---- | -------- | ---------------------------------------------------------- |
| PROMPT-23 | Auth flow (email + Google) end-to-end            | P0       | @owner | todo   | PROMPT-07 | R-09 | -        | Sign-up, sign-in, sign-out, password reset all pass.       |
| PROMPT-24 | Roles enforcement via `has_role()` on server fns | P0       | @owner | todo   | PROMPT-23 | R-02 | -        | Viewer/Contributor/Admin/Owner/Facilitator gates verified. |

### Sat 8 Aug — Fair-use limits + observability

- **Objective**: Founding Access fair-use limits live; observability captures errors.
- **Exit condition**: Limits enforced server-side with clear UX; error logs reach observability sink.

| Prompt ID | Title                                             | Priority | Owner  | Status | Dep       | Risk | Evidence | Acceptance gate                                                    |
| --------- | ------------------------------------------------- | -------- | ------ | ------ | --------- | ---- | -------- | ------------------------------------------------------------------ |
| PROMPT-25 | Founding Access fair-use limits (server-enforced) | P0       | @owner | todo   | PROMPT-24 | R-01 | -        | Over-limit request returns friendly 429; counters visible to user. |
| PROMPT-26 | Observability: error + audit sink                 | P1       | @owner | todo   | PROMPT-22 | R-08 | -        | Errors and audit events queryable; dashboards linked.              |

### 🔒 Sun 9 Aug — **FREEZE GATE 3: Feature freeze**

- **Objective**: All P1 features merged. From here, only P0 fixes and QA polish.
- **Exit condition**: All PROMPT-10 through PROMPT-26 `done` or explicitly `deferred` in §7.

| Prompt ID | Title                                     | Priority | Owner  | Status | Dep       | Risk | Evidence | Acceptance gate                                         |
| --------- | ----------------------------------------- | -------- | ------ | ------ | --------- | ---- | -------- | ------------------------------------------------------- |
| PROMPT-27 | Freeze declaration + scope reconciliation | P0       | @owner | todo   | all above | -    | -        | Decision Log entry logging freeze + any deferred items. |

### Mon 10 Aug — Accessibility _(Phase 4)_

| Prompt ID | Title                            | Priority | Owner  | Status | Dep       | Risk | Evidence | Acceptance gate                                          |
| --------- | -------------------------------- | -------- | ------ | ------ | --------- | ---- | -------- | -------------------------------------------------------- |
| PROMPT-28 | WCAG 2.1 AA pass on core journey | P0       | @owner | todo   | PROMPT-27 | R-10 | -        | axe-core zero criticals; keyboard walk-through recorded. |

### Tue 11 Aug — Responsive + mobile

| Prompt ID | Title                          | Priority | Owner  | Status | Dep       | Risk | Evidence | Acceptance gate                                           |
| --------- | ------------------------------ | -------- | ------ | ------ | --------- | ---- | -------- | --------------------------------------------------------- |
| PROMPT-29 | Responsive audit down to 360px | P0       | @owner | todo   | PROMPT-27 | -    | -        | `bun run test:mobile` green; screenshots at 360/768/1024. |

### 🔒 Wed 12 Aug — **FREEZE GATE 4: QA freeze**

- **Objective**: All Playwright specs green; performance within budget.
- **Exit condition**: `bun run test:e2e`, `test:smoke`, `test:navbar`, `test:mobile`, `test:rls` all green; Lighthouse ≥ 90 perf/a11y/best-practices/SEO on Discover.

| Prompt ID | Title                                         | Priority | Owner  | Status | Dep          | Risk | Evidence | Acceptance gate                            |
| --------- | --------------------------------------------- | -------- | ------ | ------ | ------------ | ---- | -------- | ------------------------------------------ |
| PROMPT-30 | Full Playwright suite green + Lighthouse pass | P0       | @owner | todo   | PROMPT-28,29 | R-11 | -        | Test run IDs + Lighthouse report attached. |

### 🔒 Thu 13 Aug — **FREEZE GATE 5: Launch freeze** _(Phase 5)_

- **Objective**: Zero merges except P0 launch fixes. Legal, marketing, DNS ready.
- **Exit condition**: Custom domain `usecasesx.aigilityx.com` resolves to preview; legal pages verified; smoke pass on staging.

| Prompt ID | Title                                                | Priority | Owner  | Status | Dep       | Risk | Evidence | Acceptance gate                                      |
| --------- | ---------------------------------------------------- | -------- | ------ | ------ | --------- | ---- | -------- | ---------------------------------------------------- |
| PROMPT-31 | Legal (Terms, Privacy, Founding Access ToS) verified | P0       | @owner | todo   | -         | R-12 | -        | Pages live, reviewed, linked from footer.            |
| PROMPT-32 | Custom domain + DNS + email deliverability           | P0       | @owner | todo   | -         | R-13 | -        | DNS, MX/SPF/DKIM, transactional test email received. |
| PROMPT-33 | Staging smoke + rollback rehearsal                   | P0       | @owner | todo   | PROMPT-30 | R-14 | -        | Rollback playbook executed on staging; RTO measured. |

### 🚀 Fri 14 Aug — Launch day

- **Objective**: Publish, monitor, respond.
- **Exit condition**: Production smoke green; on-call rotation active; Day-0 metrics captured.

| Prompt ID | Title                                | Priority | Owner  | Status | Dep       | Risk | Evidence | Acceptance gate                                    |
| --------- | ------------------------------------ | -------- | ------ | ------ | --------- | ---- | -------- | -------------------------------------------------- |
| PROMPT-34 | Publish to production                | P0       | @owner | todo   | PROMPT-33 | -    | -        | Publish action executed; production URL green.     |
| PROMPT-35 | Post-launch smoke + on-call handover | P0       | @owner | todo   | PROMPT-34 | R-14 | -        | `test:smoke` green against prod; on-call doc live. |
| PROMPT-36 | Day-0 metrics + hotfix triage window | P0       | @owner | todo   | PROMPT-34 | -    | -        | Metrics snapshot recorded; triage window 4h open.  |

---

## 6. Freeze gates (summary)

| Date       | Gate                          | What it locks                                     | Who can override            |
| ---------- | ----------------------------- | ------------------------------------------------- | --------------------------- |
| **30 Jul** | Foundations frozen            | AGENTS/CLAUDE, RLS baseline, entitlements helpers | P0 fixes only, logged in §7 |
| **3 Aug**  | Core journey feature-complete | Discover → Portfolio behavior                     | P0/P1 defects only          |
| **9 Aug**  | Feature freeze                | All P1 scope                                      | P0 only                     |
| **12 Aug** | QA freeze                     | Test/perf/a11y baselines                          | P0 launch blockers only     |
| **13 Aug** | Launch freeze                 | Everything                                        | Named launch commander only |

Any freeze override MUST be recorded in §7 Decision Log with rationale, prompt ID, and displaced item (if any).

---

## 7. Risk register & Decision log

### 7.1 Risk register

| ID   | Risk                                                          | Likelihood | Impact   | Mitigation                                                           | Owner  | Status |
| ---- | ------------------------------------------------------------- | ---------- | -------- | -------------------------------------------------------------------- | ------ | ------ |
| R-01 | Founding Access lifecycle unclear → over-consumption          | M          | H        | PROMPT-04 audit + PROMPT-25 server-enforced limits                   | @owner | open   |
| R-02 | Inline entitlement/role checks bypass central helpers         | M          | H        | PROMPT-05 sweep + PROMPT-24 server has_role()                        | @owner | open   |
| R-03 | Missing RLS on a tenant table                                 | L          | Critical | PROMPT-06 audit + `test:rls` in CI                                   | @owner | open   |
| R-04 | Secret leaked into browser bundle or logs                     | L          | Critical | PROMPT-07 sweep + code review checklist                              | @owner | open   |
| R-05 | Dead CTA / Enterprise claim in UI at launch                   | M          | M        | PROMPT-08/09 + nav-integrity script                                  | @owner | open   |
| R-06 | Data model change required mid-flight (destructive migration) | L          | H        | Additive-only rule (AGENTS §5); staged plan required                 | @owner | open   |
| R-07 | Export (PDF/Word) fails on Worker runtime (native deps)       | M          | H        | Worker-safe libs only (see server-runtime rules); test on prod build | @owner | open   |
| R-08 | Audit events not truly append-only                            | L          | H        | PROMPT-22 verify + RLS deny UPDATE/DELETE                            | @owner | open   |
| R-09 | Auth flow regression (Google provider misconfigured)          | M          | H        | PROMPT-23 e2e on all providers before freeze                         | @owner | open   |
| R-10 | Accessibility criticals discovered late                       | M          | M        | PROMPT-28 axe-core run at 10 Aug                                     | @owner | open   |
| R-11 | Perf regression pushes Lighthouse < 90                        | M          | M        | PROMPT-30 budget + route-loader data pattern                         | @owner | open   |
| R-12 | Legal pages missing or unreviewed                             | L          | Critical | PROMPT-31 legal review by 13 Aug                                     | @owner | open   |
| R-13 | DNS/email deliverability not ready                            | M          | H        | PROMPT-32 dry-run by 13 Aug                                          | @owner | open   |
| R-14 | No rollback plan rehearsed                                    | M          | H        | PROMPT-33 rollback rehearsal; publish action reversible              | @owner | open   |

### 7.2 Decision log

Append-only. One row per material decision (scope change, freeze override, deferral, risk acceptance).

| Date       | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Rationale                                                                                                                | Prompt IDs affected       | Displaced item (if P1 swap) | Decided by |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------- | --------------------------- | ---------- |
| 2026-07-26 | Adopt this 20-day board as the authoritative execution plan                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Single source of truth; removes need for external PM tool                                                                | PROMPT-03                 | -                           | @owner     |
| 2026-07-26 | Lock Phase 0 artifacts: `docs/audits/phase-0-current-state.md`, `docs/product/edition-capability-matrix.md`, `docs/architecture/data-migration-plan.md`, `docs/testing/launch-acceptance-matrix.md`                                                                                                                                                                                                                                                                                                                                                 | Consolidates 25–26 Jul audits into referenceable baselines; unblocks Phase 1 foundations freeze                          | PROMPT-09 → PROMPT-10     | -                           | @owner     |
| 2026-07-26 | Approve P0/P1/P2 backlog per §11 reconciliation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Every audited item classified; deferred register append-only                                                             | PROMPT-09                 | -                           | @owner     |
| 2026-07-26 | Adopt source-control workflow (`docs/process/source-control-workflow.md`, `release-branch-plan.md`, `pr-and-migration-checklist.md`, `release-notes-template.md`, `.github/PULL_REQUEST_TEMPLATE.md`, `CHANGELOG.md`). Lovable-tracked branch remains `main`; `develop` and `release/2026-08-14` are documented but NOT created — activation requires a separate Decision Log entry per source-control-workflow §4.                                                                                                                                 | Establish conventions without risking Lovable ↔ GitHub sync                                                              | -                         | -                           | @owner     |
| 2026-07-27 | Approve the non-destructive tenancy plan (`docs/architecture/tenancy-migration-plan.md`, `tenancy-rls-design.md`, `tenancy-verification-queries.md`). `organizations` stays the tenant; add `organization_members`, `workspace_members`, `organization_units`, `plans`, `entitlements`; add nullable `organization_id`/`workspace_id` to tenant tables; membership-based RLS via SECURITY DEFINER helpers. Steps T1–T6 are additive only; T7 (`SET NOT NULL`, drop legacy predicates) is deferred post-launch. No SQL executed under this decision. | Row counts are ~zero at T=0, so the tenancy foundation is cheapest to lay now; keeps Lite/Pro/Enterprise in one codebase | PROMPT-11 (execute T1–T3) | -                           | @owner     |

## 11. Approved P0 / P1 / P2 reconciliation (Phase 0 close-out)

Authoritative source: `docs/product/scope-2026-08-14/backlog-p0-p1-p2.md` and `deferred-register.md`. Mirrored here so the board is self-contained.

### P0 — launch blockers (10)

| #     | Item                                                               | Prompt    |
| ----- | ------------------------------------------------------------------ | --------- |
| P0-1  | `/my-use-cases` mock → live                                        | PROMPT-14 |
| P0-2  | `/reports` mock → live                                             | PROMPT-15 |
| P0-3  | Delist Feasibility/Data-Readiness/Blueprint top-level from sidebar | PROMPT-12 |
| P0-4  | Mobile home overflow (390 px)                                      | PROMPT-10 |
| P0-5  | `/repository` empty-state + labelled search/sort                   | PROMPT-10 |
| P0-6  | Lock `/entitlement` to admin + noindex                             | PROMPT-13 |
| P0-7  | Gate `/module-analytics` with `RequireRoles`                       | PROMPT-13 |
| P0-8  | DB A1 additive `WITH CHECK` tightening                             | PROMPT-11 |
| P0-9  | `/auth` real `<label>`s                                            | PROMPT-10 |
| P0-10 | `/dashboard` live KPIs                                             | PROMPT-16 |

### P1 — required outcomes (12)

| #     | Item                                          | Prompt              |
| ----- | --------------------------------------------- | ------------------- |
| P1-1  | Studio server-persisted drafts                | PROMPT-18           |
| P1-2  | Per-use-case Feasibility wired                | PROMPT-19           |
| P1-3  | Per-use-case Data Readiness wired             | PROMPT-20           |
| P1-4  | Portfolio Roadmap live                        | PROMPT-21           |
| P1-5  | Deliverables — one export path per type       | PROMPT-22           |
| P1-6  | Unify `RequirePlan` across Pro routes         | PROMPT-23 (bundled) |
| P1-7  | Consolidate nav sources of truth              | PROMPT-12 (bundled) |
| P1-8  | Sample-data disclaimer sweep                  | PROMPT-17           |
| P1-9  | SEO/head sweep                                | PROMPT-25           |
| P1-10 | Fair-use advisory meter                       | PROMPT-23           |
| P1-11 | Activation event logging                      | PROMPT-24           |
| P1-12 | SARPI/AdvisorX/C3G/RoadmapX Coming Soon flags | PROMPT-13 (bundled) |

### P2 — post-launch (7)

| #    | Item                                                                            |
| ---- | ------------------------------------------------------------------------------- |
| P2-1 | Hide `/decision`, `/impact-assessment`, `/api-integration` from nav; keep files |
| P2-2 | Blueprint editor                                                                |
| P2-3 | Consolidate `ComingSoonGate` vs `ModuleStub` primitives                         |
| P2-4 | Collections share advanced flows if token flow unverified                       |
| P2-5 | Fair-use hard enforcement + billing                                             |
| P2-6 | Enterprise roles beyond launch five, SSO, custom domains                        |
| P2-7 | Terminology unification ("Portfolio Roadmap" vs "RoadmapX")                     |

### Deferred (13)

See `docs/product/scope-2026-08-14/deferred-register.md`. Append-only; no reopens after 9 Aug feature freeze without §7 override.

---

## 8. Daily stand-up questions

Answered by every owner at start of day (async in commit message or standup doc):

1. **What P0/P1 prompt did I complete yesterday?** (Prompt ID + evidence link.)
2. **What P0/P1 prompt am I working today?** (Prompt ID + target exit condition.)
3. **What is blocking me?** (Dependency prompt ID, risk ID, or "nothing".)
4. **Any scope change proposed?** (If yes → §7 Decision Log entry required BEFORE work starts.)
5. **Any new risk?** (If yes → add to §7 risk register with ID `R-NN`.)

---

## 9. End-of-day evidence checklist

Before closing the day, the owner confirms for every row moved to `done`:

- [ ] Commit SHA(s) recorded in the row's **Evidence** column.
- [ ] Relevant tests run and green: `bun run lint`, `tsgo`, `bun run build`, plus the narrow spec for the change (`test:e2e` / `test:smoke` / `test:navbar` / `test:mobile` / `test:rls`).
- [ ] Browser evidence attached for UI changes (screenshot path under `/tmp/browser/` or `docs/evidence/`).
- [ ] `bun run test:rls` re-run if any new table or policy was introduced.
- [ ] Risk register updated (new/closed/changed) if applicable.
- [ ] Decision log updated if scope, freeze, or deferral changed.
- [ ] Rollback / forward-fix note added if the change touches production-facing behavior.
- [ ] Recommended **next prompt ID** noted at end of the day's stand-up.

---

## 10. Rollback & forward-fix policy

- **Before 13 Aug (launch freeze)**: forward-fix preferred; rollback only for P0 defects with no same-day fix.
- **13–14 Aug**: rollback rehearsal required (PROMPT-33). Launch commander owns the go/no-go.
- **Post-launch**: hotfix window 4 h after publish (PROMPT-36). Beyond that, defects triaged into the post-launch backlog unless P0.

Rollback path for schema changes: additive-only migrations mean rollback is code-only in most cases. Destructive changes require a staged plan approved in §7 before merge.

---

_End of board. Update `Status`, `Evidence`, `Risk` and §7 in place — do not rewrite history._
