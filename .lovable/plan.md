# UseCaseX™ — Build out the full module

Phase A (rebrand, taxonomy, schema, hydration fix) is already live. This plan covers everything you just listed, sequenced so each milestone is shippable on its own.

## Phase B — Free / Lite discovery (next up)

- **Landing** `/` — hero with PRD positioning line, industry tile grid (18), featured use cases strip, "How it works" (Browse → Filter → Save → Score → Export), CTA band → register Pro / explore.
- **Explore** `/explore` — keep current dense library, add facets: AI Type, Business Objective, Value Potential, Complexity, Risk Level, Time to Value (in addition to Industry / Function / Maturity). Sort: recent, impact, maturity, featured.
- **Detail** `/cases/:slug` — restructured into PRD sections: Business Problem · AI Solution Concept · Business Value · Data Required · KPIs · ROI Areas · Risk & Governance · Recommended Platforms. CTA strip → AdvisorX / FlowX / PrivacyX / AssureX (all logged to `cta_events`).
- **Lead Capture** modal — gates Lite PDF download + "Talk to AIgilityX" CTA. Writes to `lead_captures` (name, email, company, role, country, industry, interest, source).
- **Lite PDF** export — single use case, branded one-pager (problem, solution, value, KPIs, risk, CTA QR back to hub).

## Phase C — Pro (registered) experience

- **Auth** — email/password + Google sign-in. Routes: `/login`, `/register`, `/forgot-password`, `/reset-password`. `_authenticated` layout gate.
- **Profiles** — auto-created on signup (display name, company, role, industry, country, plan = `lite|pro`).
- **Workspace** — save use cases, add private notes, assign priority + status (`draft → shortlisted → ready_for_pilot → in_pilot → scaled`), group into portfolios.
- **Scoring engine** — per PRD formula:
  `total = strategic*0.20 + value*0.25 + feasibility*0.20 + risk_inv*0.15 + readiness*0.10 + ttv_inv*0.10`
  stored per (user, use_case) so each user has their own scores.
- **Pro Dashboard** — KPI tiles (saved, scored, quick wins, high-risk), charts by Industry / Function / AI Type / Maturity, top opportunities, recent activity.
- **Pro Report** — multi-use-case portfolio PDF (cover, exec summary, scoring matrix, per-case detail).

## Phase D — Admin panel

- `/admin` gated by `admin`/`moderator` roles (already in `user_roles`).
- **Taxonomies CMS** — CRUD for industries, functions, AI types, objectives.
- **Use Cases CMS** — full PRD form (Identification / Classification / Strategic / Risk & Governance / Publishing), workflow `draft → review → approved → published → archived`, `use_case_audit_log`.
- **AI-assisted intake** — paste a paragraph, Lovable AI Gateway (`google/gemini-2.5-flash`) drafts structured use case fields. Admin reviews + edits.
- **Bulk CSV import** for use cases + taxonomies.
- **Leads inbox** — `lead_captures` table view, status (`new → contacted → qualified → won → lost`), CSV export.
- **Analytics** — views, CTA clicks, top searched filters, top platforms hit.

## Phase E — API-Ready extension + CTA hooks

- **Public API** under `/api/public/usecasex/`:
  - `GET /use-cases` (filters, paginated)
  - `GET /use-cases/:slug`
  - `GET /taxonomies`
  - API-key auth + per-key rate limiting; `api_keys` + `integration_events` tables.
- **CTA hook routes** — outbound deep links with stable query contract `?source=usecasex&use_case_id=…&user_id=…&signature=…` for:
  - **SARPI™** (Strategic AI Roadmap & Portfolio Intelligence) — sends scored portfolio
  - **CyberX C3G™** (Cybersecurity / Compliance / Controls / Governance) — sends use case + risk + governance fields
  - AdvisorX™, FlowX™, PrivacyX™, AssureX™, AuditX™, RegulatorX™, ComplyX™, ARES™, ConversX™, SimulaX™, AI ROI Calculator™
- All clicks captured in `cta_events`; outbound payloads logged in `integration_events`.

## Technical section

Schema additions per phase:
- B: none (Phase A already added `lead_captures` + `cta_events`).
- C: `profiles`, `user_saved_use_cases`, `user_scores`, `user_portfolios`, `user_portfolio_items`. RLS scoped to `auth.uid()`. Google OAuth via `configure_social_auth`.
- D: `use_case_audit_log`, optional `taxonomy_audit_log`.
- E: `api_keys` (hashed, per-user, scoped), `integration_events` (source, target_platform, use_case_id, payload, status).

Server logic: `createServerFn` for all app-internal reads/writes (RLS via `requireSupabaseAuth`); server routes only for `/api/public/usecasex/*` and webhook-style hook endpoints. PDFs generated server-side with a Worker-compatible library (pdf-lib).

UI: existing Sovereign / Institutional dark palette preserved across every new surface. shadcn + Tailwind tokens only.

AI: Lovable AI Gateway (`LOVABLE_API_KEY` already provisioned) — no extra keys.

## Proposed execution order

```text
Phase B  Free/Lite discovery + Lead Capture + Lite PDF
Phase C  Auth + Pro workspace + Scoring + Pro Dashboard + Pro Report
Phase D  Admin panel (CMS + AI intake + leads + analytics)
Phase E  Public API + CTA hooks (SARPI, CyberX C3G, ...)
```

I'll ship **Phase B end-to-end first**, then pause for you to test before C. Each phase is ~1 substantive build. If you want me to chain B→C without stopping, say "go straight through C".
