# Change freeze — 14 August 2026 candidate

In force from **11 August 2026** until GA or a recorded decision to lift it. Companion to
`docs/release/release-candidate-2026-08-14.md` and `docs/process/release-branch-plan.md`.

## 1. What the freeze protects

The candidate `v1.0.0-rc.1` and the Lite / Pro Founding Access journey it contains:
Discover → Capture Opportunity → Design → Score → Prioritize → Portfolio → Roadmap → Export → Advisory.

## 2. Allowed changes

| Class                       | Examples                                                                        |
| --------------------------- | ------------------------------------------------------------------------------- |
| **P0 fix**                  | Security/authorisation defect, data loss, broken core-journey step, launch-blocking crash |
| **Approved copy / content** | Legal wording, launch messaging, SEO titles and descriptions, reference content  |
| **Configuration**           | Environment values, feature-flag defaults, provider configuration                |

## 3. Not allowed

New features, new routes or nav entries, refactors of working code, dependency upgrades,
schema changes that are not required by a P0 fix, RLS relaxations, ownership reassignment,
destructive migrations, and anything that presents planned Enterprise capability as live.

## 4. Severity definitions

- **P0** — blocks launch: unauthorised data access, cross-workspace leakage, a core-journey step
  that cannot complete, secret exposure, or a crash on a launch surface.
- **P1** — degrades launch but has a documented mitigation; ships as a known issue.
- **P2** — post-launch improvement.

## 5. Reviewer checklist for any change during freeze

1. Which allowed class does this fall in? If none, reject and defer.
2. If P0: is there a reproduction and a test that fails before / passes after?
3. Does it touch the database? If so, is the migration additive, repeatable, and added to
   `docs/release/migration-manifest-2026-08-14.md`?
4. Does it weaken RLS, grants, or entitlement checks anywhere? If yes, reject.
5. Does it add nav that leads nowhere, fake metrics, or placeholder production records? If yes, reject.
6. Do `bun run verify:release`, lint, typecheck, build and `bun run test:unit` pass?
7. Is the version bumped to the next `v1.0.0-rc.N` and a new tag cut? The previous tag is never moved.

## 6. Sync posture

Lovable stays tracked on `main`; the candidate is identified by the immutable tag rather than by
repointing Lovable at a branch. Cutting or protecting `release/2026-08-14` on the remote is
optional and does not affect Lovable sync.
