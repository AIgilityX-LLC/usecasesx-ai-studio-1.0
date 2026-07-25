# Entity mapping — DB → product domain (2026-07-25)

Maps physical tables to the modular domains named in `AGENTS.md` §2, so we
can see coverage and gaps before the 14 August launch.

| Domain (AGENTS.md)            | Tables                                                                                                                       | Notes / gaps                                                                                              |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| identity / access             | `auth.users` (Supabase-managed), `profiles`, `user_roles`                                                                    | Roles table separated — good. No `memberships` table.                                                     |
| organization / workspaces     | `organizations`, `workspaces`                                                                                                | Single-workspace-per-org assumed today (`ensure_user_workspace` returns first). No memberships table.     |
| repository (curated catalogue)| `use_cases`, `use_case_patterns`, taxonomies + `use_case_*` join tables                                                       | Two parallel entities: `use_cases` (curated) vs `ai_use_cases` (tenant Studio). Vocabulary risk.          |
| opportunities / Studio        | `use_case_boards`, `ai_use_cases`, `use_case_submissions`                                                                    | Submissions flow through curator to become `use_cases`. `submission_status` enum controls state.          |
| Studio design                 | `blueprints`, `use_case_deliverables`, `data_readiness_assessments`, `integration_links`                                     | All cascade off `ai_use_cases`. Tenancy inherited via board.                                              |
| scoring                       | `use_case_scores` (user-owned), `feasibility_scores` (tenant), `use_case_ratings` (user-owned public)                        | Two different score models — document distinction in domain glossary.                                     |
| portfolios / prioritisation   | `portfolios`, `portfolio_items`, `shortlists`, `saved_use_cases`, `collections`, `collection_items`                          | All user-owned today. No workspace-owned portfolio. Enterprise gap.                                       |
| Opportunity Map               | (derived from `use_cases` + taxonomy) — no dedicated table                                                                   | Compute-only for now. OK.                                                                                 |
| roadmap                       | (none yet)                                                                                                                   | **Gap** — planned post-launch.                                                                            |
| value / benefits              | `use_case_metrics`, `use_case_scores.roi_*` fields                                                                            | Distributed. Consolidate post-launch.                                                                     |
| workshops                     | (none)                                                                                                                       | **Gap** — deferred to Enterprise.                                                                         |
| reporting                     | `generated_reports`, `use_case_downloads`, `use_case_views`                                                                  | User-owned; no workspace share yet.                                                                       |
| AI services                   | (no persistent table; provider-neutral gateway)                                                                                | OK.                                                                                                       |
| integrations                  | `integration_links`, `integration_events`, `external_module_links`, `platform_modules`                                        | External module registry lives here.                                                                      |
| administration                | admin-tier RLS everywhere; no dedicated table                                                                                 | OK.                                                                                                       |
| audit                         | `audit_events`, `use_case_audit_log`                                                                                          | Append-only. Verify no UPDATE/DELETE policies (see risk matrix).                                          |
| observability / analytics     | `cta_events`, `module_events`, `lead_captures`, `use_case_feedback`                                                          | Anonymous-ingest surfaces. WITH CHECK correctness matters.                                                |
| entitlements                  | `profiles.entitlement_tier`, `profiles.plan_type`, `profiles.entitlement_expires_at`                                          | Embedded on profile. **Gap** — dedicated `entitlements` table post-launch for auditability.               |

## Gaps to record for post-launch

1. **`memberships` table** — multi-user workspaces are simulated via
   `profiles.organization_id`. Blocks Enterprise design partner engagements
   where one user belongs to multiple orgs.
2. **`entitlements` table** — Founding Access lifecycle (complimentary
   through 31 Dec 2026) has no dedicated ledger; source of truth is a
   column on `profiles`.
3. **`roadmap` and `workshops` domains** — no schema yet.
4. **`use_cases` vs `ai_use_cases` naming** — publish a domain glossary so
   both editors and engineers know which one they mean.
5. **`is_demo` flag on `organizations`** — seed accounts share tables with
   real users; no way to hide demo orgs from Enterprise reporting.

None of these gaps block the 14 August launch on their own; all are
recorded in `migration-plan.md` as additive proposals.
