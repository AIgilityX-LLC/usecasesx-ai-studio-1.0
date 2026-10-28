# GitHub settings — human operator checklist

Agents **must not** change repository settings. Apply on **`AIgilityX-LLC/usecasesx-ai-studio-1.0`**.

## 1. Pull requests

1. [ ] Allow **squash merging**.
2. [ ] Auto-delete head branches (optional).
3. [ ] Require PR before merging to `main`.

## 2. Required status checks (after merging CI PRs)

Until **PR #37** / **#77** (or equivalent) land on `main`, the live workflow is the current
`.github/workflows/ci.yml` jobs. After those PRs merge, require the **aggregate** check name
they document (typically `Critical gates` / `critical-gates`).

**Current `ci.yml` job names (lovable/main as of this fix branch):**

| Check name (Actions)       | Purpose     |
| -------------------------- | ----------- |
| `Lint · typecheck · build` | quality job |
| `Playwright UI specs`      | UI specs    |

**Intended required checks after #37/#77 merge (do not invent duplicates in the meantime):**

| Check name               | Purpose                                                                   |
| ------------------------ | ------------------------------------------------------------------------- |
| Critical gates / quality | typecheck, unit, contracts, migration safety                              |
| Isolation / RLS          | cross-tenant suite when TEST secrets exist; otherwise visible **SKIPPED** |
| Security scan            | client-secrets + gitleaks (PR range) + dependency audit                   |

Branch protection: require the above on `main`; do not allow bypass for admins in production.

## 3. Environments / secrets

- CI secrets → **disposable TEST** Supabase project only.
- Guard: fail CI if `SUPABASE_URL` contains `PRODUCTION_SUPABASE_PROJECT_REF` (repo variable; never hard-code or print the ref).
- Production secrets only in a reviewed Environment (or Lovable Cloud Secrets).

## 4. Lovable Publish rule

**Publish only from a merged, green `main`.**

1. PR merged with required checks green.
2. Local/tag verification as needed.
3. Publish from Lovable UI against the tracked `main` SHA.
4. Record release in checklist below.

Do **not** publish from feature branches or red CI.

## 5. Release checklist (human)

- [ ] Required checks green on the merge commit
- [ ] No `.env` or credential files in the commit (`git ls-files` review)
- [ ] TEST RLS suite run this cycle **or** explicitly deferred with ticket
- [ ] Recovery drill status recorded (or still NEEDS-HUMAN)
- [ ] Marketing copy reviewed for residency/sovereign claims
- [ ] Lovable Publish from `main` only
