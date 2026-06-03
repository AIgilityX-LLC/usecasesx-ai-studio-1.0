# UseCasesX™ — Pre-Beta End-to-End Test Plan (`v1.0.0-beta.1`)

Scope: every flow that must work before opening the app to friendly
testers. Each test lists a precise pass/fail criterion. Run the whole
plan once per release candidate; re-run only the affected section after
a hotfix.

**Test environments**
- Preview: `https://project--8c200374-44e0-46bb-98cf-28acedbdad9c-dev.lovable.app`
- Production (published): `https://project--8c200374-44e0-46bb-98cf-28acedbdad9c.lovable.app`

**Demo accounts** (password `Demo@786` for all): see
`docs/DEMO_TESTING.md` for the full role matrix. Tests below assume
those accounts exist.

Legend: **PASS** = matches the expected result exactly. **FAIL** =
anything else, including console errors or slow (>5 s) page loads.

---

## A · Free / Lite flows (anonymous visitor)

| # | Test | Steps | Pass criterion |
|---|---|---|---|
| A1 | Landing loads | Visit `/` | Hero, Industry Focused section, and footer render; no console errors |
| A2 | Industry section populated | On `/`, scroll to Industry Focused | At least 6 industry cards visible (from seeded taxonomy) |
| A3 | Explore loads | Visit `/ai-hub/usecasex/explore` | Page renders; filter rail shows Industries, Business Functions, AI Capabilities; ≥1 use case card visible |
| A4 | Search | Type a known title fragment in the search input | Result list narrows; matching card present |
| A5 | Filter — industry | Tick one industry filter | URL updates; only matching cards remain |
| A6 | Filter — capability | Tick one AI capability filter | URL updates; only matching cards remain |
| A7 | Card → detail | Click a use case card | Detail page loads; title, summary, 8 content blocks (Business Problem … Platforms) render |
| A8 | Lead capture modal | On a detail page, click **Download Lite PDF** | Modal opens with name/email/company fields |
| A9 | Lead capture submit | Fill modal with valid email and submit | Modal closes; toast shows success; new row in `lead_captures` with `source_use_case` set |
| A10 | Lite PDF download | After A9 | PDF downloads in browser; opens; contains use case title + summary |
| A11 | CTA tracked | After A8 | New row in `cta_events` with `cta` set and `source_page = '/ai-hub/usecasex/<slug>'` |
| A12 | Pro gating | Click **Save to Workspace** while signed out | Redirected to `/ai-hub/usecasex/pro` (or `/auth`); no save attempted |
| A13 | Hidden content blocked | In SQL, set a use case `visibility = 'pro'`; reload Explore as anon | Card not visible in list or detail page (404 or "not found") |

## B · Pro flows (signed-in `pro@aigilityx.com`)

| # | Test | Steps | Pass criterion |
|---|---|---|---|
| B1 | Sign up | New email + password on `/auth` (sign-up tab) | Account created; email verification flow starts; no anon sign-up used |
| B2 | Sign in | `pro@aigilityx.com` / `Demo@786` | Lands on dashboard or profile-complete prompt |
| B3 | Profile completion | First sign-in → `/ai-hub/usecasex/profile` | Form requires org, industry, interest; submit persists to `profiles.profile_completed = true` |
| B4 | Dashboard | `/ai-hub/usecasex/dashboard` after profile complete | Renders portfolio summary, saved counts, recent scores |
| B5 | Save use case | On detail page, click **Save** | Toast confirms; new row in `saved_use_cases`; button toggles to "Saved" |
| B6 | Remove saved | On `/ai-hub/usecasex/saved`, click remove | Row disappears; `saved_use_cases` row deleted |
| B7 | Score use case | Open a use case in Pro dashboard → score 5 dimensions | `use_case_scores` row created with `total` computed |
| B8 | Portfolio create | `/ai-hub/usecasex/portfolio` → New portfolio | `portfolios` row created with `user_id = auth.uid()` |
| B9 | Add to portfolio | From dashboard, add a saved use case | `portfolio_items` row created |
| B10 | Reports | `/ai-hub/usecasex/reports` → generate executive report | `generated_reports` row created; PDF/HTML preview opens |
| B11 | Pro-only visibility | On Explore, content marked `pro` is visible | Card visible to signed-in Pro user (not just admin) |
| B12 | Cross-user isolation | While signed in as Pro, query `saved_use_cases` for another user | Returns zero rows (RLS enforces own-only) |

