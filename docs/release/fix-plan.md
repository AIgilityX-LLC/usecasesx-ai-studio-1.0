# Enterprise readiness — fix plan (STEP 0 audit)

| Field | Value |
| ----- | ----- |
| **Date** | 2026-10-28 |
| **Branch target** | `fix/enterprise-readiness-fails` from `lovable/main` |
| **Method** | Audit only in this document — no product edits until CODE-FIXABLE execution |
| **Lovable repo** | `AIgilityX-LLC/usecasesx-ai-studio-1.0` |

---

## Prerequisite check — PRs #34, #37, #40

| PR | Title | State on `usecasesx-ai-studio-1.0` | Overlaps fails |
| -- | ----- | ---------------------------------- | -------------- |
| **#34** | chore(control-plane): establish engineering governance plane | **OPEN — not merged** | Process/docs; `docs/process/github-settings.md`; gitleaks helpers; not health/ready routes |
| **#37** | ci(quality-gates): enterprise CI/CD and quality gates | **OPEN — not merged** | **Dim 24** (CI gates, migration safety, github-settings) |
| **#40** | fix(security): Phase 3 multi-tenant hardening | **OPEN — not merged** | **Dim 6** adjacent (client-secrets check, cross-tenant attack matrix, ABAC) — **no SQL RLS migration in PR files** |

Also open (do not re-implement):

| PR | Title | Overlap |
| -- | ----- | ------- |
| **#76** | feat(ops): enterprise production observability and runbooks | **Dim 17** — `/api/public/health`, `/api/public/ready`, `src/lib/ops/control-plane/*`, runbooks, SLOs |
| **#77** | feat(ci): enterprise Critical gates and production authorization | **Dim 24** — Critical gates aggregator, production authorization |

### Implication

