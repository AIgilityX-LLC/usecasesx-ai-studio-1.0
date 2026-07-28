# UseCasesX™

**Global AI Use Case Repository, AI Opportunity Map and AI Use Case Studio™.**
Part of the SovereignX AI Suite by AIgilityX.

Target release: **Lite + Pro Founding Access on 14 August 2026**. Pro Founding Access is complimentary through **31 December 2026**, subject to fair-use limits. Enterprise is architecture-ready and initially sold through paid Enterprise Design Partner engagements.

## Core journey

Discover → Capture Opportunity → Design → Score → Prioritize → Portfolio → Roadmap → Export → Advisory.

## Stack

TanStack Start v1 (React 19, Vite 7) · Tailwind v4 · shadcn/Radix · TanStack Query · Lovable Cloud (Supabase) backend · Cloudflare Workers runtime.

## Getting started

```bash
bun install
bun run dev          # local dev server
bun run build        # production build (verifies route tree)
bun run lint         # eslint
bun run test:e2e     # Playwright end-to-end
bun run test:rls     # RLS isolation checks
```

See `CLAUDE.md` for the full command matrix and repository layout.

## Documentation

**Engineering standard**

- [`AGENTS.md`](./AGENTS.md) — engineering contract for Lovable, Claude, Codex and humans.
- [`CLAUDE.md`](./CLAUDE.md) — repository layout, commands, high-risk files.

**Product & release**

- [`docs/product/release-2026-08-14.md`](./docs/product/release-2026-08-14.md) — launch scope, deferred scope, roles, success metrics.

**Architecture & security**

- [`docs/architecture/architecture-principles.md`](./docs/architecture/architecture-principles.md) — modular monolith principles.
- [`docs/security/security-baseline.md`](./docs/security/security-baseline.md) — RLS, secrets, server boundaries, audit.

**Pre-beta QA**

- [`docs/PRE_BETA_RELEASE_CHECKLIST.md`](./docs/PRE_BETA_RELEASE_CHECKLIST.md)
- [`docs/PRE_BETA_TEST_PLAN.md`](./docs/PRE_BETA_TEST_PLAN.md)
- [`docs/UI-NAVIGATION-MAP.md`](./docs/UI-NAVIGATION-MAP.md)

## Contributing

Read `AGENTS.md` and `CLAUDE.md` before making changes. Non-negotiable guardrails:

- One codebase for Lite/Pro/Enterprise — differentiate through entitlements and feature flags.
- RLS + explicit `GRANT`s on every new `public` table, in the same migration.
- No secrets in browser code, logs, or public config.
- No dead nav, no placeholder production data, no UI claiming deferred Enterprise features are live.
- Preserve accessibility, responsive behavior and loading/empty/error/role-based states.
