# UseCaseX™ Reliability + Feature Expansion

This is a large multi-feature request. Below is a sequenced plan grouped by risk and dependency. Each section can be approved as-is or trimmed.

---

## 1. Safe fallback UI for missing mock/taxonomy data

- Create `src/components/MissingDataFallback.tsx` — friendly card with title, message, and "Back to AI Hub" link. Uses semantic tokens.
- Add `assertMockReady()` helper in `src/lib/usecasex.mock.ts` that returns `{ ok, reason }` based on whether `MOCK_USE_CASES` and `MOCK_TAX` are non-empty arrays/objects.
- Wire into:
  - `/ai-hub/usecasex/explore`
  - `/ai-hub/usecasex/$slug`
  - `/ai-hub/usecasex/compare` (new)
- When `assertMockReady()` fails, route renders the fallback instead of crashing. Also add `errorComponent` + `notFoundComponent` on each route.

## 2. Harden `usecasex.mock.ts` exports

- Move `MOCK_USE_CASES` and `MOCK_TAX` to be **declared and exported in a single statement near the top of the module body** so consumer files can never observe `undefined` from circular-import edge cases.
- Add a tiny `__moduleSelfCheck()` at the bottom that throws a clear, actionable message if the arrays are empty (caught by the fallback in #1).
- Add a unit-style runtime check on first import: `if (!Array.isArray(MOCK_USE_CASES)) throw …`.
- Re-export everything via a barrel `src/lib/usecasex/index.ts` so app imports go through one path.

## 3. Public use-case detail page

Already exists at `src/routes/ai-hub.usecasex.$slug.tsx` — enhance it:
- Render: title, summary, sector badge, maturity, impact (value potential), industry, business function, AI type, full tag chips (clickable → explore with filter), recommended platforms, citations/links block (mock for now, structured for future DB).
- Add JSON-LD `Article` schema and full `head()` meta (title, description, og:image-less leaf).
- "Related use cases" section (already present) — keep.
- Add "Add to Compare" button that pushes the slug to the compare store (#5).

## 4. Saved search presets (bookmarkable + shareable URLs)

- Explore page already encodes filters in URL search params via Zod. Add:
  - **Preset bar** above results: "Public Sector AI", "High Impact / Low Risk", "Agentic AI", "Defense Quick Wins", "Healthcare Clinical", "Compliance & Privacy", "Newest" — each is a `<Link to="/ai-hub/usecasex/explore" search={…}>`.
  - **"Save this view"** button → stores `{name, search}` in `localStorage` under `usecasex.savedPresets`.
  - **"Copy share link"** button → copies current URL with all filters to clipboard.
  - **My presets** dropdown lists saved presets with delete + rename.

## 5. Compare view

- New route `src/routes/ai-hub.usecasex.compare.tsx` reading `?ids=slug1,slug2,slug3` (max 4).
- New tiny zustand store `src/lib/usecasex.compare.store.ts` for transient selection + a "Compare (N)" floating button on Explore + Detail pages.
- Layout: side-by-side cards comparing — sector, maturity, value potential, complexity, risk, time-to-value, AI type, platforms, tags. Differences highlighted.
- "Recommended implementation steps" rendered from a static template keyed by `aiType` + `maturity` (until DB-backed).

## 6. Admin taxonomy editor (sectors, tags, maturity levels)

- New admin tab inside existing `/ai-hub/usecasex/admin` → "Taxonomy" (already listed). Build the editor UI:
  - Three sub-panels: **Sectors**, **Tags**, **Maturity Levels**.
  - Each: list + inline add + rename + soft-delete + display order.
- **Storage**: new tables `taxonomy_sectors`, `taxonomy_tags`, `taxonomy_maturity_levels` (slug, name, description, sort_order, is_published, updated_by, updated_at) with RLS:
  - Public SELECT where `is_published = true`.
  - Admin/moderator ALL via `has_role()`.
- "Publish changes" button flips `is_published` and bumps a `taxonomy_version` row in a `taxonomy_meta` table so the public API can advertise the version.
- Public API endpoint `/api/public/usecasex/taxonomy` updated to merge DB taxonomy with mock-derived facets (DB wins on overlap).

## 7. User feedback & ratings

- New tables:
  - `use_case_ratings(id, use_case_id, user_id, rating 1-5, created_at)` — unique `(use_case_id, user_id)`.
  - `use_case_feedback(id, use_case_id, user_id, comment, sentiment, is_public, created_at)`.
- RLS:
  - Authenticated users can insert/update their own row.
  - Public SELECT on aggregated view only.
  - Admin/moderator read all, can hide abusive feedback.
- View `use_case_rating_aggregates(use_case_id, avg_rating, rating_count)` exposed via:
  - `/api/public/usecasex/use-cases` — `aggregate_rating` field on each row.
  - `/api/public/usecasex/use-cases/$slug` — full aggregate + recent N public comments.
- UI: 5-star widget + comment box on detail page (auth-gated with "Sign in to rate" CTA for anonymous).

---

## Technical notes

```text
New files
  src/components/MissingDataFallback.tsx
  src/components/usecasex/PresetBar.tsx
  src/components/usecasex/SavedPresets.tsx
  src/components/usecasex/CompareTray.tsx
  src/components/usecasex/RatingWidget.tsx
  src/lib/usecasex/index.ts            (barrel)
  src/lib/usecasex.compare.store.ts
  src/lib/usecasex.presets.ts          (localStorage helpers)
  src/lib/usecasex.ratings.functions.ts (createServerFn)
  src/lib/usecasex.taxonomy.functions.ts
  src/routes/ai-hub.usecasex.compare.tsx
  src/routes/ai-hub.usecasex.admin.taxonomy.tsx (or tab in existing admin)

Edits
  src/lib/usecasex.mock.ts              (hardening + self-check)
  src/routes/ai-hub.usecasex.$slug.tsx  (richer detail + compare CTA + ratings)
  src/routes/ai-hub.usecasex.explore.tsx (preset bar + share link)
  src/routes/api/public/usecasex/*.ts   (DB taxonomy merge + ratings)

Migrations
  taxonomy_sectors, taxonomy_tags, taxonomy_maturity_levels, taxonomy_meta
  use_case_ratings, use_case_feedback
  view: use_case_rating_aggregates
  RLS + GRANTs for all
```

## Suggested execution order

1. #2 hardening + #1 fallback (unblocks current crash class)
2. #3 detail page polish
3. #4 presets + share link (frontend only)
4. #5 compare view
5. #7 ratings (migration → API → UI)
6. #6 taxonomy editor (migration → admin UI → public API merge)

Approve the whole plan, or tell me which subset to ship first (e.g. "just 1, 2, 3 now").
