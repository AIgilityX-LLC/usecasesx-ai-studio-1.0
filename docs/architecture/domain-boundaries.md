# Domain Boundaries — UseCasesX™

Status: active (introduced 27 Jul 2026). Companion to `docs/architecture/architecture-principles.md`.

## Why

Launch-critical surfaces were calling the browser Supabase client directly and
re-implementing the same three things per call-site: "am I signed in", "is this
mine", and "what do I show the user when it fails". That duplication is the main
regression risk before 14 Aug 2026.

## Layering

```text
route / component        UI state, gating via useAuthz / RequirePlan
        │
        ▼
hook (react-query)       caching, invalidation, optimistic surface
        │
        ▼
src/lib/domain/*         validation → ownership → repository → error mapping
        │
        ▼
Supabase (RLS)           the security boundary; never trusted to be bypassed
```

## Modules

| Module                                         | Owns                                                                                   |
| ---------------------------------------------- | -------------------------------------------------------------------------------------- |
| `src/lib/domain/errors.ts`                     | `DomainError`, Postgres/PostgREST code classification, `toUserMessage`, `unwrapResult` |
| `src/lib/domain/ownership.ts`                  | `requireUserId`, `assertOwned`, `assertInWorkspace`                                    |
| `src/lib/domain/validation.ts`                 | Zod schemas for saved use cases, scores, portfolios, reports; `parseInput`             |
| `src/lib/domain/saved-use-cases.repository.ts` | `saved_use_cases`, `use_case_scores`, slug→id resolution                               |
| `src/lib/domain/portfolios.repository.ts`      | `portfolios`, `portfolio_items`                                                        |

Existing modules keep their boundaries: `src/lib/usecasex.services.ts` (public
repository reads), `src/lib/boards.functions.ts` and `src/lib/*.functions.ts`
(server functions), `src/lib/authz/*` (entitlements).

## Rules

1. Components never import the Supabase client for launch-critical writes; they
   go through a hook that calls a domain repository.
2. Every mutation validates with a schema from `validation.ts` before touching
   the database.
3. Every failure surfaces `DomainError.userMessage`. Raw Postgres text — which
   can name tables and policies — must never reach the UI.
4. Ownership checks in the client are defence in depth. RLS stays authoritative.

## Post-launch extraction candidates

| Candidate                                                       | Note                                                                 |
| --------------------------------------------------------------- | -------------------------------------------------------------------- |
| `usecasex.admin.ts` (14 direct calls)                           | Admin repository + server functions; highest remaining concentration |
| `_app.administration.tsx` (10 direct calls)                     | Move reads into an admin service before any Enterprise role work     |
| `_app.studio.use-case.$id.*` blueprint / feasibility / advisorx | A `studio` repository once the deliverables workspace stabilises     |
| `_app.boards.collections.tsx`, `AddToCollectionButton.tsx`      | Collections repository (server functions already partially exist)    |
| Reports                                                         | `generated_reports` repository once export formats freeze            |

These are intentionally **not** refactored now: they are not on the critical
Discover → … → Advisory path or they lack test coverage to protect behaviour.
