# Pro Version Launch Status — 17 August 2026

Evidence-based snapshot. Scores are readiness percentages, not opinions.

| Dimension | Score | Verdict |
| --- | --- | --- |
| Investor Ready | 85% | Yes, with caveats |
| Client Ready | 70% | Pilot-only |
| Demo Ready | 92% | Yes |
| Production Ready | 65% | No — not GA |

## Evidence

- Build, typecheck, lint green; 476 unit tests pass.
- 54 published use cases with provenance labels; facets, keyword relevance, saved presets live.
- Core journey Discover → Capture → Design → Score → Prioritize → Portfolio → Roadmap → Export → Advisory is navigable; Roadmap/Advisory partially "Coming".
- Lead pipeline verified live this date: waitlist submit → `lead_captures` row (`UCX-73B34D0A`, UTM captured) → resend action recorded `email_resend_requested` with the admin note and `email_attempt` #2 on the timeline.
- Email delivery blocked: sender domain `aigilityx.com` is `initiated`, API returns `domain_not_verified`. 0 of 3 leads have status `sent`.
- Pilot cohort: 0 invitations, 0 active participants — no field evidence.
- Browser/E2E: 36 failures outstanding (Playwright runner + unauthenticated preview session).
- Canonical host `usecasesx.aigilityx.com` not connected; app serves `ai-venture-atlas.lovable.app`.
- Production data audit: demo accounts still hold platform roles; 5 demo tenants unflagged.

## Blockers to declare Pro GA

1. Verify email sender domain (unblocks all confirmations, retries and alerts).
2. Connect the canonical custom domain and re-run live SEO/analytics verification.
3. Enroll 15–25 pilot seats or record an approved evidence waiver.
4. Fix the 36 browser test failures and run the signed-in P0 journey suite.
5. Apply the demo-account role revocation and demo-tenant labelling remediations.
6. Record the seven runbook owners and set `PRODUCTION_URL` / `ALERT_WEBHOOK_URL`.

Items 1–3 and 5 are configuration/operations, not code.
