# Release Regression Checklist — UseCasesX™

Manual verification pass to run before every release (target launch: **14 August 2026**, Lite + Pro Founding Access).
No developer tooling required: everything below is done in a browser. Record the outcome in the Result column and
attach a screenshot for anything you mark **Fail**.

How to use it: work top to bottom. A **P0** row failing is a **No-Go** — do not release. A **P1** row failing is a
release risk that needs a named owner and a date. Print or copy this file per release and keep the completed copy.

Legend: ✅ pass · ⚠️ pass with note · ❌ fail · n/a not applicable this release.

---

## 0. Before you start

- Know which URL you are testing (preview or published) and write it at the top of your copy.
- Use fresh, disposable email addresses — never a colleague's real account.
- Test in a **private/incognito window** so you never inherit a previous session.
- Have ready: one work-email address (e.g. `you@yourcompany.com`) and one consumer address (e.g. Gmail).

---

## 1. Automated gates (run once per release)

Ask an engineer to run these and paste the results into your copy. All must be green before manual testing starts.

| #    | Gate                                                                                                   | Command                                                                    | Priority | Result |
| ---- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | -------- | ------ |
| 1.1  | Lint                                                                                                   | `bun run lint`                                                             | P0       |        |
| 1.2  | Types                                                                                                  | `tsgo`                                                                     | P0       |        |
| 1.3  | Route tree + build                                                                                     | `bun run build`                                                            | P0       |        |
| 1.4  | Unit suites (validation, scoring, entitlements, permissions, search, reports, pagination, AI boundary) | `bun run test:unit`                                                        | P0       |        |
| 1.5  | Tenant isolation / RLS                                                                                 | `bun run test:rls`, `bun run test:tenancy`, `bun run test:cross-workspace` | P0       |        |
| 1.6  | Submission → approval lifecycle                                                                        | `bun run test:submissions`                                                 | P0       |        |
| 1.7  | Authorization matrix + audit immutability                                                              | `bun run test:authz`, `bun run test:audit`                                 | P0       |        |
| 1.8  | Browser journeys (opportunity → portfolio, workshop → portfolio, private report access)                | `bun run test:e2e`                                                         | P0       |        |
| 1.9  | Navigation integrity (no dead links)                                                                   | `bun run check:nav-integrity`                                              | P1       |        |
| 1.10 | Mobile + navbar specs                                                                                  | `bun run test:mobile`, `bun run test:navbar`                               | P1       |        |

---

## 2. Roles — check each persona sees only what it should

Sign in as each persona in a separate private window.

| #   | Persona                            | Expected                                                                                                                                              | Priority | Result |
| --- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------ |
| 2.1 | Not signed in                      | Can browse the public repository and open a published use case. Sign-in prompts appear instead of Save/Submit. No admin links anywhere.               | P0       |        |
| 2.2 | Lite (signed in, no Pro)           | Can browse, save, submit. Pro surfaces (Portfolio, Roadmap, Opportunity Map, Workshops) show an upgrade panel — not an error, not a blank page.       | P0       |        |
| 2.3 | Pro Founding Access                | All Pro surfaces open. Footer/banner states Pro Founding Access is complimentary through 31 Dec 2026.                                                 | P0       |        |
| 2.4 | Viewer in someone else's workspace | Can read shared content, cannot edit, delete or invite.                                                                                               | P0       |        |
| 2.5 | Contributor / Editor               | Can create and edit use cases and drafts, cannot hard-delete or reach Administration.                                                                 | P0       |        |
| 2.6 | Workspace Admin / Owner            | Can invite and remove members, manage workspace settings.                                                                                             | P0       |        |
| 2.7 | Facilitator                        | Can run a workshop, invite participants, publish outcomes.                                                                                            | P1       |        |
| 2.8 | Platform admin                     | Administration, Requests inbox, Audit and Observability pages open with real data.                                                                    | P0       |        |
| 2.9 | Cross-tenant probe                 | Copy a URL containing an ID from workspace A, open it while signed in to workspace B. Expect a clear "no access" message — never someone else's data. | P0       |        |

---

## 3. North-star journey (do this end-to-end in one sitting, as a Pro user)

