# GitHub settings — human operator checklist

Agents **must not** change repository settings. Apply these in order on **`AIgilityX-LLC/usecasesx-ai-studio-1.0`** (Lovable-connected). Check each box when done.

## 0. Confirm remotes and tracked branch

1. [ ] Lovable → project → GitHub: note **tracked branch** (expected: `main`).
2. [ ] GitHub default branch = that tracked branch.
3. [ ] Do **not** rename, transfer, or delete the connected repository.

## 1. General → Pull Requests

1. [ ] Allow **squash merging** (required).
2. [ ] Prefer: disable merge commits and/or rebase if the team standard is squash-only.
3. [ ] Automatically delete head branches after merge (recommended).

## 2. Branches → Branch protection for `main`

1. [ ] Add rule for `main` (or Rulesets equivalent).
2. [ ] Require a pull request before merging.
3. [ ] Require approvals: **1** minimum; keep **2** as team practice for auth/RLS/entitlements/audit (CODEOWNERS + human).
4. [ ] Require review from **CODEOWNERS**.
5. [ ] Require status checks to pass before merging — at least:
   - `Lint · typecheck · build` (CI)
   - Route / nav checks as configured
   - PR title conventional-commit check (once workflow is on default branch)
6. [ ] Require branches to be up to date before merging (recommended).
7. [ ] Do **not** allow force pushes.
8. [ ] Do **not** allow deletions.
9. [ ] Restrict who can push to `main` to empty / admins only (no direct agent push).

## 3. Actions permissions

1. [ ] Actions: allow required workflows; prefer **Read repository contents** default; workflows request least privilege in YAML.
2. [ ] Secrets: ensure names in `docs/process/deployment-environment.md` exist before enabling staging/preview deploy.
3. [ ] Do not paste secret **values** into issues, PRs, or docs.

## 4. Security & analysis

1. [ ] Enable **Dependabot alerts** (matches `.github/dependabot.yml` once merged).
2. [ ] Enable **Secret scanning** and **Push protection**.
3. [ ] Enable **GitHub Security Advisories** private reporting (aligns with `SECURITY.md`).
4. [ ] CodeQL / gitleaks workflows are **report-only** until a human promotes them to blocking.

## 5. Signing (optional until policy hardens)

1. [ ] Document whether signed commits/tags are required (see `CONTRIBUTING.md`).
2. [ ] If required, enable “Require signed commits” on the `main` protection rule after contributors are enrolled.

## 6. Lovable decision — **PENDING**

> Do **not** choose below in this PR. Record the choice in the product Decision Log when ready.

| Option | Meaning |
| ------ | ------- |
| **A (current)** | Lovable stays on `main`; human/agent work via PRs into `main`; agents never push to `main`. |
| **B** | Activate `develop` for human/agent integration; Lovable remains on `main` until branch-switch smoke + rollback rehearsed (`docs/process/source-control-workflow.md` §4). |
| **C** | Repoint Lovable tracked branch (only via Lovable UI, with rollback plan). |

- [ ] Decision Log entry written (option A/B/C + date + owner).
- [ ] Until then: treat **A** as operational default without claiming B/C are rejected forever.

## 7. First release (after settings)

1. [ ] Apply settings 1–4.
2. [ ] Follow “Cutting the first release” in `CHANGELOG.md` / release-please notes.
3. [ ] Humans only create tags; agents do not.