| Report FAIL | Real gap vs “not merged yet”? |
| ----------- | ----------------------------- |
| **17 Observability** | Mostly **not merged yet** (#76). Do **not** re-add health/ready/control-plane. CODE-FIXABLE only: thin request-id + redaction on existing `src/server.ts` / `error-page` if not already sufficient. |
| **24 CI/CD** | Mostly **not merged yet** (#37, #77). Do **not** rewrite CI from scratch. CODE-FIXABLE: lint fixes on current tree; document required checks + “publish from green main”; optional thin guards that do not duplicate those PRs. |
| **6 RLS** | Live proof failure is **setup** (see §3). Policy hardening items (user_roles / telemetry inserts) may still be **CODE-FIXABLE** as additive SQL — not covered by #40’s file list. |
| **19 Recovery** | Scripts/docs **CODE-FIXABLE**; drill execution **NEEDS-HUMAN**. Existing `scripts/ops/restore-drill.mjs` — extend/reuse, do not fork blindly. |
| **27 / 28 / 30** | **NEEDS-INFRA** + marketing copy softens (**CODE-FIXABLE**). |

**Stop condition from task:** prerequisite “merged?” is **not met**. Failures **17** and **24** are primarily unmerged PR content, not missing invention. Proceed only with CODE-FIXABLE rows below.

---

## 1. Scorecard reconciliation (9 FAIL vs 7 listed)

### Detail rows marked FAIL (dimension numbers)

| # | Dimension |
| - | --------- |
| 6 | RLS |
| 17 | Observability |
| 19 | Recovery |
| 24 | CI/CD |
| 27 | UAE deployment readiness |
| 28 | Saudi deployment readiness |
| 30 | Sovereign deployment readiness |

**Count of FAIL detail rows = 7.**

### Report arithmetic error

| Claimed totals | Actual from detail rows |
| -------------- | ----------------------- |
| FAIL **9** | FAIL **7** |
| PASS WITH CONDITIONS **20** | PASS WITH CONDITIONS **22** (dims 1–5, 7–14, 16, 18, 20–23, 25, 26, 29) |
| PASS **1** | PASS **1** (dim 15) |
| N/A **0** | N/A **0** |
| Sum | **30** |

**There are no two “missing” FAIL dimensions.** The executive scorecard **over-counted FAIL by 2** and **under-counted PASS WITH CONDITIONS by 2**. Likely confusion with **2 Critical** issue IDs (ER-C-01, ER-C-02) or **6 High** issues — those are severity tickets, not extra scorecard dimensions.

**Correction to apply in report:** Totals → PASS 1 · PASS WITH CONDITIONS 22 · FAIL 7 · N/A 0.

---

## 2. Full dimension matrix

Legend: **CODE-FIXABLE** / **NEEDS-HUMAN** / **NEEDS-INFRA** / **NOT TESTED** (condition is “not verified”).

| Dim | Status (report) | Root cause | Class | Exact files (current / PR) | Planned change | Verification |
| --- | --------------- | ---------- | ----- | -------------------------- | -------------- | ------------ |
| 1 | PWC | Solid monolith; stale Next/Vercel handover docs | CODE-FIXABLE (docs) | `docs/handover/11-deployment-runbook.md` | Banner: superseded by Lovable/Workers truth | Doc review |
| 2 | PWC | WIP branches; lint debt | CODE-FIXABLE | eslint targets on tree | Fix lint/type errors found in bug sweep | `bun run lint`, `tsgo` |
| 3 | PWC | Org-wide AR-2 accepted | NOT TESTED | tenancy tests | No code; re-run live suite | Owner: `test:tenancy` |
| 4 | PWC | SSO unproven | NEEDS-HUMAN | `src/lib/enterprise/sso*` | No IdP work this PR | Live SSO pilot |
| 5 | PWC | Authz matrix not re-run | NOT TESTED | `tests/authz-matrix.e2e.ts` | No code | Owner runs suite |
| **6** | **FAIL** | V2-21: **login failed before assertions** (setup). Separate: loose historical policies may still exist | Setup = **NEEDS-HUMAN**; policy harden = **CODE-FIXABLE** | `tests/rls-isolation.e2e.ts`; `docs/migration/full-schema.sql`; new migration | Additive RLS migration for user_roles + view/download/integration inserts **if** still needed; **do not claim live PASS** | Owner applies migration to TEST + seeds users + runs suite |
| 7 | PWC | Bundle secret scan not this cycle | CODE-FIXABLE | build output | Scan after build | `bun run build` + grep |
| 8 | PWC | Cron secret env | NOT TESTED | `src/lib/cron-auth.server.ts` | No code | Staging config check |
| 9 | PWC | Process OK | NOT TESTED | env examples | Guard docs only | Owner secrets review |
| 10 | PWC | Supabase-bound storage | NEEDS-INFRA (residency) | `src/lib/storage/*` | No infra | Dedicated region project |
| 11 | PWC | Counsel pending | NEEDS-HUMAN | `src/lib/legal/*` | Soft claims only if needed | Legal review |
| 12 | PWC | Controlled deletion incomplete | NEEDS-HUMAN / partial CODE | `policy-packs/evaluate.ts` | No full workflow this PR | Later |
| 13 | PWC | Immutable audit on #73/#76 | NEEDS-HUMAN (merge) | open PRs | Do not re-implement audit module | Merge #73/#76 |
| 14 | PWC | Packs WIP | CODE-FIXABLE (land packs carefully) / NEEDS-INFRA | `src/lib/policy-packs/*` | Keep packs; no infra claim | Unit tests already |
| **15** | **PASS** | Gateway abstraction | — | `src/lib/ai/*` | None | Existing unit tests |
| 16 | PWC | Hard Supabase lock-in | NEEDS-INFRA | `docs/sovereignty/deployment-portability.md` | Docs only | — |
| **17** | **FAIL** | Health/ready/control-plane live in **#76**, absent on main | **NEEDS-HUMAN (merge #76)**; thin error/redaction **CODE-FIXABLE** | #76 paths; `src/server.ts`, `src/lib/error-page.ts`, `src/lib/telemetry/events.ts` | **Do not** add duplicate `/api/public/health|ready`. Improve generic error + request id + redaction test | Unit test: secret not in log/response |
| 18 | PWC | Platform backups | NEEDS-HUMAN | platform | Confirm retention | Owner |
| **19** | **FAIL** | No current drill evidence; rebuild≠restore | Scripts **CODE-FIXABLE**; drill **NEEDS-HUMAN** | `scripts/ops/restore-drill.mjs`, new `scripts/recovery/*`, `docs/runbooks/recovery-drill.md` | Export/verify scripts refuse production ref; runbook | Written, **not run** (ER-C-02 stays open) |
| 20 | PWC | No load test | NOT TESTED | — | No load vs prod | Later |
| 21 | PWC | No durable queue | NOT TESTED / accept | — | None | — |
| 22 | PWC | Full WCAG deferred | NOT TESTED | — | None this PR | axe later |
| 23 | PWC | Live isolation unproven | NOT TESTED / NEEDS-HUMAN | RLS tests | Seed + run | Owner |
| **24** | **FAIL** | Gates in **#37/#77** not merged | **NEEDS-HUMAN (merge)**; lint + docs **CODE-FIXABLE** | `.github/workflows/ci.yml`, #37/#77 | Do not duplicate Critical gates. Fix lint; write `docs/process/github-settings.md` pointing at required check **names after merge**; Lovable publish checklist | Lint green on this PR; CI merge is owner |
| 25 | PWC | Stale handover | CODE-FIXABLE | handover docs | Supersede note | Doc review |
| 26 | PWC | Owners unrecorded | NEEDS-HUMAN | launch-runbook | Fill names | Owner |
| **27** | **FAIL** | No UAE regional infra; overclaim risk on landing | **NEEDS-INFRA** + copy **CODE-FIXABLE** | `src/routes/index.tsx`, enterprise marketing | Soften “Sovereign deployment” claims | Diff review |
| **28** | **FAIL** | Same for KSA | **NEEDS-INFRA** + copy **CODE-FIXABLE** | same | Soften | Diff review |
| 29 | PWC | Dedicated = new project | NEEDS-HUMAN playbook | portability docs | Optional short playbook | Owner |
| **30** | **FAIL** | Air-gap/VPC not built | **NEEDS-INFRA** + copy **CODE-FIXABLE** | landing, README, docs | Soften; roadmap wording | Diff review |

---

## 3. Dimension 6 — V2-21 RLS failure classification

**Source:** `docs/v2/go-no-go.md` (2026-09-24).

### Quoted failure

> `bun run test:rls` → `Invalid login credentials`

> **Test tenants:** Demo accounts used by `test:rls` **do not authenticate** on target (`Invalid login credentials`). Seeded test tenants were **not** created/removed this pass — isolation prerequisite failed first.

> **P0 finding GNG-SEC-01:** Cannot prove isolation … until demo (or dedicated) accounts exist and `test:rls` / `test:tenancy` / `test:cross-workspace` pass.

### Classification

**(a) Environment / setup** — not (b) a proven policy leak.

The suite never reached assertions such as:

```text
User A can SELECT user B's board (RLS leak)
User A can SELECT user B's ai_use_case (RLS leak)
```

(`tests/rls-isolation.e2e.ts` lines ~72–79.)

**Therefore Step 1 “only if policy leak” does not trigger for ER-C-01.**  
ER-C-01 remains **NEEDS-HUMAN**: seed credentials on TEST project and re-run.

### Separate CODE-FIXABLE policy debt (not the V2-21 failure)

`docs/migration/full-schema.sql` still shows historical:

- `"Anyone log view|download|integration event" … WITH CHECK (true)` **and** later `"Log own …"` replacements in recovered migrations — live DB may still need a single additive cleanup migration.
- `"Admins manage roles"` on `user_roles` uses `has_role(..., 'admin')`, **not** super_admin-only.

Additive migration may still be written for owner apply-to-TEST — **without claiming dim 6 PASS**.

---

## 4. Existing implementations (reuse — do not duplicate)

| Concern | Found | Action |
| ------- | ----- | ------ |
| Liveness/readiness | **Absent on current tree**; present in **PR #76** as `src/routes/api/public/health.ts`, `ready.ts`, `src/lib/ops/control-plane/*` | **Reuse via merge #76** — do not recreate |
| Control-plane logging / correlation | PR #76 | Merge |
| SSR error wrapper | `src/server.ts` + `src/lib/error-page.ts` + `src/lib/error-capture` | **Extend** (request id, no stack to client) |
| Redaction | `src/lib/telemetry/events.ts` (`redactRecord`) | **Reuse** in logging/error paths |
| Restore drill | `scripts/ops/restore-drill.mjs`, `src/lib/ops/recovery-drill.ts`, `docs/release/backup-restore-drill-2026-08-11.md` | **Extend** under `scripts/recovery/` + runbook; refuse prod ref |
| CI | Current `ci.yml` (lint/type/build/unit/playwright); richer gates in **#37/#77** | **Merge**, don’t fork |
| Client secrets check | **PR #40** `scripts/check-client-secrets.mjs` | Merge #40; don’t rewrite |
| Gitleaks helpers | **PR #34** `scripts/audit/summarize-gitleaks.mjs` | Merge #34 |
| github-settings.md | In **#34/#37**, **missing on current tree** | Add aligned checklist without contradicting those PRs |
| Cron auth | `src/lib/cron-auth.server.ts` | Reuse |
| Policy packs / compliance readiness | Local WIP on prior branch | Carry carefully onto fix branch if desired; not required to close FAILs |
| Landing “sovereign” claims | `src/routes/index.tsx` §Sovereign AI | Soften |

---

## 5. CODE-FIXABLE execution scope (this PR only)

1. Correct enterprise-readiness-report scorecard totals (7 FAIL / 22 PWC).
2. Soften unsupported UAE/KSA/sovereign/VPC/on-prem marketing claims (dims 27/28/30).
3. Recovery: `scripts/recovery/*` + `docs/runbooks/recovery-drill.md` (written, not run); ER-C-02 stays **NEEDS-HUMAN**.
4. Observability **without** duplicating #76: request-id on error page; redaction unit test; structured log helper reusing `redactRecord`.
5. CI/docs: create/update `docs/process/github-settings.md` + Lovable “publish only from green main” checklist; fix lint/type errors found; **do not** re-implement #37/#77 workflows.
6. Optional additive RLS migration + rollback doc for user_roles / telemetry insert policies (policy debt) — **not** a claim that dim 6 is PASS; owner applies to TEST.
7. Bug sweep: typecheck/lint/unit/build; client bundle secret scan; `git ls-files` for `.env`.
8. Re-score report honestly (NOT TESTED / NEEDS-HUMAN / NEEDS-INFRA preserved).

### Explicitly out of scope (owner / merge)

- Merge #34, #37, #40, #76, #77  
- Seed demo users; run live RLS  
- Run recovery drill against TEST  
- Build UAE/KSA regional infra or air-gap  

---

## 6. Stop point

STEP 0 complete. Implementation continues **only** for rows marked **CODE-FIXABLE** above.
