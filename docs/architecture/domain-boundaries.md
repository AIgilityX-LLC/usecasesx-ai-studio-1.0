# Domain Boundaries — UseCasesX™

Status: active (introduced 27 Jul 2026; Phase 5 modular-monolith alignment 28 Oct 2026).  
Companions: `docs/architecture/architecture-principles.md`, `docs/architecture/modular-monolith.md`.

## Why

Launch-critical surfaces were calling the browser Supabase client directly and
re-implementing the same three things per call-site: "am I signed in", "is this
mine", and "what do I show the user when it fails". That duplication is the main
regression risk. Phase 5 adds a **modular monolith** catalogue so those seams
stay named without a microservices split.

## Layering

```text
route / component        UI state, gating via useAuthz / RequirePlan
        │
        ▼
hook (react-query)       caching, invalidation, optimistic surface
        │
        ▼
API / BFF                createServerFn + /api/public/* (thin)
        │
        ▼
Application services     Identity, Studio, Use Cases, Scoring, Portfolio, …
        │                  (owned paths in src/lib/modules/catalogue.ts)
        ▼
Domain / Policy / Rules  src/lib/domain/* + authz + lifecycle + fair-use
        │
        ▼
Adapters                 Supabase / storage / AI gateway
        │
        ▼
Postgres RLS             the security boundary; never trusted to be bypassed
```

## Application services (Phase 5)

| Service | Catalogue id | Typical ownership |
| ------- | ------------ | ----------------- |
| Identity & Tenant | `identity_tenant` | `authz/`, workspace + organization fns, enterprise policy |
| Discovery Studio | `discovery_studio` | repository services, studio wizard/repos |
| Use Case Management | `use_case_management` | boards, drafts, deliverables, lifecycle |
| Scoring Engine | `scoring_engine` | `src/lib/scoring*` |
| Portfolio Management | `portfolio_management` | `portfolio/`, portfolio repositories |
| Value Management | `value_management` | `src/lib/value/` |
| KPI / Benefit Tracking | `kpi_benefit_tracking` | benefits + evidence repositories |
| Workflow & Approvals | `workflow_approvals` | `gates/`, governance, handoffs |
| Collaboration | `collaboration` | collab + workshops |
| AI Matching | `ai_matching` | `src/lib/ai/`, AI server fns |
| Reporting | `reporting` | `reports/`, roadmap export |
| Integrations | `integrations` | `routes/api/public/*`, `lib/api/` |
| Audit | `audit` | telemetry, observability, lifecycle audit |

Full path lists and `dependsOn` edges: `src/lib/modules/catalogue.ts`.

## Domain kernel modules

| Module                                         | Owns                                                                                   |
| ---------------------------------------------- | -------------------------------------------------------------------------------------- |
| `src/lib/domain/errors.ts`                     | `DomainError`, Postgres/PostgREST code classification, `toUserMessage`, `unwrapResult` |
| `src/lib/domain/ownership.ts`                  | `requireUserId`, `assertOwned`, `assertInWorkspace`                                    |
| `src/lib/domain/validation.ts`                 | Zod schemas for saved use cases, scores, portfolios, reports; `parseInput`             |
| `src/lib/domain/saved-use-cases.repository.ts` | `saved_use_cases`, `use_case_scores`, slug→id resolution                               |
| `src/lib/domain/portfolios.repository.ts`      | `portfolios`, `portfolio_items`                                                        |

Existing modules keep their boundaries: `src/lib/usecasex.services.ts` (public
repository reads), `src/lib/*.functions.ts` (BFF wrappers), `src/lib/authz/*`
(entitlements / policy).

## Rules

1. Components never import the Supabase client for launch-critical writes; they
   go through a hook that calls a domain repository or server fn.
2. Every mutation validates with a schema from `validation.ts` (or the owning
   module’s schema) before touching the database.
3. Every failure surfaces `DomainError.userMessage`. Raw Postgres text — which
   can name tables and policies — must never reach the UI.
4. Ownership checks in the client are defence in depth. RLS stays authoritative.
5. Cross-application-service imports should use catalogue entry points; do not
   reach into another module’s internals. Prefer declaring new `dependsOn` edges
   intentionally.
6. **No microservices split** for these domains without a new ADR.

## Post-launch extraction candidates

| Candidate                                                       | Note                                                                 |
| --------------------------------------------------------------- | -------------------------------------------------------------------- |
| `usecasex.admin.ts` (14 direct calls)                           | Admin repository + server functions; highest remaining concentration |
| `_app.administration.tsx` (10 direct calls)                     | Move reads into an admin service before any Enterprise role work     |
| `_app.studio.use-case.$id.*` blueprint / feasibility / advisorx | A `studio` repository once the deliverables workspace stabilises     |
| `_app.boards.collections.tsx`, `AddToCollectionButton.tsx`      | Collections repository (server functions already partially exist)    |
| Reports                                                         | `generated_reports` repository once export formats freeze            |

These are intentionally **not** mass-refactored in Phase 5: selective means
catalogue + rules first; move code when coverage protects behaviour.