| #    | Step                       | What to confirm                                                                                                                                                                        | Priority | Result |
| ---- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------ |
| 3.1  | **Discover**               | Search a keyword; the most obviously relevant result is at the top. Facets (industry, country, public-sector function, tags) narrow the list and the result count changes accordingly. | P0       |        |
| 3.2  | **Capture Opportunity**    | Create an opportunity; it appears in the list immediately with your name and workspace.                                                                                                | P0       |        |
| 3.3  | **Design (Studio)**        | Work through the Studio wizard; leave and return — your draft is still there.                                                                                                          | P0       |        |
| 3.4  | **Score**                  | Enter scores; the total and priority band update and persist after a page refresh.                                                                                                     | P0       |        |
| 3.5  | **Prioritize / Shortlist** | Shortlist items; the shortlist count matches what you selected.                                                                                                                        | P0       |        |
| 3.6  | **Portfolio**              | Add shortlisted items to a portfolio; ranks, decisions and funding state save.                                                                                                         | P0       |        |
| 3.7  | **Roadmap**                | Items appear in Now / Next / Later; moving one persists.                                                                                                                               | P0       |        |
| 3.8  | **Opportunity Map**        | Captured items are accounted for — plotted, or explicitly counted as unclassified. Nothing silently disappears.                                                                        | P0       |        |
| 3.9  | **Export**                 | Export a report (PDF and CSV). The file downloads, opens, and the numbers match the screen.                                                                                            | P0       |        |
| 3.10 | **Advisory / Handoff**     | Request an advisory handoff; a confirmation with a reference appears and the request shows in the admin inbox.                                                                         | P1       |        |
| 3.11 | **Workshop**               | Create a workshop, invite a participant, vote, publish outcomes to a portfolio.                                                                                                        | P1       |        |

---

## 4. Sign-up, onboarding and access

| #   | Check                                      | Expected                                                                                  | Priority | Result |
| --- | ------------------------------------------ | ----------------------------------------------------------------------------------------- | -------- | ------ |
| 4.1 | Sign up with a work email                  | Account created; onboarding starts; a workspace exists without you creating one manually. | P0       |        |
| 4.2 | Sign up with a consumer email (Gmail etc.) | Allowed to register, but **not** granted complimentary Pro Founding Access.               | P0       |        |
| 4.3 | Google sign-in                             | Completes and lands you signed in — not back on the sign-in page.                         | P0       |        |
| 4.4 | Header after sign-in                       | Shows your account/avatar and a way to sign out — never a plain "Sign in" button.         | P0       |        |
| 4.5 | Sign out                                   | Returns to the sign-in page; pressing Back does **not** show your previous data.          | P0       |        |
| 4.6 | Wrong password / unknown email             | Plain-language error, no technical text, no crash.                                        | P1       |        |
| 4.7 | Password reset email                       | Arrives, link works, new password signs you in.                                           | P0       |        |
| 4.8 | Workspace invitation email                 | Arrives, link works, invitee lands in the right workspace with the right role.            | P0       |        |

---

## 5. Submissions and approval

| #   | Check                         | Expected                                                                                                            | Priority | Result |
| --- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------- | -------- | ------ |
| 5.1 | Submit an incomplete use case | Missing required fields are highlighted with readable messages; nothing is saved silently.                          | P0       |        |
| 5.2 | Submit a valid use case       | Success confirmation with a reference and a timestamp.                                                              | P0       |        |
| 5.3 | My Use Cases                  | Your item appears with the correct status (draft / in review / published).                                          | P0       |        |
| 5.4 | Admin approves it             | The item becomes visible in the public repository; no error appears for the reviewer.                               | P0       |        |
| 5.5 | Admin rejects it              | Reviewer notes are stored; the submitter sees the rejected status, and the item stays out of the public repository. | P0       |        |
| 5.6 | Audit page                    | Shows who changed the status, when, and the reviewer note.                                                          | P1       |        |

---

## 6. Browsers and devices

Repeat sections 3.1–3.6 in each of the following. Note the browser version in your copy.

| #    | Environment                                                                                         | Priority | Result |
| ---- | --------------------------------------------------------------------------------------------------- | -------- | ------ |
| 6.1  | Chrome, desktop (latest)                                                                            | P0       |        |
| 6.2  | Safari, macOS (latest)                                                                              | P0       |        |
| 6.3  | Edge, desktop                                                                                       | P1       |        |
| 6.4  | Firefox, desktop                                                                                    | P1       |        |
| 6.5  | Safari on iPhone                                                                                    | P0       |        |
| 6.6  | Chrome on Android                                                                                   | P1       |        |
| 6.7  | iPad / tablet, portrait and landscape                                                               | P1       |        |
| 6.8  | Narrow phone, 360 px wide                                                                           | P0       |        |
| 6.9  | Keyboard only — Tab through the main journey; focus is always visible and no control is unreachable | P0       |        |
| 6.10 | Browser zoom at 200% — no text is cut off or overlapping                                            | P1       |        |

---

## 7. Files, exports and uploads

| #   | Check                                                   | Expected                                                                | Priority | Result |
| --- | ------------------------------------------------------- | ----------------------------------------------------------------------- | -------- | ------ |
| 7.1 | Upload an allowed file (e.g. PDF within the size limit) | Succeeds and appears in the list.                                       | P0       |        |
| 7.2 | Upload a disallowed type (e.g. `.exe`)                  | Rejected with a message that states the allowed types.                  | P0       |        |
| 7.3 | Upload an oversized file                                | Rejected with a message that states the size limit.                     | P0       |        |
| 7.4 | Download link shared with someone outside the workspace | Denied.                                                                 | P0       |        |
| 7.5 | Reuse an old download link after some time              | Expired, with a clear message and a way to request a new one.           | P1       |        |
| 7.6 | Retry a denied download repeatedly                      | A short cooldown message appears rather than an endless loop of errors. | P1       |        |
| 7.7 | Export audit (admin)                                    | Lists who downloaded what, in which workspace, and when.                | P1       |        |

