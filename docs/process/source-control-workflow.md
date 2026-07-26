# Source-Control Workflow

Authoritative source-control conventions for AIgilityX **UseCasesX™**. Applies to Lovable, Claude Code, Codex CLI, and human contributors. If this document conflicts with `AGENTS.md` or `CLAUDE.md`, the stricter rule wins.

Companion docs: `docs/process/release-branch-plan.md`, `docs/process/pr-and-migration-checklist.md`, `docs/process/release-notes-template.md`, `CHANGELOG.md`.

---

## 1. Ground truth about the Lovable ↔ GitHub link

Inspected 2026-07-26:

- Remote: `origin/main` is the single tracked long-lived branch.
- Lovable edits land on an internal edit branch (`edit/edt-*`) and are fast-forwarded/merged into `main` by the Lovable sync layer.
- No `develop`, `release/*`, `feature/*`, or `fix/*` branches exist on the remote today.
- Lovable's Git integration is **bidirectional against the branch Lovable is configured to track** (currently `main`). Renaming, deleting, or repointing that branch outside Lovable can desynchronize the project.

Implications for this workflow:

1. **Do not rename, move, transfer, or recreate the connected repository.**
2. **Do not change the branch Lovable tracks** from a shell, GitHub UI, or CI. Only change it via Lovable's own GitHub settings, and only with a rollback plan.
3. **Do not delete `main`.** It is both the production baseline and the Lovable-tracked branch.
4. Additional branches below are **opt-in and require verified Lovable support before use**. Until verified, all human/agent work continues to flow through `main` exactly as it does today. This document defines the *target* convention; §4 defines the safe activation path.

---

## 2. Branch model (target state)

| Branch | Purpose | Lifetime | Who writes | Notes |
|---|---|---|---|---|
| `main` | Production baseline. Lovable-tracked. Deployable at any commit. | Permanent | Lovable sync, merges from `develop` (once activated), hotfix merges | Protected. No force-push. |
| `develop` | Integration branch for multi-PR work not yet ready for `main`. | Permanent (once activated) | Merges from `feature/*` and `fix/*` | Optional; only activate if Lovable branch-switching is confirmed working (see §4). |
| `feature/<slug>` | One bounded feature or prompt. | Short-lived (< ~5 days) | Human/agent contributors via PR | Branch from `develop` if active, else `main`. |
| `fix/<slug>` | Defect fix. | Short-lived | Same as feature | Same base rule as feature. |
| `release/2026-08-14` | Release-candidate stabilization for the 14 Aug 2026 launch. | Cut on freeze gate 4 (12 Aug), retired after launch | Release manager only | Only P0 fixes merged from `fix/*`. Cherry-picks documented in §5 of release notes. |
| `hotfix/<slug>` | Post-launch P0 patch cut from `main`. | Hours to days | Named launch commander | Merges back to `main` and, if active, to `develop` and `release/*`. |

Naming: lowercase, hyphen-separated, prefix mandatory. Examples: `feature/discover-empty-state`, `fix/mobile-home-overflow-390`, `release/2026-08-14`, `hotfix/auth-google-callback`.

---

## 3. Confirm the Lovable-tracked branch before editing

**Mandatory pre-edit check** for every contributor (human or agent):

1. Open Lovable → project → GitHub settings; read the **tracked branch** field.
2. In a local shell: `git remote show origin | grep "HEAD branch"`. This must match Lovable's tracked branch.
3. If they diverge, stop. Do not push. Escalate per §7.
4. Agents (Lovable, Claude Code, Codex): the tracked branch is `main` unless a Decision Log entry in `docs/product/20-day-release-board.md` §7.2 says otherwise. Never assume.

---

## 4. Safe activation path for `develop` and `release/*`

Do not create these branches until each precondition is satisfied.

**Preconditions**
- Confirmed in writing (Decision Log entry) that Lovable's branch-switching (Account → Labs) is enabled for this workspace and works in a smoke test.
- Rollback rehearsed: switch Lovable back to `main`, verify preview and publish still resolve to the correct commit.

**Activation steps for `develop`**
1. From `main` at a known-green commit, create `develop`: `git checkout -b develop main && git push -u origin develop`.
2. Set branch protection: require PR, require passing checks (§6), disallow force-push, disallow deletion.
3. Do **not** point Lovable at `develop`. Lovable stays on `main`. `develop` is human/agent-only until we choose to switch.
4. Log activation in `docs/product/20-day-release-board.md` §7.2.

