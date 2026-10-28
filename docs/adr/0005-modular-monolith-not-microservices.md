# ADR 0005 — Modular monolith, not microservices

- **Status:** Accepted (Phase 5 — 2026-10-28)
- **Deciders:** Engineering (UseCasesX control plane)
- **Related:** `docs/architecture/modular-monolith.md`, `AGENTS.md` §2, ADR-V2-002

## Context

Enterprise ambition often triggers an early jump to microservices. UseCasesX already ships as one TanStack Start app with Postgres RLS tenancy. Splitting Identity, Studio, Scoring, Portfolio, etc. into networked services would force distributed auth, cross-service transactions, and ops cost before independent scale or team topology demands it.

## Decision

Adopt a **modular monolith** with strict domain boundaries:

1. Single deployable for Lite / Pro / Enterprise.
2. Application services listed in `src/lib/modules/catalogue.ts` own explicit path prefixes and entry points.
3. Layering: Web UI → API/BFF (server fns + public routes) → Application → Domain/Policy → Adapters.
4. Dependencies only sideways (declared) or downward.
5. **Do not** introduce a microservices mesh, per-domain databases, or a second backend framework in this phase.

## Consequences

- Most benefits people chase with microservices (clear ownership, replaceable internals, testable seams) without distributed-system overhead.
- Selective restructuring: catalogue + rules first; mass file moves only when a domain is covered and stable.
- Future extraction remains possible per module once maturity is `established` and operational need is proven.
- CI may later scan imports against `isAllowedModuleDependency`; Phase 5 ships catalogue integrity unit tests only.