## C · Admin flows (signed-in `admin@aigilityx.com`)

| # | Test | Steps | Pass criterion |
|---|---|---|---|
| C1 | Admin route | `/ai-hub/usecasex/admin` | Loads (no Access Denied); tabs visible: Overview, Use Cases, Add New, Taxonomy, Platforms, Leads, CTA Analytics, Reports, Settings |
| C2 | Add use case | Add New tab → fill form → save as Draft | New `use_cases` row with `status='draft'`, `submitted_by = admin uid` |
| C3 | Edit use case | Edit a draft | Changes persist on reload |
| C4 | Publish | Click Publish on a draft | `status='published'`, `published_at` set; appears on Explore |
| C5 | Unpublish | Click Unpublish on a published row | `status='draft'`; disappears from public Explore |
| C6 | Archive (delete) | Click Archive on a row | Row removed (or `status='archived'`); not visible publicly |
| C7 | Duplicate | Click Duplicate | New row with `_copy` slug appears in list |
| C8 | Taxonomy CRUD | Add an industry → publish → reload Explore | New industry appears in filter |
| C9 | Leads tab | Leads tab loads | Lists `lead_captures` rows (admin-tier RLS) |
| C10 | CTA Analytics | CTA Analytics tab loads | Lists `cta_events` rows; aggregate counts shown |
| C11 | Moderator restriction | Sign in as `moderator@aigilityx.com` → admin console | Archive button hidden; everything else accessible |
| C12 | Contributor blocked | Sign in as `contributor@aigilityx.com` → `/ai-hub/usecasex/admin` | "Access denied" card |
| C13 | Admin-tier RLS | As a user with `usecasex_admin` role only, visit Leads tab | Rows returned (RLS extended in MINOR-1 patch) |

## D · Integrations (SARPI + CyberX C3G)

| # | Test | Steps | Pass criterion |
|---|---|---|---|
| D1 | SARPI CTA emits CTA event | Pro user opens use case → **Track in SARPI** | New `cta_events` row: `cta='track_in_sarpi'`, `target_platform='sarpi'`, `source_page='use_case_detail'` |
| D2 | SARPI emits integration event | Same click | New `integration_events` row: `source_module='usecasex'`, `target_module='sarpi'`, `event_type` set, `payload` contains use_case_id, kpis, roi_areas, recommended_platforms |
| D3 | SARPI route | After click | Browser navigates to `/sarpi?source=usecasex&use_case_id=<id>`; stub page renders friendly message |
| D4 | CyberX CTA emits CTA event | Pro user opens use case → **Send to CyberX Governance Review** | New `cta_events` row: `cta='send_to_cyberx_governance'`, `target_platform='cyberx_c3g'` |
| D5 | CyberX emits integration event | Same click | New `integration_events` row with `target_module='cyberx_c3g'`, payload contains governance_notes, cybersecurity_notes, privacy_notes, recommended_platforms |
| D6 | CyberX route | After click | Browser navigates to `/cyberx/c3g/intake?source=usecasex&use_case_id=<id>`; stub page renders friendly message |
| D7 | RPC payload completeness | Call `rpc('get_use_case_integration_package', { use_case_uuid })` | Returns all 28 keys: use_case_id, title, slug, short_description, full_description, industry_name, function_name, ai_type_name, value_potential, complexity_level, risk_level, maturity_level, time_to_value, business_problem, ai_solution, data_required, kpis, roi_areas, implementation_steps, governance_notes, cybersecurity_notes, privacy_notes, recommended_platforms, tags, governance_required, privacy_review_required, cyber_review_required, assurance_review_required, plus readiness flags |
| D8 | Anonymous RPC scope | Call RPC anonymously for a `pro`-only use case | Returns `NULL` (visibility enforced) |
| D9 | Console clean | After D1–D6 | DevTools console shows no red errors |

