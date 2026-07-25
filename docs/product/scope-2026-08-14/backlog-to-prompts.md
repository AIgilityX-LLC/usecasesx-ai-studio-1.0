# Backlog → Prompt / Phase Mapping

Aligned with `../20-day-release-board.md`. Each prompt is one bounded change with its own DoD.

## Phase 1 — Foundations (26–30 Jul)

| Prompt | Backlog | Exit |
|---|---|---|
| PROMPT-10 | P0-4, P0-5, P0-9 (mobile overflow, `/repository` labels + populate, `/auth` labels) | axe critical = 0 on `/`, `/repository`, `/auth`; no overflow at 390px |
| PROMPT-11 | P0-8 (DB Phase A1 additive `WITH CHECK` tightening) | `test:rls` green; anon cannot forge identity |
| PROMPT-12 | P0-3 (delist Feasibility / Data-Readiness / Blueprint from sidebar) | `check:nav-integrity` green |
| PROMPT-13 | P0-6, P0-7 (lock `/entitlement` + gate `/module-analytics`) | Non-admin cannot reach either route |

**Gate 30 Jul:** foundations freeze.

## Phase 2 — Data truth (31 Jul–3 Aug)

| Prompt | Backlog | Exit |
|---|---|---|
| PROMPT-14 | P0-1 `/my-use-cases` mock → live | Zero `MOCK_USE_CASES` imports on this route |
| PROMPT-15 | P0-2 `/reports` mock → live | Zero `MOCK_USE_CASES` imports on this route |
| PROMPT-16 | P0-10 `/dashboard` live KPIs | All numbers derived from live queries |
| PROMPT-17 | P1-8 sample-data disclaimer sweep | Every sample UI carries disclaimer |

**Gate 3 Aug:** core journey freeze — all P0 done.

## Phase 3 — Core journey (4–9 Aug)

| Prompt | Backlog | Exit |
|---|---|---|
| PROMPT-18 | P1-1 Studio server-persisted drafts | Draft survives device change |
| PROMPT-19 | P1-2 per-use-case Feasibility wired | Form persists + summary card |
| PROMPT-20 | P1-3 per-use-case Data Readiness wired | Form persists + summary card |
| PROMPT-21 | P1-4 Portfolio Roadmap live | Empty/loading/error states pass |
| PROMPT-22 | P1-5 Deliverables — one export path per type | ≥ 1 real export completes |

**Gate 9 Aug:** feature freeze.

## Phase 4 — Polish + fair-use (10–12 Aug)

| Prompt | Backlog | Exit |
|---|---|---|
| PROMPT-23 | P1-10 fair-use advisory meter | Meter renders per Pro user |
| PROMPT-24 | P1-11 activation event logging | 8 events fire end-to-end |
| PROMPT-25 | P1-9 SEO/head sweep | All content routes unique + within limits |
| PROMPT-26 | Playwright launch specs + axe | All launch routes pass |
| PROMPT-27 | RLS test pass | `bun run test:rls` green |

**Gate 12 Aug:** QA freeze.

## Phase 5 — Freeze + launch (13–14 Aug)

| Prompt | Backlog | Exit |
|---|---|---|
| PROMPT-28 | Code-freeze verification | No `src/` diff after this prompt |
| PROMPT-29 | Production smoke `bun run test:smoke` | All checks green |
| PROMPT-30 | Publish | Live at production URL |

**Launch 14 Aug 2026.**
