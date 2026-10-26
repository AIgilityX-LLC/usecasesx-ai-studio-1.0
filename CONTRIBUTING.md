# Contributing — UseCasesX™

Human and agent contributors. **Authoritative source-control rules:** [`docs/process/source-control-workflow.md`](docs/process/source-control-workflow.md). If this file and that doc disagree, the stricter rule wins (also vs `AGENTS.md` / `CLAUDE.md`).

## Delivery pipeline

Idea → Lovable prototype → feature / chore / fix branch → agent engineering → automated tests → independent review → human PR approval → staging → acceptance → production.

**Agents never push to `main`.** Agents never create release tags or change GitHub repository settings.

## Branch naming

| Prefix | Use |
| ------ | --- |
| `feature/<slug>` | Bounded feature or prompt |
| `fix/<slug>` | Defect |
| `chore/<slug>` | Tooling, docs, control plane |
| `hotfix/<slug>` | Post-launch P0 from `main` |
| `release/<date>` | Stabilization (activation gated — see workflow doc §4) |

Lowercase, hyphen-separated. Branch from Lovable-tracked `main` until `develop` is activated per Decision Log.

## Commits and PRs

- **Squash merge** into `main` (human applies the squash title).
- **Conventional PR titles** (and squash subjects): `type(scope): subject` — types `feat|fix|chore|docs|refactor|test|perf|build|ci|revert`.
- Lovable commits on `main` / edit branches often omit conventions; do **not** add husky hooks. Squash merge is how conventions enter history.
- PR body: `.github/PULL_REQUEST_TEMPLATE.md` (requirement ID, linked issue, evidence, rollback, independent review checkbox).
- One human reviewer minimum; two for auth / RLS / entitlements / audit. Independent agent review checklist: `docs/process/independent-review-checklist.md`.

## Commit and tag signing (how to set up)

1. Generate or import a signing key (SSH signing key or GPG).
2. Add the public key to your GitHub account (Settings → SSH and GPG keys).
3. Locally:
   - SSH: `git config commit.gpgsign true` and `git config gpg.format ssh`, plus `user.signingkey` pointing at the public key file.
   - GPG: `git config commit.gpgsign true` and `user.signingkey` = key ID.
4. Prefer signed tags when a human cuts a release (`git tag -s …`). Agents do not create tags.
5. Repository policy to **require** signed commits/tags is a human GitHub setting — see `docs/process/github-settings.md` (pending operator apply).

Do not use `--no-gpg-sign` to bypass project policy.

## Local setup (short)

1. Install Bun; clone the Lovable-connected repo (`AIgilityX-LLC/usecasesx-ai-studio-1.0`).
2. Confirm Lovable-tracked branch matches `git remote show <remote>` HEAD (workflow doc §3).
3. `bun install` · copy env from project examples · never commit secrets.
4. Prefer `tsgo` for typecheck; run `bun run lint`, `bun run build`, and relevant `bun run test:*` before requesting review.

## Lovable integration (decision status — do not invent a choice)

Per `docs/process/source-control-workflow.md`:

- Lovable sync is **bidirectional against the branch Lovable is configured to track** (today: **`main`**).
- Renaming, deleting, or repointing that branch outside Lovable can desynchronize the project.
- Target multi-branch model (`develop`, `release/*`) is **documented but not activated** until Lovable branch-switching is verified and logged in the Decision Log.
- **Pending human decision:** whether to keep Lovable on `main` with human/agent PRs only, or to activate `develop` / change the Lovable-tracked branch after a rehearsed rollback. Until that Decision Log entry exists, contributors treat **`main` as both production baseline and Lovable track**, and still land agent work via **PRs** (agents never push to `main` directly).

See also `docs/process/github-settings.md` (Lovable item marked pending).

## Migrations and security

- Additive migrations only; `GRANT` → `ENABLE RLS` → `CREATE POLICY` in the same file.
- Never edit generated Supabase clients, `routeTree.gen.ts`, `.env`, or `supabase/config.toml`.
- Report vulnerabilities per `SECURITY.md` — not via public issues.
