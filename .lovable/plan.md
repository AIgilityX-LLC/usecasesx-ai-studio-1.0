# UseCaseX™ Final Version 1.0 — AI Hub Module Plan

## Goal

Restructure the current app so UseCaseX™ becomes an **independent module inside the AIgilityX AI Hub**, with only **two user tiers** — Free/Lite (public) and Pro (free with registration). Remove the Enterprise tier. Add an API-ready extension layer (preview) that future platforms (SARPI, CyberX C3G, AdvisorX, FlowX, PrivacyX, AssureX, AI ROI Calculator, AuditX, RegulatorX, ComplyX, ARES, ConversX, SimulaX) can consume.

Visual direction: premium enterprise AI platform — white background, dark navy headings, electric blue CTAs, subtle cyan accents, clean cards, executive-friendly, mobile-responsive, Apple + Big4 consulting style.

## Route Architecture

```text
src/routes/
  __root.tsx                                       (existing — keep)
  index.tsx                                        → redirect to /ai-hub
  auth.tsx                                         (existing — keep)

  ai-hub.tsx                                       → AI Hub layout (Outlet)
  ai-hub.index.tsx                                 → /ai-hub  (Hub home)
  ai-hub.usecasex.tsx                              → UseCaseX layout (Outlet, sub-nav)
  ai-hub.usecasex.index.tsx                        → UseCaseX Home (Free/Lite landing)
  ai-hub.usecasex.explore.tsx                      → Explore Use Cases (Lite)
  ai-hub.usecasex.$slug.tsx                        → Use Case Detail (Lite)
  ai-hub.usecasex.pro.tsx                          → Pro registration / upgrade page
  ai-hub.usecasex.dashboard.tsx                    → Pro Dashboard
  ai-hub.usecasex.saved.tsx                        → Saved Use Cases (Pro)
  ai-hub.usecasex.portfolio.tsx                    → AI Opportunity Portfolio (Pro)
  ai-hub.usecasex.reports.tsx                      → Reports (Pro)
  ai-hub.usecasex.admin.tsx                        → Admin (role-gated, visible only to admins)
  ai-hub.usecasex.api-integration-preview.tsx      → API + integration events preview
```

**Removed / not created:** `/ai-hub/usecasex/enterprise`, `/ai-hub/usecasex/enterprise-preview`.

**Legacy routes:** `cases.$slug.tsx`, `explore.tsx`, `submit.tsx` will be replaced by the new tree. We'll redirect `/` → `/ai-hub` and `/explore` → `/ai-hub/usecasex/explore` to keep deep links alive.

## Navigation

**AI Hub top nav (`AIHubNavbar`):**
Home · AI Readiness · AI ROI Calculator · **UseCaseX** · AI Strategy Canvas · AI Governance Toolkit · Reports · Dashboard.
Only UseCaseX and Home wire to real routes in v1.0; the rest render as "Coming soon" placeholders inside the Hub layout (keeps positioning consistent without dead links).

**UseCaseX sub-nav (inside `ai-hub.usecasex.tsx` layout):**
UseCaseX Home · Explore Use Cases · Pro Dashboard · Saved Use Cases · AI Opportunity Portfolio · Reports · API Integration Preview · **Admin** (only visible if `has_role(uid, 'admin')`).

## Tier Behavior

| Feature | Free / Lite (public) | Pro (free w/ registration) |
|---|---|---|
| Browse / search / filter | ✅ | ✅ |
| View use case detail | ✅ | ✅ |
| Lead capture modal | ✅ | n/a |
| Lite PDF (after lead capture) | ✅ | ✅ |
| Save use cases | ❌ → CTA "Sign up free" | ✅ |
| Score use cases | ❌ | ✅ |
| Portfolios | ❌ | ✅ |
| Reports / Dashboard | ❌ | ✅ |
| Admin | ❌ | role-gated |

All Pro routes wrap their content in an "auth required" guard that redirects to `/auth?next=...`. Admin route additionally checks `user_roles.role = 'admin'`.

## API / Integration Extension Layer

`/ai-hub/usecasex/api-integration-preview` shows a static, executive-friendly preview of the planned public API and integration-event contract. Includes:

