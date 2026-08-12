# 10 — Testing Strategy and Definition of Done

The legacy suite is the asset that makes this rewrite survivable: **458 unit tests** plus Playwright
specs. Port them first, then build against them.

## Test pyramid

| Layer | Tool | Location | Scope |
|---|---|---|---|
| Unit — domain | Vitest | `packages/domain/**/*.test.ts` | scoring, roadmap, portfolio, opportunity map, report model, CSV contract, pagination, entitlements, permissions matrix, fair use, validation contracts |
| Unit — contracts | Vitest | `packages/contracts` | schema accept/reject cases, including boundary values |
| Integration — API | Vitest + real preview DB | `apps/api/**/*.test.ts` | handler + middleware + policy behaviour, per endpoint |
| RLS / isolation | SQL + Vitest | `packages/db/tests` | tenancy isolation, anonymous sweep, audit immutability, storage policy |
| Component | Vitest + Testing Library | `apps/web/**/*.test.tsx` | gated UI, empty/error states, form validation |
| E2E | Playwright | `e2e/**` | P0 journey, auth, admin flows, pagination boundaries, exports |
| Non-functional | Lighthouse CI, k6 | `perf/` | SEO/perf budgets, large-workspace load |

## P0 suite (must be green to ship)

1. Anonymous: home → discover → search + facet → public use-case detail → OG image + canonical.
2. Sign-up → email confirm → onboarding → workspace created.
3. Sign-in → dashboard → submit a use case → validation errors shown for a bad payload.
4. Admin: review queue → approve → published page appears publicly (ISR revalidated).
5. `My Use Cases` shows draft / reviewed / published statuses correctly.
6. Studio: create opportunity → wizard → score → add to portfolio → roadmap → export CSV + PDF.
7. Workshop: create → invite → join by token → Sovereign Public Value Canvas™ save → version history
   → multi-language export.
8. Billing: checkout (test mode) → entitlement upgrade → seat change → cancel → downgrade to read-only.
9. Cross-workspace: user B cannot read, write, export, or download user A's records (API and DB).
10. Sign-out: protected route unreachable, back button does not restore cached protected data.

## RLS testing pattern

Test against the database, not through the API, so a broken API guard cannot mask a broken policy:

```ts
const a = clientAs(userA.accessToken)
const b = clientAs(userB.accessToken)
const { data: created } = await a.from('opportunities').insert({ workspace_id: wsA, title: 'x' }).select().single()
const { data: leaked } = await b.from('opportunities').select('*').eq('id', created.id)
expect(leaked).toEqual([])                                    // read denied
expect((await b.from('opportunities').update({ title: 'y' }).eq('id', created.id)).count).toBe(0)
expect((await anon.from('opportunities').select('*')).data).toEqual([])
```

Every new table gets this pattern before the feature PR merges.

## Fixing the 36 browser failures

The current blocker is partly a runner problem, partly real defects. Sequence:

1. Stabilise the runner in CI: pinned Playwright version, containerised browsers, one worker for
   auth-dependent specs, explicit `webServer` readiness checks, no `sleep`-based waits.
2. Provision a dedicated QA account per environment with seeded deterministic data
   (port `tests/fixtures/deterministic.ts` and `workspace.ts`).
3. Re-run and classify each failure: infrastructure, selector drift, or real defect.
4. Fix every P0-journey failure. Quarantine the rest **only** with a ticket, named owner, and date;
   quarantine count must be zero for P0 specs.
5. Replace brittle selectors with roles and `aria-label`. No text-content selectors on dynamic copy.

## Performance budgets

| Metric | Target |
|---|---|
| Public page LCP (mobile, p75) | < 2.5 s |
| Core-journey route load p95 | < 2 s |
| API p95 (read endpoints, seeded) | < 400 ms |
| API p95 (search with facets) | < 800 ms |
| Lighthouse SEO / a11y (public pages) | 100 / ≥ 95 |
| Large-workspace simulation | 5 000 use cases, 50 portfolios, 200 members — no query > 1 s |

## Accessibility

WCAG 2.1 AA. Per-PR: keyboard reachable, visible focus ring, contrast checked, ARIA on interactive
elements, labels on every input, error text programmatically associated, responsive to 360 px width.
Run `axe` in the Playwright P0 suite and fail on serious/critical violations.

## Definition of Done (every PR)

1. `pnpm lint` clean.
2. `pnpm typecheck` clean (`tsc -b`, strict).
3. `pnpm test` green; new logic has tests; no skipped tests added.
4. `pnpm build` succeeds for both apps.
5. New or changed table → migration linter green + RLS isolation test added → `pnpm test:rls` green.
6. New or changed endpoint → Zod schema, auth + scope guard, audit event where governance-relevant,
   OpenAPI regenerated and committed, integration test.
7. UI change → loading/empty/error/unauthorised states present, metadata unique, a11y checks pass,
   Playwright evidence (screenshot or spec) attached.
8. Entitlement-gated behaviour gated in the UI **and** enforced in the API, with a matrix test.
9. No secret added to client-reachable code; nothing sensitive newly logged.
10. PR body records: changed files · migrations and policies · tests run · evidence · unresolved risks
    · rollback or forward-fix plan.

## Release gate (per release candidate)

- Full unit suite green, count recorded and not lower than the previous release.
- P0 Playwright suite green **authenticated** against staging and production.
- `pnpm test:rls` and the cross-workspace abuse suite green.
- `pnpm verify:release` green (version pinned, migration ordering, no unrecorded destructive SQL).
- Production-data audit zero findings; production-readiness probe all-green.
- Security checklist in `09-security-and-compliance.md` complete.
- Live email deliverability evidence attached.
- Runbook owners recorded; rollback rehearsed.
