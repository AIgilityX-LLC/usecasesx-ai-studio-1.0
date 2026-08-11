# Production data checklist — 14 August 2026 release

Owner: platform admin (named account). Generated in-product at
**Administration → Production Data Audit**, which re-probes live data on every load and can
export this checklist as Markdown or CSV.

Nothing in the audit deletes data. Uncertain records are reviewed by a named owner first; the two
remediations offered are narrow and audited (revoke one role grant, label demo tenants).

## Scope

| Area                    | What is verified                                                                                             | How                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| Platform admin accounts | Every role grant is held by a named owner; demo/unnamed grants are flagged                                   | `user_roles` joined to `profiles`, classified by name and email |
| Intended public content | Published Lite-visible use cases, featured items, public collections, published patterns and global taxonomy | service-role counts against the anonymous policy conditions     |
| Demo isolation          | Demo tenants carry the demo flag so analytics exclude them and the UI labels them                            | demo-named accounts vs `workspaces.is_demo`                     |
| Private/pilot records   | 14 private tables refuse anonymous reads                                                                     | live anonymous reads through the publishable client             |
| Edition configuration   | Launch date, Founding Access end date, Lite/Pro fair-use limits                                              | asserted against the shipped modules                            |
| Destinations            | Canonical HTTPS origin, production support mailbox, published legal pages                                    | asserted against the shipped modules                            |
| Secret hygiene          | No browser-visible variable name looks like a credential                                                     | variable **names** only; no value is read                       |

## Findings at the time of writing

1. **Demo accounts hold platform roles.** Two grants ("Admin Demo", "Moderator Demo") are held by
   demo-named accounts. Revoke both from the audit page, or re-issue the role to a named owner,
   before announcement. This is a launch blocker in the audit verdict.
2. **Demo tenants are unlabelled.** Five demo workspaces/organizations carry `is_demo = false`, so
   demo activity is counted as customer activity. Use "Flag demo tenants" — it sets the label and
   removes no content.
3. **Public surface is as intended.** 54 published, Lite-visible use cases plus published global
   taxonomy are anonymous-readable; unpublished use cases, submissions, pilot records, feedback,
   audit events and profiles are sealed to anonymous callers.
4. **Edition configuration matches the commercial contract.** Launch 14 August 2026, Pro Founding
   Access complimentary through 31 December 2026, Pro limits above Lite.

## Sign-off

Approval is only offered while no check is failing; a rejection can always be recorded. Both
outcomes append to `audit_events` under `production_data_signoff` with the actor, verdict and note,
and the last ten appear on the page.

| Date      | Signed by | Verdict | Note                                                                       |
| --------- | --------- | ------- | -------------------------------------------------------------------------- |
| _pending_ |           |         | Awaiting revocation of the two demo role grants and demo tenant labelling. |