- Stable query contract: `?source=usecasex&use_case_id=…&user_id=…&signature=…`
- Endpoint table: `GET /api/public/usecasex/use-cases`, `GET /api/public/usecasex/use-cases/:slug`, `POST /api/public/usecasex/events`
- 13 platform consumer cards (SARPI, CyberX C3G, AdvisorX, FlowX, PrivacyX, AssureX, AI ROI Calculator, AuditX, RegulatorX, ComplyX, ARES, ConversX, SimulaX) rendered via `PlatformBadge`
- Sample payloads + cURL snippets

The actual `api_keys` / `integration_events` tables and routes are NOT built in v1.0 — this page is a credible preview only, structured so the same code can later read from real endpoints.

## Reusable Components

Created under `src/components/`:

- `AppShell.tsx` — outer page shell (background, footer)
- `AIHubNavbar.tsx` — top nav for the Hub
- `UseCaseXSubNav.tsx` — second-level nav for UseCaseX module
- `UseCaseXHero.tsx` — landing hero with positioning headline
- `IndustryFocusedSection.tsx` — industry grid
- `UseCaseCard.tsx`
- `UseCaseFilters.tsx`
- `UseCaseDetail.tsx`
- `LeadCaptureModal.tsx` (refactor of existing)
- `CTAButtonGroup.tsx` — primary/secondary CTA cluster
- `PlatformBadge.tsx` — branded chip for SARPI / CyberX C3G / etc.
- `ScoreCard.tsx` — scoring tile (Pro)
- `PortfolioCard.tsx` (Pro)
- `ReportPreview.tsx` (Pro)
- `AdminDataTable.tsx` (Admin)
- `AdminUseCaseForm.tsx` (Admin)
- `AnalyticsCard.tsx`
- `EmptyState.tsx`
- `LoadingSkeleton.tsx`

## Data Strategy

- All component data is fetched via a thin `src/lib/usecasex.data.ts` layer with typed mock data for now.
- The layer's function signatures (`listUseCases`, `getUseCase`, `listIndustries`, `saveUseCase`, `getPortfolio`, etc.) match the existing Supabase server functions so the file can be swapped to live `createServerFn` calls without touching components.
- Real DB writes (saved, portfolio, scores) remain TODO — Pro routes render their UIs against the mock layer and stub mutations with optimistic local state for v1.0.

## Design System

Update `src/styles.css` semantic tokens:

- `--background: #ffffff` (light is now default)
- `--foreground: navy 950` (dark navy headings)
- `--primary: electric blue` (`oklch(0.58 0.22 255)`)
- `--accent: cyan 400` (subtle)
- `--card`, `--border`, `--muted` retuned to a clean executive palette
- Existing dark/cyan video hero retired — replaced with white hero, navy headline, electric blue CTA, soft cyan ambient gradient.

The previously-saved core memory ("dark navy hero with cyan accents") is now superseded; updated to reflect the executive white theme.

## Implementation Order

1. Update `styles.css` tokens to executive white/navy/electric blue.
2. Build core layout primitives: `AppShell`, `AIHubNavbar`, `UseCaseXSubNav`, `EmptyState`, `LoadingSkeleton`, `CTAButtonGroup`, `PlatformBadge`.
3. Build data layer `src/lib/usecasex.data.ts` (mock-first, Supabase-shaped).
4. Build presentational components: `UseCaseXHero`, `IndustryFocusedSection`, `UseCaseCard`, `UseCaseFilters`, `UseCaseDetail`, `ScoreCard`, `PortfolioCard`, `ReportPreview`, `AnalyticsCard`, `AdminDataTable`, `AdminUseCaseForm`.
5. Create the new route tree (`ai-hub.*`) and convert `/` to redirect to `/ai-hub`.
6. Wire Pro auth guard + Admin role guard.
7. Refactor existing `LeadCaptureModal`; retire `cases.$slug`, `explore`, `submit` routes (redirects).
8. Final QA pass: mobile responsiveness, nav active states, Admin visibility, all 11 new routes load.

## Out of Scope for v1.0

- Real Pro persistence (save / score / portfolio writes) — UIs stubbed.
- Real API keys + integration_events tables — preview page only.
- Email-templated Lite PDF — keeps current generator.
- 12 secondary Hub routes (AI Readiness, ROI, etc.) — "Coming soon" placeholders.

After approval I'll execute steps 1–8 in order.