---

## 8. Adverse conditions

| #   | Scenario                | How to simulate                                                                   | Expected                                                                                              | Priority | Result |
| --- | ----------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | -------- | ------ |
| 8.1 | AI service outage       | Ask an engineer to disable the AI key in preview, then use an AI-assisted feature | Friendly "AI is temporarily unavailable" message; the rest of the app keeps working; nothing is lost. | P0       |        |
| 8.2 | AI fair-use limit       | Trigger an AI feature repeatedly in quick succession                              | A clear limit message with when to retry — not a crash or a silent failure.                           | P0       |        |
| 8.3 | Slow network            | Browser DevTools → Network → "Slow 4G"                                            | Loading indicators appear; no blank white screens; no duplicate submissions.                          | P0       |        |
| 8.4 | Offline mid-action      | DevTools → Network → Offline, then save                                           | A retryable error; your input is not lost.                                                            | P1       |        |
| 8.5 | Session expiry          | Sign in, leave the tab idle for the session lifetime, then act                    | Redirected to sign-in and returned to where you were after signing back in.                           | P0       |        |
| 8.6 | Two tabs, one signs out | Sign out in tab A, act in tab B                                                   | Tab B recognises the sign-out instead of showing stale private data.                                  | P0       |        |
| 8.7 | Unknown URL             | Visit `/does-not-exist`                                                           | Branded not-found page with a way back — not a raw error.                                             | P1       |        |
| 8.8 | Empty workspace         | Brand-new account, open each main page                                            | Helpful empty state with a next action, not a broken layout.                                          | P0       |        |

---

## 9. Content, branding and SEO

| #   | Check                                 | Expected                                                                                              | Priority | Result |
| --- | ------------------------------------- | ----------------------------------------------------------------------------------------------------- | -------- | ------ |
| 9.1 | Product naming                        | UseCasesX™ / AI Use Case Studio™ used consistently; no leftover placeholder names.                    | P0       |        |
| 9.2 | Launch and founding dates             | 14 August 2026 launch and 31 December 2026 founding-access end shown correctly wherever dates appear. | P0       |        |
| 9.3 | Enterprise claims                     | Nothing implies planned Enterprise capability is already live.                                        | P0       |        |
| 9.4 | No fake data                          | No sample metrics or placeholder records presented as real.                                           | P0       |        |
| 9.5 | Page titles and previews              | Share a public use-case link in a chat app; the title, description and preview image are correct.     | P1       |        |
| 9.6 | Every navigation item leads somewhere | No dead links or empty pages in the sidebar or footer.                                                | P0       |        |

---

## 9a. Pilot evidence & release freeze

| #    | Check                      | Expected                                                                                                 | Priority | Result |
| ---- | -------------------------- | -------------------------------------------------------------------------------------------------------- | -------- | ------ |
| 9a.1 | Triage panel loads         | Administration → Pilot programme shows "Triage & release readiness" for platform admins only.            | P0       |        |
| 9a.2 | Non-admin cannot read it   | A contributor/viewer sees the access message, never the findings or the verdict.                         | P0       |        |
| 9a.3 | Verdict is explicit        | The panel states Go / Conditional Go / No-Go / No-Go on evidence with the reasons behind it.             | P0       |        |
| 9a.4 | Reported blockers are P0   | A checkpoint answered with "I was blocked" appears as a P0 finding naming the mission step.              | P0       |        |
| 9a.5 | No fabricated metrics      | With no evidence the panel shows an empty state, not zeros presented as findings.                        | P0       |        |
| 9a.6 | Evidence deep links work   | "View evidence" opens the pilot, requests, observability or launch-learning surface behind each finding. | P1       |        |
| 9a.7 | Known issues match reality | `docs/product/known-issues-2026-08-14.md` matches what the triage panel currently reports.               | P0       |        |
| 9a.8 | Freeze respected           | After the freeze date, only P0 fixes and evidence-backed copy corrections have been merged.              | P0       |        |

---

## 10. Sign-off

| Field                         | Value              |
| ----------------------------- | ------------------ |
| Release / build               |                    |
| Environment URL               |                    |
| Tester                        |                    |
| Date                          |                    |
| P0 failures                   |                    |
| P1 failures with owner + date |                    |
| Decision                      | **Go** / **No-Go** |

A release is **Go** only when every P0 row is ✅ or ⚠️ with an accepted note. Any ❌ on a P0 row is **No-Go**.
