# Architecture — UseCasesX™

One-screen map of the modular monolith. Detail lives under `docs/architecture/` and `docs/v2/`.

## Stack

| Layer | Choice |
| ----- | ------ |
| App | TanStack Start v1 (React 19, Vite 7), Cloudflare Workers SSR |
| UI | Tailwind CSS v4 + shadcn/Radix |
| Data / auth | Lovable Cloud (Postgres + Auth + Storage); RLS mandatory |
| AI | Provider-neutral server gateway (`src/lib/ai/*`) — no provider secrets in the browser |
| Package manager | Bun |

## Shape

```
Browser ──► TanStack routes / createServerFn ──► Postgres (RLS)
                 │
                 ├── AI gateway (server-only)
                 ├── Storage (signed URLs)
                 └── Public HTTP under src/routes/api/public/* (signature-verified)
```

**One codebase** for Lite / Pro / Enterprise. Differentiation is entitlements + feature flags — never forks.

## Domain modules

Identity/access · Organization/workspaces · Repository · Opportunities · Studio · Scoring · Portfolios · Opportunity Map · Roadmap · Value · Workshops · Reporting · AI services · Integrations · Administration · Audit · Observability.

## Canonical pointers

| Topic | Document |
| ----- | -------- |
| Engineering contract | `AGENTS.md` |
| Repo layout & commands | `CLAUDE.md` |
| Principles | `docs/architecture/architecture-principles.md` |
| Domain boundaries | `docs/architecture/domain-boundaries.md` |
| AI boundary | `docs/architecture/ai-boundary.md` |
| Tenancy / RLS | `docs/architecture/tenancy-rls-design.md` |
| Security floor | `docs/security/security-baseline.md` |
| Recorded decisions | `docs/v2/architecture-decisions.md`, `docs/adr/` |
| Sovereignty seams | `docs/v2/sovereignty-abstractions.md` |
| Data dictionary | `docs/v2/data-dictionary.md` |
| Threat model | `THREAT_MODEL.md` |

## Non-negotiables (summary)

1. Tenant/workspace ownership on every tenant row; RLS + grants in the same migration.
2. Roles only in `user_roles`; checks via `has_role` / entitlements helpers — never on `profiles`.
3. Navigation registry: `src/lib/navigation/enterprise-nav.ts`. Permissions vocabulary: `src/lib/authz/scoped-permissions.ts`.
4. Agents never push to `main`. Humans approve PRs after independent review.
