# Release Branch Plan — 2026-08-14 Launch

Companion to `docs/process/source-control-workflow.md` and `docs/product/20-day-release-board.md`. Governs the branch choreography for the **Lite + Pro Founding Access** launch on **14 August 2026**.

---

## 1. Current reality (2026-07-26)

- Only `main` exists on the remote. Lovable tracks `main` bidirectionally.
- No `develop`, `release/*`, or `hotfix/*` branches exist.
- All work today merges into `main` through Lovable's sync or through PRs from short-lived working branches.

This plan describes the target choreography **and** the safe activation gates. Until each gate is passed, work continues on `main` exactly as today.

---

## 2. Target branch choreography

```text
                                            ┌──────────────┐
        feature/* ──┐                        │  hotfix/*    │ (post-launch P0 only)
        fix/*     ──┼──►  develop  ──►  release/2026-08-14 ──►  main  (Lovable tracked)
                    │       (opt)               (cut 12 Aug)      │
                    └──────────────────────────────────────────► main (direct, if develop not active)
```

- `main` — always deployable. Tagged at every launch and hotfix.
- `develop` — optional integration branch. Activated only if §3 gate passes.
- `release/2026-08-14` — release-candidate branch cut at Freeze Gate 4 (12 Aug 2026).
- `hotfix/*` — cut from `main` for post-launch P0 defects.

---

## 3. Activation gates

### Gate A — Activate `develop`

**When**: Only if we need parallel feature streams that cannot land directly on `main` without destabilizing Lovable previews.
**Preconditions**

1. Lovable branch-switching (Labs) verified working end-to-end with a smoke commit.
2. Rollback rehearsed: revert Lovable to `main` in < 5 minutes.
3. Decision Log entry approved in release board §7.2.
   **Steps**: as documented in `source-control-workflow.md` §4.
   **Owner**: Launch commander.

### Gate B — Cut `release/2026-08-14`

**When**: Freeze Gate 4 (Wed 12 Aug 2026), after `bun run test:e2e`, `test:smoke`, `test:navbar`, `test:mobile`, `test:rls` all green and Lighthouse ≥ 90 on `/discover`.
**Preconditions**

1. All PROMPT-10 through PROMPT-30 `done` or explicitly `deferred` in release board §7.
2. Legal, DNS, and email-deliverability items (PROMPT-31, PROMPT-32) on track.
   **Steps**
3. From `main` at the green commit: `git checkout -b release/2026-08-14 main && git push -u origin release/2026-08-14`.
4. Protect the branch: require PR, require checks, disallow force-push.
5. Announce freeze in Decision Log; only P0 fixes may merge via `fix/*` PRs.
6. Do **not** point Lovable at the release branch. Lovable stays on `main`.
   **Owner**: Launch commander.

### Gate C — Launch (14 Aug 2026)

1. Merge `release/2026-08-14` into `main` via PR (no squash — preserve fix history).
2. Tag `v2026.08.14-launch` on the merge commit.
3. Publish via Lovable UI (PROMPT-34).
4. Run `bun run test:smoke` against production (PROMPT-35).
5. Keep `release/2026-08-14` for 30 days for reference; do not delete before 13 Sep 2026.

### Gate D — Post-launch hotfix

1. `git checkout -b hotfix/<slug> main`.
2. Fix + narrow test + evidence.
3. PR into `main`; on merge, cherry-pick to `develop` (if active).
4. Tag `v2026.08.14+hotfix-N` on `main`.
5. Publish via Lovable.

---

## 4. What does NOT change

- Lovable-tracked branch remains `main` throughout. No re-pointing.
- No branch is deleted as part of this plan.
- No deployment automation is added; publishing remains a human action in the Lovable UI.
- No repository rename, transfer, or recreation.

Any deviation requires a Decision Log entry in release board §7.2 signed by the launch commander.

---

## 5. Rollback

- **Bad merge to `main`**: revert commit via PR, re-run CI, republish.
- **Bad publish**: Lovable "Restore version" to previous tag (`v2026.08.14-launch` or last hotfix tag).
- **Bad migration on production DB**: additive-only rule means most rollbacks are code reverts; destructive migrations require the staged plan documented in `docs/architecture/data-migration-plan.md`.
