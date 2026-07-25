# Outcomes by Role — one measurable per role

Each outcome must be observable in the running app on 14 Aug 2026 without mock data.

## Anonymous visitor

**Outcome:** From `/` reach a filtered repository result and submit an opportunity in ≤ 3 clicks.
**Measured by:** `visitor_repository_filter` + `visitor_submit` activation events; `submissions` row created; confirmation screen shown.

## Pro Founding Access user

**Outcome:** Create a use case in Studio → score it → add to a portfolio → export one deliverable.
**Measured by:** rows in `use_cases`, `use_case_scores`, `portfolio_items`; one deliverable download event; all four events attributable to the same `auth.uid()`.

## Facilitator

**Outcome:** Run a Discover → Capture → shortlist flow and share a board link opened by a second session.
**Measured by:** board with ≥ 3 items, share token issued, second-session load of `/c/$token`.

## Workspace admin

**Outcome:** In `/administration` see member list, entitlement state and fair-use meter with live values.
**Measured by:** admin view renders live counts; zero mock rows in the DOM; role-gate rejects non-admin.

## Platform admin

**Outcome:** Review live submissions + waitlist + module analytics.
**Measured by:** admin routes render live rows; role-gated (`RequireRoles`); anon receives redirect/404; `check:nav-integrity` green.
