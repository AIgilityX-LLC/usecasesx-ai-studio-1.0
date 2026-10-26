# CI/CD and quality gates — UseCasesX™

**Rule:** Nothing reaches production only because it “works in Lovable.” Lovable is a **LOCAL / prototype** surface. Promotion requires automated gates + independent review + human approval.

## Environments

```
LOCAL  →  DEVELOPMENT  →  STAGING  →  PRODUCTION
```

| Environment | Purpose | App | Database | Who deploys |
| ----------- | ------- | --- | -------- | ----------- |
| **LOCAL** | Dev machine / Lovable preview sandbox | `bun run dev` or Lovable preview | Local Supabase **or** shared preview project (never prod) | Developer / Lovable sync |
| **DEVELOPMENT** | Integration branch / PR preview | `pr-preview.yml` → Cloudflare preview | Separate Supabase **preview** project (`PREVIEW_*`) | CI on PR |
| **STAGING** | Pre-prod acceptance | `staging-deploy.yml` after green CI on `main` | Separate Supabase **staging** project (`STAGING_*`) | CI + GitHub Environment `staging` (approval) |
| **PRODUCTION** | Customer traffic | Human-gated promote (Lovable publish **or** prod deploy workflow once enabled) | Production Supabase only | Human only; agents never push to `main` / never publish |

Supabase guidance we follow: separate local / staging / production projects; migrations version-controlled under `supabase/migrations/` (not Dashboard DDL in prod); restricted prod DB access; migration apply is approval-controlled (human reviews SQL in PR + `test:rls` / migration safety gate).

Variable names: `docs/process/deployment-environment.md`, `.github/deployment-env.example`.

## Pull request gates (required)

| Gate | How it runs | Job / command |
| ---- | ----------- | ------------- |
| TypeScript type checking | CI | `bunx tsgo --noEmit \|\| bunx tsc --noEmit` |
| ESLint | CI | `bun run lint` |
| Formatting | CI | `bun run format:check` |
| Unit tests | CI | `bun run test:unit` |
| Integration tests | CI (creds) | Playwright full / UI subset + `bun run test:integration` when secrets present |
| API contract tests | CI | `bun run test:contracts` |
| RLS / tenant isolation | CI (creds) | `bun run test:rls` · `test:tenancy` · `test:cross-workspace` |
| Database migration tests | CI | `bun run test:migrations` (static safety) + RLS suite when creds present |
| Dependency vulnerability scan | CI | `bun run audit:deps` |
| Secret scan | CI | Gitleaks on **PR commit range only** (not full history — historical `.env` is tracked separately) |
| SAST | CI | CodeQL JS/TS |
| Build test | CI | `bun run build` (+ `verify:routes`) |
| Critical Playwright workflows | CI | `bun run test:critical` |
| Codex / independent review | Human + agent | `docs/process/independent-review-checklist.md` — PR checkbox **Independent review done** |
| Human approval | GitHub | CODEOWNERS review + Environment protection on `staging` / `production` |

Branch protection must require the CI jobs listed in `docs/process/github-settings.md` (human applies).

## Critical workflows → existing tests

| Workflow | Coverage today | Runner |
| -------- | -------------- | ------ |
| Create Use Case / capture opportunity | `tests/journey-opportunity-to-portfolio.spec.ts`, `tests/boards-create.e2e.ts` | Playwright critical + e2e |
| Score Use Case | `tests/unit/scoring*.test.ts`, journey specs | Unit + critical |
| Move lifecycle stage | `tests/submission-publish.e2e.ts`, `tests/unit/lifecycle-*.test.ts`, `tests/unit/decision-gates-v2.test.ts` | e2e / unit |
| Assign owner | `tests/tenancy-isolation.e2e.ts`, collab specs | e2e (creds) |
| Approve use case | `tests/submission-publish.e2e.ts` | e2e (creds) |
| Calculate Value Score | `tests/unit/scoring-v2.test.ts`, value/report units | Unit |
| Create KPI | **GAP** — no dedicated e2e yet; tracked below | — |
| Portfolio dashboard | `tests/journey-opportunity-to-portfolio.spec.ts` | Playwright critical |
| Tenant switching | `tests/unit/workspace-selection.test.ts`, `tests/tenancy-isolation.e2e.ts`, `tests/cross-workspace-abuse.e2e.ts` | Unit + e2e |
| Export report | `tests/report-*.spec.ts`, `tests/unit/report-csv-contract.test.ts` | Playwright critical + contracts |
| Admin role change | `tests/authz-matrix.e2e.ts`, `tests/unit/permissions-matrix.test.ts` | e2e / unit |

**GAP (ponytail):** dedicated Playwright for “Create KPI” is not invented here — add when the KPI UI journey is stable; until then unit/API coverage must land with the feature PR.

## Lovable vs production

1. Prototype in Lovable (**LOCAL**).
2. Open a PR from a feature branch — never push to `main` as an agent.
3. CI gates above must pass.
4. Independent review + human CODEOWNERS approval.
5. Merge to `main` → staging deploy (Environment approval).
6. Acceptance on staging → human production publish / promote.

## Commands (local)

```bash
bun run format:check
bun run lint
bunx tsgo --noEmit
bun run test:unit
bun run test:contracts
bun run test:migrations
bun run audit:deps
bun run test:critical          # Playwright critical project
bun run test:rls               # needs Supabase secrets
bun run build
```
