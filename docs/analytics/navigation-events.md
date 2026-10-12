# Product navigation analytics

Status: implemented. Uses the existing `product_events` stream — **no new analytics vendor**.

Companion to [`docs/architecture/auditability-and-instrumentation.md`](../architecture/auditability-and-instrumentation.md).

## Why

Launch learning needs to know whether people find and use modules through the
enterprise chrome (sidebar, workspace switcher, command palette). That is a
**product** question, not a governance question — so events land in
`product_events`, not `audit_events`.

## Transport (do not invent another)

| Layer | Location |
| ----- | -------- |
| Catalogue | `src/lib/telemetry/events.ts` → `PRODUCT_EVENTS` |
| Privacy helpers | `src/lib/telemetry/navigation-analytics.ts` |
| Browser writer | `recordProductEvent` → `product_events` |
| Ambient context | `useNavAnalyticsContext` (plan / roleCategory / workspaceType) |

CTA / discovery marketing events (`cta_events` via `src/lib/usecasex.tracking.ts`)
remain separate. Do **not** duplicate repository `search_used` into product
navigation; command-palette search uses `nav.search_used` with counts only.

## Event catalogue

| Intent (brief) | Catalogue key | Stored `event_name` | When |
| -------------- | ------------- | ------------------- | ---- |
| navigation_clicked | `navigationClicked` | `nav.clicked` | Sidebar link or command-palette nav/action selected |
| sidebar_expanded | `sidebarExpanded` | `nav.sidebar_expanded` | Icon rail or nav section opened |
| sidebar_collapsed | `sidebarCollapsed` | `nav.sidebar_collapsed` | Icon rail or nav section closed |
| workspace_switched | `workspaceSwitched` | `nav.workspace_switched` | Successful workspace switch |
| command_palette_opened | `commandPaletteOpened` | `nav.command_palette_opened` | Palette opened (button or Ctrl/Cmd+K) |
| search_used | `searchUsed` | `nav.search_used` | Command-palette entity search completed |
| module_opened | `moduleOpened` | `nav.module_opened` | Navigation lands in a different module than the current path |
| nav_variant_active | `navVariantActive` | `nav.variant_active` | Signed-in chrome mounted (`classic` \| `enterprise_v2`) |
| nav_render_error | `navRenderError` | `nav.render_error` | Enterprise chrome threw; classic fallback (rollout monitor) |

Rollout flag: `VITE_ENTERPRISE_NAVIGATION_V2_ENABLED` — see `docs/releases/enterprise-navigation-v2-rollout.md`.

These are **not** part of `ACTIVATION_FUNNEL`. Activation business events
(`opportunity.captured`, `use_case.scored`, `report.exported`, …) stay as they
are and must not be re-emitted from chrome clicks.

## Allowed metadata

Every navigation payload is passed through `sanitizeNavProperties` (allow-list).
Only these keys may appear in `properties`:

| Key | Values | Notes |
| --- | ------ | ----- |
| `navigationItemId` | Stable nav id (`repository`, `entity:use_case`, section id, …) | Never entity UUIDs, titles, or labels |
| `module` | Coarse module id (`discover`, `design`, `portfolio`, …) | Derived from section/path maps |
| `workspaceType` | `lite` \| `pro` \| `enterprise` \| `unknown` | Org/entitlement edition bucket |
| `roleCategory` | Workspace role enum, `platform`, or `unknown` | Not a display name |
| `plan` | `lite` \| `pro` \| `enterprise` \| `unknown` | From `usePlan().tier` |
| `surface` | `sidebar` \| `command_palette` \| `icon_rail` \| `section` \| `workspace_switcher` | Where the interaction happened |
| `resultCount` | non-negative integer | Search hits only |
| `openVia` | `shortcut` \| `button` | Palette open source |

Tenant scope (`organization_id`, `workspace_id`, `user_id`) comes from the
telemetry tenant + recorder — callers never attach workspace **names**.

## Explicitly forbidden

Do **not** send any of the following (also enforced by global `redact()`):

- Use case descriptions, titles, summaries, or pattern body text
- Business-confidential portfolio/opportunity content
- Personal information (email, name, phone, …)
- AI prompts, completions, or chat transcripts
- Uploaded document content or storage paths that encode filenames with PII
- Financial values (ROI, budgets, benefit amounts)
- Raw search query strings on `nav.search_used` (CTA repository search may store a **sanitized** term in `cta_events` only — different table, different purpose)

## Producers wired

| Surface | File | Events |
| ------- | ---- | ------ |
| Enterprise sidebar items / sections / icon rail | `EnterpriseSidebar.tsx`, `SidebarSection.tsx` | `nav.clicked`, `nav.module_opened`, `nav.sidebar_*` |
| Workspace switcher | `WorkspaceSwitcher.tsx` | `nav.workspace_switched` |
| Command palette | `NavCommandTrigger.tsx` | `nav.command_palette_opened`, `nav.search_used`, `nav.clicked`, `nav.module_opened` |

## Related streams (do not conflate)

| Stream | Table | Purpose |
| ------ | ----- | ------- |
| Product / nav / activation | `product_events` | Launch learning |
| Governance audit | `audit_events` | Who changed what |
| Public CTA / discovery | `cta_events` | Marketing funnel (includes repository `search_used`) |

## Tests

- `tests/unit/navigation-analytics.test.ts` — allow-list, role/plan mapping, path→module, no forbidden keys.
- Existing `tests/unit/telemetry.test.ts` — catalogue uniqueness / redaction still applies.

## Rules for new call sites

1. Extend `PRODUCT_EVENTS` — never invent free-text event names.
2. Call helpers in `navigation-analytics.ts` (or `trackNavEvent` with sanitized props).
3. Prefer `useNavAnalyticsContext()` for `plan` / `roleCategory` / `workspaceType`.
4. Fire-and-forget only; never block navigation on telemetry.
5. If a business activation event already covers the outcome, do not add a chrome duplicate.
