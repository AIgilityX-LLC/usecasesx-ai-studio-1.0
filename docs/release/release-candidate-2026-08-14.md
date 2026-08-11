# Release candidate — v1.0.0-rc.1 (target 14 August 2026)

Editions in scope: **Lite** (public discovery) and **Pro Founding Access** (complimentary through
31 December 2026, fair-use limited). Enterprise is architected but not live.

## 1. Candidate identity

| Field                | Value                                                       |
| -------------------- | ----------------------------------------------------------- |
| Version              | `1.0.0-rc.1`                                                |
| Declared in code     | `src/lib/release.ts` (`RELEASE_VERSION`)                    |
| Declared in package  | `package.json` → `version`                                  |
| Release marker       | `release/2026-08-14`                                        |
| Tag to cut           | `v1.0.0-rc.1`                                               |
| Build ID             | `VITE_BUILD_ID` (commit sha, injected by CI); `local` otherwise |
| Freeze date          | 2026-08-11                                                  |
| Target GA            | 2026-08-14                                                  |
| Migrations in scope  | 15 (see `migration-manifest-2026-08-14.md`)                 |
| Integrity gate       | `bun run verify:release`                                    |

**Recording the exact commit.** The candidate commit is not invented in this document — it is
recorded by cutting the tag from the verified state:

```bash
bun install --frozen-lockfile
bun run verify:release && bun run lint && bunx tsgo --noEmit && bun run build && bun run test:unit
git rev-parse HEAD                    # the candidate commit sha
git tag -a v1.0.0-rc.1 -m "UseCasesX Lite + Pro Founding Access RC1"
git push origin v1.0.0-rc.1           # immutable candidate; Release workflow drafts the notes
```

Once pushed, the tag is the immutable candidate. Any further change produces `v1.0.0-rc.2`; the
tag is never moved.

## 2. Phase 4 decision carried into freeze

`docs/product/phase-4-exit-report-2026-08-11.md` recorded **CONDITIONAL GO**: code, security and
test gates green; the single true blocker is *evidence*, because the pilot cohort has never been
activated. That decision stands unchanged. This candidate therefore enters freeze as
**code-ready / evidence-pending**.

Remaining approved items (all non-feature):

| Item                                                              | Class                | Status                                                |
| ----------------------------------------------------------------- | -------------------- | ----------------------------------------------------- |
| Activate the 15–25 seat pilot cohort, or record an admin waiver    | Evidence             | Open — Administration → Pilot programme               |
| Run the browser P0 suite with a signed-in session                  | Verification         | Open — CI `launch-readiness.yml` is the source of truth |
| Approved launch copy / legal wording corrections                   | Content              | Allowed under freeze                                  |
| Environment and configuration values for production               | Configuration        | Allowed under freeze                                  |

No feature work is open against this candidate.

## 3. Change control under freeze

Only three change classes may land on the candidate:

1. **P0 fixes** — data loss, security/authorisation defect, broken core-journey step, or a
   launch-blocking crash. Requires a reproduction, a test, and a manifest entry if it touches the
   database.
2. **Approved launch copy/content** — wording, legal and metadata corrections that make no
   behavioural change.
3. **Configuration** — environment values, feature-flag defaults, provider configuration.

Everything else is deferred to the post-launch train. See §5 of
`docs/process/change-freeze-2026-08-14.md` for the reviewer checklist.

## 4. Verification set for the candidate

| Gate                          | Command                                       |
| ----------------------------- | --------------------------------------------- |
| Candidate integrity           | `bun run verify:release`                      |
| Clean install                 | `bun install --frozen-lockfile`               |
| Lint                          | `bun run lint`                                |
| Typecheck                     | `bunx tsgo --noEmit`                          |
| Route tree                    | `bun run verify:routes`                       |
| Production build              | `bun run build`                               |
| Unit + integration suite      | `bun run test:unit`                           |
| Nav integrity                 | `bun run check:nav-integrity`                 |
| Tenant isolation              | `bun run test:rls`, `bun run test:cross-workspace` |
| Browser P0 (CI)               | `bun run test:p0` via `launch-readiness.yml`  |

Results for this candidate are recorded in §"Verification" of
`docs/product/release-notes-2026-08-14.md`.

## 5. Known issues and risks

`docs/product/known-issues-2026-08-14.md` is the single list. Nothing observed is omitted, and no
speculative item is added.

## 6. Rollback / forward-fix

- **Application rollback** — revert Lovable to the previous version (chat revert or History), or
  redeploy the previous tag. Schema stays ahead; all migrations are additive so the older app
  version runs unchanged against it.
- **Forward-fix** — new additive migration plus a `v1.0.0-rc.N+1` tag. Applied migration files are
  never edited.
- **Data** — request an on-demand data export before applying migrations to production.