**Activation steps for `release/2026-08-14`**
1. Cut from `main` (or `develop`, if active) at Freeze Gate 4 (12 Aug 2026).
2. Only PROMPT-owned P0 fixes may merge.
3. On launch, tag and merge to `main`; do not delete the branch until 30 days post-launch.

Until activation, `feature/*` and `fix/*` branch **from `main`** and merge back into `main` via PR. This matches current reality and keeps Lovable in sync.

---

## 5. Commit and PR conventions

**Commit messages** — Conventional Commits, imperative mood, ≤ 72-char subject:

```
<type>(<scope>): <subject>

<body — what and why, not how>

Refs: PROMPT-NN
```

Allowed types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `build`, `ci`, `revert`.
Scopes align with domains in `AGENTS.md` §2 (e.g. `repository`, `studio`, `scoring`, `portfolio`, `roadmap`, `auth`, `entitlements`, `audit`).

Lovable-authored commits keep their default subject; contributors squashing Lovable work into a PR rewrite the squash commit to Conventional Commit form.

**PR rules**
- One bounded change per PR. If it needs a table of contents, split it.
- Title mirrors the squash commit subject; body follows `.github/PULL_REQUEST_TEMPLATE.md`.
- Link the PROMPT-NN and, if applicable, the risk ID from the release board §7.1.
- Include evidence: screenshots for UI, migration diff for DB, test run IDs.
- Additive-only migrations (see `AGENTS.md` §5). Destructive changes require an approved staged plan referenced in the PR body.

**Reviewers**
- One human reviewer minimum. Two required for anything touching auth, RLS, entitlements, or the audit pipeline.
- Reviewer's job: verify Definition of Done (`AGENTS.md` §6) and the PR checklist.

---

## 6. Required checks

CI is expected to run on every PR against `main` (and `develop` once active). Names must match the workflow job names.

| Check | Command | Blocking? |
|---|---|---|
| Lint | `bun run lint` | Yes |
| Typecheck | `tsgo` | Yes |
| Build | `bun run build` | Yes |
| Route tree verify | `bun run verify:routes` (already wired in `.github/workflows/route-tree-check.yml`) | Yes |
| Nav integrity | `bun run check:nav-integrity` | Yes |
| Compare analytics | `bun run check:compare` (already wired in `.github/workflows/compare-analytics-check.yml`) | Yes |
| E2E (narrow) | `bun run test:e2e` — spec relevant to change | Yes for UI/data changes |
| RLS isolation | `bun run test:rls` | Yes for any new/changed table or policy |

Adding new blocking checks or workflows requires a Decision Log entry.

---

## 7. Migration review rules

- Every migration PR touches SQL files only, plus generated types if needed. No mixed feature+migration PRs unless the feature cannot compile without the migration.
- Reviewer verifies, in order:
  1. Additive only (`AGENTS.md` §5).
  2. Every new `public` table has `GRANT` → `ENABLE ROW LEVEL SECURITY` → `CREATE POLICY` in the same migration.
  3. `GRANT`s are scoped to the roles the policies allow. `service_role` present when server handlers touch the table.
  4. `bun run test:rls` green.
  5. Rollback path stated in the PR body — for additive migrations, "revert commit" is acceptable.
- Destructive changes (drop column, drop table, destructive rename, ownership transfer) require:
  - Staged plan document under `docs/architecture/data-migration-plan.md`.
  - Explicit approval in the Decision Log.
  - Second reviewer with data ownership context.

---

## 8. Escalation

Stop and escalate — do not push, do not merge — if:
- Lovable's tracked branch does not match `git remote show origin`.
- A PR would require a force-push to `main`.
- CI cannot run (workflow file broken or GH Actions outage).
- A migration touches reserved schemas (`auth`, `storage`, `realtime`, `supabase_functions`, `vault`).
- A commit adds a secret to source, `.env` (beyond generated Supabase fields), or any client-side bundle.

Escalation path: file a Decision Log entry in `docs/product/20-day-release-board.md` §7.2 describing the block and the proposed resolution; hold the change until the entry is signed off.

---

## 9. Non-goals

- This document does **not** change the branch Lovable currently tracks.
- It does **not** create, rename, or delete any remote branch on its own.
- It does **not** modify deployment behavior. Publish continues to run from the Lovable UI against the tracked branch.

Adopting §2/§4 requires an explicit Decision Log entry before any branch is created.
