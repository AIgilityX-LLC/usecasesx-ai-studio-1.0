# Architecture Map — 25 July 2026

Snapshot of the current UseCasesX™ codebase, before Phase A launch cleanup.

## Stack

- TanStack Start v1 (React 19, Vite 7) on Cloudflare Workers (`nodejs_compat`)
- Tailwind v4 tokens via `src/styles.css`; shadcn/ui + Radix
- TanStack Query + Zod (partial); `@hookform/resolvers`
- Backend: Lovable Cloud (Supabase) — auto-generated client at `src/integrations/supabase/client.ts`
- AI: Lovable AI Gateway via `src/lib/usecasex.studio.functions.ts` (single server-fn entry point)
- Bun package manager

## Layers

```
┌───────────────────────────────────────────────────────────────┐
│ Presentation                                                  │
│  src/routes/**  (60 files, ~13.5k LOC)                        │
│  src/components/** (shell, ui/, domain widgets)               │
│    · SiteShell → TopNav | AppSidebar                          │
│    · Gate wrappers: RequireRoles · RequirePlan · Can          │
│    · Stub primitives: ComingSoonGate · ModuleStub (duplicate) │
└──────────────────────────┬────────────────────────────────────┘
                           │ calls
┌──────────────────────────▼────────────────────────────────────┐
│ Domain / Application                                          │
│  src/lib/**  (39 files, ~8.6k LOC)                            │
│    · Server-fn wrappers: *.functions.ts                       │
│    · Local stores: usecasex.{studio,compare}.store.ts         │
│    · Types + scoring: usecasex.store.ts (mixed)               │
│    · Mocks: usecasex.mock.ts (still consumed in Pro)          │
│    · Entitlements/permissions/feature-flags                   │
│    · Tracking: module-analytics, usecasex.tracking            │
│    · Deliverables: deliverables{,.data,.export}.ts            │
└──────────────────────────┬────────────────────────────────────┘
                           │
┌──────────────────────────▼────────────────────────────────────┐
│ Data Access                                                   │
│  · createServerFn handlers (client-safe *.functions.ts)       │
│  · Direct supabase.* in 17 route files + 6 components (leak)  │
│  · Public API: src/routes/api/public/usecasex/*               │
└──────────────────────────┬────────────────────────────────────┘
                           │ PostgREST
┌──────────────────────────▼────────────────────────────────────┐
│ Backend (Supabase)                                            │
│  · 53 public tables with RLS                                  │
│  · user_roles + has_role() SECURITY DEFINER                   │
│  · workspace_id on: boards, collections, portfolios, workspaces│
│  · auth.uid() scoping on: saved_use_cases, use_case_scores,   │
│    feasibility_scores, data_readiness_assessments             │
│  · Auth-only writes via requireSupabaseAuth middleware        │
└───────────────────────────────────────────────────────────────┘
```

## Clean boundaries (retain as-is)

- **`src/lib/use-cases.functions.ts`** — repository reads
- **`src/lib/boards{,.functions}.ts`** — board CRUD, workspace-aware
- **`src/lib/insights.functions.ts`** — analytics reads
- **`src/lib/deliverables{,.data,.export}.ts`** — export path
- **`src/lib/usecasex.studio.functions.ts`** — the *only* AI provider surface; `LOVABLE_API_KEY` read inside `.handler()` ✅
- **`src/routes/api/public/usecasex/*`** — public read API

## Leaky boundaries

- **Local-storage domain state** — `usecasex.studio.store.ts`, `usecasex.compare.store.ts` are the sole source of truth for Studio drafts and Compare selections; not visible cross-device.
- **Mock data in Pro pages** — `_app.my-use-cases.tsx`, `_app.reports.tsx`, and `MockUseCaseCard.tsx` import `MOCK_USE_CASES` from `usecasex.mock.ts`.
- **Components with direct DB access** — `AddToCollectionButton`, `AddToStudioBoardDialog`, `DecisionHistory`, `EmailVerificationBanner`, `EntitlementLockCard`, `SiteShell` all import `@/integrations/supabase/client` and call PostgREST inline.
- **Route files with inline `supabase.*`** — 17 `_app.*.tsx` files talk directly to the DB.
- **Type + logic overload** — `src/lib/usecasex.store.ts` (264 LOC) is simultaneously the score type source, the score math, and a local store.
- **`src/lib/usecasex.services.ts` (753 LOC)** — de-facto grab-bag facade covering multiple domains.

## Cross-cutting

| Concern | Where it lives | Health |
|---|---|---|
| Auth | `useSupabaseSession`, `requireSupabaseAuth`, `attachSupabaseAuth` in `start.ts` | ✅ generated + wired |
| Roles | `user_roles` + `has_role()` + `RequireRoles` + `usecasex.roles.ts` | ✅ |
| Plans | `useEntitlement`, `usePlan`, `RequirePlan`, `Can` | ⚠️ mix of wrapper vs inline usage |
| Feature flags | `src/lib/feature-flags.ts` | ✅ used for `ComingSoonGate` decisions |
| Nav integrity | `scripts/check-nav-integrity.mjs` + `src/lib/nav-integrity.ts` + `tests/navbar.spec.ts` | ✅ enforced |
| Error capture | `src/lib/{error-capture,error-page,lovable-error-reporting}.ts` | ⚠️ per-route `errorComponent` inconsistent |
| Tracking | `usecasex.tracking.ts`, `module-analytics.ts` | ✅ centralized |
| AI | `usecasex.studio.functions.ts` | ✅ single façade |
| Audit | `audit_events` table exists | ⚠️ producers not wired |