## E · PDF & report generation

| # | Test | Steps | Pass criterion |
|---|---|---|---|
| E1 | Lite PDF (anonymous) | Submit lead form on detail page | PDF downloads with use case title, summary, "Generated for <name>" footer |
| E2 | Lite PDF tracked | After E1 | New row in `use_case_downloads` with `asset_kind='lite_pdf'` |
| E3 | Pro executive report | `/ai-hub/usecasex/reports` → New report → pick 2-3 saved use cases → generate | Report previews; `generated_reports` row created with `use_case_count = N` and `payload` populated |
| E4 | Report own-only | Sign in as a different user → query `generated_reports` | Sees only own rows (RLS) |
| E5 | Report contains data | Open generated report preview | Each selected use case has title, summary, scores, ROI areas, KPIs |
| E6 | Report empty state | Generate with no use cases selected | UI blocks submit OR shows clear empty state — no crash |

## F · Security & RLS

| # | Test | Steps | Pass criterion |
|---|---|---|---|
| F1 | RLS coverage | Run linter / `pg_tables` query | Every `public` table has `rowsecurity = true` |
| F2 | Saved isolation | User A saves; User B queries `saved_use_cases` | Zero rows visible to B |
| F3 | Scores isolation | Same as F2 for `use_case_scores` | Zero rows |
| F4 | Portfolios isolation | Same as F2 for `portfolios` + `portfolio_items` | Zero rows |
| F5 | Hidden content | Anon → query `use_cases where visibility='hidden'` | Zero rows |
| F6 | Draft content | Anon → query `use_cases where status='draft'` | Zero rows |
| F7 | Lead capture write only | Anon submit lead → then SELECT `lead_captures` | INSERT allowed, SELECT denied |
| F8 | Admin tables locked | Pro user (no admin role) → query `lead_captures` | Returns zero rows |
| F9 | Admin-tier reach | `super_admin` / `ai_hub_admin` / `usecasex_admin` / `content_manager` / `reviewer` → query `lead_captures` | Each role returns rows (post MINOR-1 patch) |
| F10 | Edge route auth | Hit `/api/public/usecasex/use-cases` from `curl` | Returns published cases only; no draft/hidden leaked |

## G · Cross-cutting

| # | Test | Pass criterion |
|---|---|---|
| G1 | Mobile responsive | Landing, Explore, Detail at 375 px wide | No horizontal scroll, CTAs reachable, nav usable |
| G2 | Lighthouse — performance | Run on production landing | Performance ≥ 80, no broken images |
| G3 | Lighthouse — a11y | Same | Accessibility ≥ 90 |
| G4 | SEO basics | View source on landing + a detail page | Unique `<title>`, `<meta description>`, og:title, og:description per route |
| G5 | 404 | Visit `/this-does-not-exist` | Friendly 404 component renders; nav still works |
| G6 | Cloud health | Run Lovable Cloud status check | `ACTIVE_HEALTHY` |

---

## Exit criteria for pre-beta release

- **All A, D, F tests PASS.** These are non-negotiable — they protect
  the public surface, the integrations contract, and tenant data
  isolation.
- **B and C tests:** ≥ 95 % PASS, zero Blockers, ≤ 2 Minors.
- **E tests:** all PASS for E1–E5. E6 may be Minor.
- **G tests:** G1, G5, G6 PASS; G2–G4 may be Minor for pre-beta.

If any A / D / F test FAILS, **do not publish** — fix and re-run the
affected section before continuing the release checklist.
