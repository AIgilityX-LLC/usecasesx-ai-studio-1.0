# A-05 Scope Control — Founding Access onboarding, roster invites, Pro workspace

Evaluated against the 14 August 2026 Lite + Pro Founding Access scope. The proposal arrived without a filled `[DESCRIBE]` field, so the three concrete asks in the same message are evaluated as the proposal.

## Verdicts

| # | Proposal | Class | Verdict |
|---|----------|-------|---------|
| 1 | Founding Access onboarding: signup capturing organization, role, sector + welcome email confirming Pro workspace | P1 | SIMPLIFY |
| 2 | Import real pilot roster rows, invite them, queue emails | P1 | INCLUDE NOW (blocked on input) |
| 3 | Pro workspace with its own dashboard, projects, scoring and portfolio pages | P2 | DEFER (duplication) |

## 1. Onboarding + welcome email — SIMPLIFY

- Outcome: a pilot signs up, states organization/role/sector, and receives written confirmation that their Pro workspace is active.
- Already exists: `/onboarding` (`src/routes/_app.onboarding.tsx`, `src/lib/onboarding.functions.ts`) provisions org + workspace via `ensure_user_workspace`. Do not build a second flow.
- Delta to build: confirm the intake captures role and sector (add the missing fields to the existing form and its server validator only), and add one `founding-access-welcome` template to the existing email-template registry, sent from the existing onboarding server function through the existing send helper.
- Dependency: `notify.aigilityx.com` DNS verification. Until it verifies, the send resolves as a queued/failed delivery row and the existing delivery-status UI reports it — no new queue.
- Effort: small. Regression risk: low (one form, one server fn, one template). Displaces nothing.

## 2. Roster import and invites — INCLUDE NOW, blocked

- Outcome: 15–25 real participants invited; clears the pilot-evidence gate that currently caps readiness.
- Blocked purely on the user supplying `Name, Work email, Organization, Sector, Country` rows. No rows may be fabricated.
- Once pasted: import through the existing pilot invitation path, emails recorded as pending until DNS verifies, then re-sent through the existing retry path. No new code expected beyond a one-off import.

## 3. Pro workspace dashboard/projects/scoring/portfolio — DEFER

- Rejected as a new major workflow and duplication of shipped surfaces: `/dashboard`, `/pro`, `/my-use-cases`, `/studio/use-case/$id/scorecard`, `/portfoliox`, `/studio/portfolio`, `/boards`.
- Building parallel Pro-only copies would fork the one-codebase rule and cannot be verified before freeze.
- If the real gap is discoverability, the acceptable P1 substitute is: after onboarding, land the participant on the existing `/pro` page and make it an activation hub linking to the existing dashboard, use cases, scoring and portfolio routes. No new data model, no new pages.
- Any P1 that this would displace (pilot evidence, live publish, verified sender) outranks it.

## Technical notes

- No migrations proposed. Role and sector on the onboarding intake reuse existing profile/onboarding columns if present; if a column is genuinely missing it is an additive nullable column with GRANT + RLS in the same migration.
- Entitlements stay centralized (`useEntitlement`/`usePlan`/`RequirePlan`); no inline plan checks in new UI.
- No Enterprise capability claims added anywhere in the onboarding or welcome copy.

## Recommended next step

`SIMPLIFY-FOUNDING-ONBOARDING` — extend the existing onboarding intake with role/sector, add the welcome email template, and turn `/pro` into the post-onboarding activation hub. Roster import runs the moment rows are pasted.
