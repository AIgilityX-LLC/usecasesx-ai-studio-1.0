# UseCasesX™ Handover & Pro-Launch Playbook

Audience: the development team taking ownership of this codebase to refactor it with Claude Code,
finish the remaining Pro features, and launch on **Vercel (frontend) + Railway (API) + Supabase
(database)**.

## Target architecture decision (already made)

- **Frontend**: full rewrite to **Next.js App Router**, deployed on **Vercel**.
- **Backend**: new standalone **HTTP API service** on **Railway**.
- **Database / Auth / Storage**: **Supabase** (unchanged, migrated forward additively).

The current app is a TanStack Start v1 modular monolith running SSR + server functions on Cloudflare
Workers. It is feature-rich and production-shaped, but it is one deployable. The rewrite splits it.

## How to read this playbook

| # | Document | Use it for |
|---|---|---|
| 01 | `01-current-state.md` | What exists today, what to port, what to drop |
| 02 | `02-target-architecture.md` | The system you are building |
| 03 | `03-repo-and-tooling.md` | Monorepo, CI, environments |
| 04 | `04-claude-code-guide.md` | How to drive Claude Code safely on this codebase |
| 05 | `05-migration-phases.md` | The execution order (P0→P5) with exit criteria |
| 06 | `06-route-map.md` | Every route → Next.js path, render mode, gate |
| 07 | `07-pro-launch-features.md` | Billing, email, auth/SSO, launch blockers |
| 08 | `08-database-and-data.md` | Schema, migrations, RLS, data policy |
| 09 | `09-security-and-compliance.md` | Threat model and non-regression commitments |
| 10 | `10-testing-and-dod.md` | Test strategy and Definition of Done |
| 11 | `11-deployment-runbook.md` | Vercel + Railway + Supabase operations |
| 12 | `12-claude-prompts.md` | Copy-paste prompt library keyed to phases |
| 13 | `13-timeline-and-risks.md` | Sequencing, staffing, risk register |

## Roles

- **Tech lead** — owns 02, 03, 05; approves every migration and every architectural deviation.
- **Backend engineer(s)** — own P1 (Railway API), 08, and billing/email workstreams.
- **Frontend engineer(s)** — own P2/P3 (Next.js), 06, and entitlement UI.
- **QA / release owner** — owns 10, 11, and the launch-blocker list in 07.
- **Product owner** — owns edition scope, pricing, and the pilot/evidence decision.

## Non-negotiables carried over from the current standard

1. Every row of tenant data carries workspace/org ownership; **RLS stays enabled** and remains the
   authoritative boundary even after an API service sits in front of it.
2. Roles live **only** in `user_roles`, checked through the `has_role()` security-definer function.
   Never on `profiles`.
3. **One codebase** for Lite / Pro / Enterprise. Differentiate with entitlements and feature flags.
4. **Additive migrations** by default. Destructive change requires a staged plan plus rollback.
5. The service-role key never leaves the Railway service. It never reaches Vercel, the browser, logs,
   or screenshots.
6. Governance-relevant actions emit **append-only** audit events.

## Glossary

- **Edition** — Lite (public discovery), Pro (registered professional), Enterprise (entitlement-gated).
- **Core journey** — Discover → Capture Opportunity → Design → Score → Prioritize → Portfolio →
  Roadmap → Export → Advisory. This must stay intact end to end at every phase boundary.
- **Entitlement** — a capability grant resolved from plan + role + flags, never an inline plan check.
- **Studio** — the AI Use Case Studio™ authoring surface.
- **SPVC** — Sovereign Public Value Canvas™, the public-sector workshop instrument.
