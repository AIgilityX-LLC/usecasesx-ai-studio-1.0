# 13 — Timeline, Staffing, and Risk Register

## Assumed team

| Role | FTE | Focus |
|---|---|---|
| Tech lead | 1.0 | architecture, migrations, reviews, cutover |
| Senior full-stack (API) | 1.0 | Railway service, contracts, abuse shield, billing |
| Senior full-stack (web) | 1.0 | Next.js shell, journey parity, design system |
| Full-stack | 1.0 | journey parity, admin console |
| QA / automation | 0.5 | Playwright stabilisation, RLS suites, release gates |
| Product / launch owner | 0.5 | scope control, pilot, waivers, comms |

At this staffing, **12–14 weeks** to a Pro launch. With two engineers, expect 20–24 weeks; the phases
serialise and parity work dominates.

## Schedule

| Phase | Weeks | Parallelisable | Gate to exit |
|---|---|---|---|
| P0 scaffold + domain extraction | 1–2 | tooling ∥ domain extraction | clean build, ported test parity, boundary rules green |
| P1 API service | 3–5 | resources split across engineers | all legacy server fns mapped, RLS + abuse suites green |
| P2 Web shell | 4–6 | overlaps P1 from week 4 | auth + shell + metadata green on preview |
| P3 Journey parity | 6–10 | surface per engineer | full core journey end-to-end on preview, P0 suite green |
| P4 Admin + Pro features | 9–13 | billing ∥ email ∥ auth ∥ blockers | paid lifecycle works, live email evidence, MFA + one IdP |
| P5 Cutover | 13–14 | serial | `verify-launch` all-pass on the canonical host |

P2 starts before P1 finishes: the shell only needs `/v1/me` and the public endpoints.
P4's four workstreams are genuinely independent — assign one owner each.

## Milestones

| # | Milestone | Week |
|---|---|---|
| M1 | Monorepo green from a clean clone; domain logic extracted with test parity | 2 |
| M2 | API deployed to Railway; public catalogue served from it | 5 |
| M3 | Web shell on Vercel; sign-in → shell → sign-out works | 6 |
| M4 | Core journey parity complete on preview | 10 |
| M5 | Billing, email, MFA + SSO complete; all 36 browser failures resolved | 13 |
| M6 | Canonical host live; launch verification all-pass | 14 |

## Risk register

| # | Risk | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|---|
| R1 | Parity drift — the rewrite quietly changes behaviour across 115 routes | High | High | Port tests before implementation; per-surface parity specs; "report, don't silently change" rule in every prompt | Tech lead |
| R2 | Scope creep — the rewrite becomes a redesign | High | High | P3 is parity only. New features are P4 or deferred register. Reject design changes in parity PRs | Product |
| R3 | RLS regression once the API can bypass policies with service-role | Medium | Critical | Service-role only in `apps/api`, only after a role check; RLS tests run against the DB directly; CI grep for the key name outside `apps/api` | Tech lead |
| R4 | Cross-origin auth friction (CORS, token handling, preview URLs) | Medium | Medium | Bearer tokens not cookies; same-origin proxy route for the authenticated app; explicit origin allow-list per environment | API engineer |
| R5 | The 36 browser failures stay unresolved and block the gate again | High | High | Fix the runner first as its own workstream (P4.9); classify every failure; zero quarantined P0 specs | QA |
| R6 | Email deliverability unproven; sender domain not provisioned | Medium | High | Provision `notify.aigilityx.com` early in P4; SPF/DKIM/DMARC verified; live-inbox evidence attached | Tech lead |
| R7 | Stripe edge cases (proration, seat changes, dunning, complimentary tier) | Medium | High | Entitlement matrix unit tests; `stripe listen` webhook e2e; full test-mode lifecycle before launch | API engineer |
| R8 | Migration divergence between preview, staging, and production | Medium | High | One migration source of truth in `packages/db`; ordered application preview → staging → production by the tech lead only | Tech lead |
| R9 | Runbook owners still unrecorded | High | High | Blocking checklist item; launch cannot proceed without seven named owners and backups | Launch owner |
| R10 | Canonical host not connected; SEO and analytics unverified | Medium | High | Connect the domain in P5 step 4; `verify-launch` asserts canonical, sitemap, OG, and headers | Tech lead |
| R11 | Demo accounts with platform roles reach production | Medium | Critical | Audited remediation; production-data audit must return zero findings as a gate | Data owner |
| R12 | Pilot evidence gap (0 participants, no waiver) | High | Medium | Either enrol 15–25 seats with checkpoint evidence, or record a signed waiver naming the accepted risk | Product |
| R13 | Single AI provider outage | Low | Medium | Accepted: every AI surface is assistive and degrades to manual entry; add a second provider behind the gateway post-launch | Tech lead |
| R14 | Restore is not self-serve | Low | Critical | Documented platform support path; quarterly restore drill with recorded time and owner | Data owner |
| R15 | Cold-start or latency regression from the extra network hop | Medium | Medium | 2+ Railway replicas, region-matched to Supabase; ISR/static for public pages; p95 budgets in CI | API engineer |
| R16 | Claude Code violates an invariant at scale | Medium | High | `CLAUDE.md` contract, lint-enforced boundaries, migration linter, contract-drift check, ≤15-file PRs, human review of all SQL | Tech lead |

## Deferred to post-launch (record, don't build)

SCIM deprovisioning · second AI provider · self-serve restore · advanced Enterprise roles beyond the
five launch roles · marketing email · native mobile · real-time collaborative editing · public API keys
for customer integrations · SOC 2 evidence automation.

## Go / No-Go checklist (final gate)

- [ ] Full unit suite green; count ≥ previous release.
- [ ] P0 Playwright suite green **authenticated** against staging and production.
- [ ] RLS isolation and cross-workspace abuse suites green.
- [ ] Migration linter green; no unrecorded destructive SQL.
- [ ] Production-data audit: zero findings.
- [ ] Production-readiness probe: all green.
- [ ] Security checklist complete; no open critical findings.
- [ ] `verify-launch` all-pass against `https://usecasesx.aigilityx.com`.
- [ ] Live sign-up, password-reset, and invitation emails delivered with DKIM pass.
- [ ] Stripe test-mode lifecycle verified end to end.
- [ ] Seven runbook owners recorded by name, with backups.
- [ ] Rollback rehearsed; legacy deployment warm; DNS TTL 300 s.
