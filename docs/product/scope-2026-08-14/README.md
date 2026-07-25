# Release Scope Lock — Lite + Pro Founding Access

**Target launch:** 14 August 2026
**Complimentary Pro window:** through 31 December 2026
**Status:** Draft — awaiting sign-off

## Purpose

Single source of truth for what ships on 14 Aug 2026. Converts the 25 Jul audits into a locked, achievable scope. Any change after **9 Aug feature freeze** requires an entry in `../20-day-release-board.md` decision log and a PR touching this README's sign-off table and `deferred-register.md`.

## Documents in this pack

| Doc | Purpose |
|---|---|
| `edition-capability-matrix.md` | What Lite / Pro Founding Access / Enterprise Design Partner show |
| `backlog-p0-p1-p2.md` | Every audited item assigned ship/repair/simplify/flag/defer + priority |
| `outcomes-by-role.md` | One measurable completion outcome per role |
| `fair-use-policy.md` | Complimentary Pro limits through 31 Dec 2026 (policy only) |
| `metrics-and-defect-policy.md` | North-star, activation events, quality bars, P0/P1 policy, freeze gates |
| `deferred-register.md` | Append-only list of items explicitly out of launch |
| `backlog-to-prompts.md` | Backlog → Phase 1–5 prompts + dates |

## Freeze gates

- 30 Jul — Foundations freeze
- 3 Aug — Core journey freeze
- **9 Aug — Feature freeze** (no new scope)
- 12 Aug — QA freeze
- **13 Aug — Code freeze**
- 14 Aug — Launch

## Non-negotiables

- One codebase for Lite / Pro / Enterprise. No forks.
- No future Enterprise feature is presented as live.
- Additive migrations only during launch window.
- No mock data on any Pro route.
- Preserve every currently working Lite + Pro capability unless explicitly replaced here.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Product | | | |
| Engineering | | | |
| Design | | | |
| Security | | | |

## Rollback

Docs-only pack. Delete `docs/product/scope-2026-08-14/` to revert.
