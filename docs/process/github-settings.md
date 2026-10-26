# GitHub settings — human operator checklist

Agents **must not** change repository settings. Apply on **`AIgilityX-LLC/usecasesx-ai-studio-1.0`**.

## 1. Pull requests

1. [ ] Allow **squash merging**.
2. [ ] Auto-delete head branches (recommended).

## 2. Branch protection for `main`

1. [ ] Require PR before merge; no force-push; no deletion.
2. [ ] Require CODEOWNERS review (when CODEOWNERS exists).
3. [ ] Require approvals: **1** minimum (2 for auth/RLS/entitlements/audit).
4. [ ] Require status checks:
   - `Formatting`
   - `Lint · typecheck · unit · contracts · migrations · build`
   - `Secret scan (PR range)`
   - `SAST (CodeQL)`
   - `Playwright critical workflows`
   - `Playwright UI / integration`
5. [ ] Restrict direct pushes to `main` (agents never push to `main`).

## 3. Environments (human approval)

1. [ ] Create Environment **`staging`** — required reviewers before `staging-deploy.yml`.
2. [ ] Create Environment **`production`** — required reviewers before any prod promote/publish.
3. [ ] Wire secrets/vars per `docs/process/deployment-environment.md`.

## 4. Security

1. [ ] Dependabot alerts + secret scanning + push protection.
2. [ ] Private vulnerability reporting (`SECURITY.md` when present).

## 5. Lovable decision — **PENDING**

Keep Lovable on `main` until Decision Log chooses otherwise (`docs/process/source-control-workflow.md`). Preview ≠ production gate.
