# Phase 0 — Current State (T=0 Baseline)

**Date:** 26 July 2026
**Scope:** Read-only consolidation of all Phase 0 audit findings executed 25–26 Jul.
**Purpose:** Anchor point for Phase 1–5 work. No source, schema, policy or config was modified during Phase 0.

---

## 1. Product & release anchor

- **Product:** UseCasesX™ — Global AI Use Case Repository, AI Opportunity Map, AI Use Case Studio™.
- **Editions:** Lite (public) · Pro Founding Access (complimentary through 31 Dec 2026) · Enterprise Design Partner (contact-us).
- **Launch:** 14 Aug 2026. Core journey Discover → Capture → Design → Score → Prioritize → Portfolio → Roadmap → Export → Advisory.
- **Architecture:** TanStack Start v1 modular monolith on Cloudflare Workers with Lovable Cloud (Supabase) backend.

## 2. Source artifacts consolidated

| Area                 | Path                                                                                                                                                    | Summary                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Engineering contract | `AGENTS.md`, `CLAUDE.md`                                                                                                                                | Standards, DoD, high-risk files                                 |
| Product              | `docs/product/release-2026-08-14.md`, `docs/product/20-day-release-board.md`, `docs/product/scope-2026-08-14/*`                                         | Scope, board, edition matrix, fair-use, deferred register       |
| Baseline             | `docs/baseline/README.md`, `schema-tables.md`, `schema-policies.md`, `schema-functions.md`, `migrations-head.md`, `env-inventory.md`, `build-signal.md` | 53 tables, RLS-enabled, head `20260725094800_9af904b9…`         |
| Route audit          | `docs/audit/2026-07-25/route-inventory.md`                                                                                                              | 20 prod · 17 incomplete · 5 stub · 5 redirect · 6 orphan        |
| Journey audit        | `docs/audit/2026-07-25/feature-journey-map.md`                                                                                                          | Discover/Capture ~80–90%; Score/Portfolio/Roadmap 0–60%         |
| Retain/repair/defer  | `docs/audit/2026-07-25/retain-repair-defer-matrix.md`                                                                                                   | Per-route decisions                                             |
| Dead & duplicate     | `docs/audit/2026-07-25/dead-and-duplicate.md`                                                                                                           | Component dup, localStorage-only Studio drafts                  |
| Top risks            | `docs/audit/2026-07-25/top-risks.md`                                                                                                                    | Mock data on Pro = Sev-1                                        |
| DB audit             | `docs/audit/2026-07-25/database/*`                                                                                                                      | 53 tables all RLS; 7/25 ownership FKs; anon-INSERT forgery risk |
| UX/a11y              | `docs/audit/2026-07-25/ux/*`                                                                                                                            | Mobile home overflow; `/repository` empty; `/auth` label gaps   |
| Architecture         | `docs/architecture/2026-07-25/*`                                                                                                                        | Leaky boundaries; 20-item debt register; Phase A refactor plan  |

## 3. Confirmed baseline state

- **Migrations head:** `20260725094800_9af904b9_add_missing_indexes_and_view`.
- **Public schema:** 53 tables, 1 view, 16 routines, 29 triggers, 38 FKs. RLS enabled on all 53 tables.
- **Roles:** stored in `user_roles` with `has_role()` SECURITY DEFINER (compliant with §user-roles rule).
- **Auto-generated files (do not edit):** `src/routeTree.gen.ts`, `src/integrations/supabase/{client,client.server,auth-middleware,auth-attacher,types}.ts`, `.env`, `supabase/config.toml`.
- **Publish state:** not published; preview URL only.

## 4. Findings classification (rolled up)

| Bucket           | Count      | Notes                                                                                                                                                                                                                                                                                       |
| ---------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ship as-is       | ~20 routes | Discover, Repository browse, ROI calc, Quick Wins, submission, auth, pricing, landing                                                                                                                                                                                                       |
| Repair (P0)      | 10 items   | Mock→live on `/my-use-cases`, `/reports`, `/dashboard`; `/repository` labels + populate; mobile overflow; `/auth` labels; RLS `WITH CHECK` tighten; `/entitlement` lock; `/module-analytics` role gate; sidebar delisting                                                                   |
| Required (P1)    | 12 items   | Studio server-persisted drafts, per-use-case Feasibility/Data Readiness wiring, Portfolio Roadmap, one export path, fair-use meter, activation events, SEO head sweep, sample-data disclaimer sweep, unify `RequirePlan`, nav-source consolidation, Coming Soon flags on SARPI/AdvisorX/C3G |
| Post-launch (P2) | 7 items    | Placeholder routes hidden, Blueprint editor, primitive consolidation, terminology unify, fair-use hard enforcement, advanced Enterprise roles, share advanced flows                                                                                                                         |
| Deferred (D)     | 13 items   | See `docs/product/scope-2026-08-14/deferred-register.md`                                                                                                                                                                                                                                    |

**No work remains unclassified.** All 64 routes and 20 debt items are placed in one of the buckets above.

## 5. Phase 1 prerequisites (explicit)

Phase 1 (30 Jul foundations freeze) cannot start until:

1. This document is committed and referenced from the release board decision log.
2. `docs/product/edition-capability-matrix.md` and `docs/architecture/data-migration-plan.md` exist.
3. `docs/testing/launch-acceptance-matrix.md` exists so Phase 1 exits can be measured.
4. `bun run lint`, `tsgo`, `bun run build`, `bun run check:nav-integrity` recorded green in `docs/baseline/build-signal.md`.
5. Owners assigned on P0 rows in `docs/product/20-day-release-board.md`.

## 6. Behavior comparison

Docs-only turn. No source, schema, policy, or config changed. Build and runtime behavior are identical to the T=0 baseline captured in `docs/baseline/`.

## 7. Open risks carried into Phase 1

- R-03 (RLS gap on tenant table), R-06 (mid-flight destructive migration), R-07 (Worker-runtime export libs), R-10 (late a11y criticals). See `docs/product/20-day-release-board.md` §7.1.

## 8. Rollback

Docs-only. Deleting `docs/audits/phase-0-current-state.md` reverts.
