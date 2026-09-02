# A-02 — Safe Bug Investigation: `/launch` announcement gate

Placeholders were left blank, so this investigation targets the highest-risk open defect carried
forward from the previous review (`FIX-LAUNCH-HOST-GATE-SSR`). No code was changed.

## Defect statement (assumed from prior review evidence)

- **Observed:** On the preview host, `/launch` server-renders and emits launch-announcement wording
  in `<head>` (title, description, `NewsArticle` JSON-LD) even though the candidate is not published.
  The page body only downgrades to "release candidate" wording after hydration.
- **Expected:** Nothing on `/launch` — body, metadata or structured data — should claim the product
  is launched until it is served from the canonical published host.
- **Secondary defect:** the route loader awaits `getCatalogStats()` with no failure path. A backend
  read error turns a public marketing page into a full-page error.
- **Role/workspace/device:** anonymous visitor and crawlers, any workspace, all devices.
- **Last working version:** no prior good version — introduced with the page itself (`5eb7802`),
  extended in `4b52932`/`cb19f38`/`61cc3c9`/`61a94ab`.

## Trace

| Layer | Finding |
| --- | --- |
| Route | `src/routes/_app/launch` → `src/routes/_app.launch.tsx` |
| Head | `head()` is static; announcement title/description/`NewsArticle` emitted unconditionally |
| Component | `useIsLiveHost()` reads `window.location.host` inside `useEffect`, so it is `false` during SSR and only corrects post-hydration |
| State | Single boolean `live`; no server-side equivalent |
| Loader | `loader: async () => ({ stats: await getCatalogStats() })` — no try/catch, no `errorComponent`, no `pendingComponent` on the route |
| Server fn | `getCatalogStats` (`src/lib/public-catalog.functions.ts`) → `readCatalogStats` (`src/lib/public-catalog.server.ts:181`) |
| Query | `use_cases` head-count filtered `status = published`, `visibility in (free_lite, both)`, plus `readCategories('industry')` |
| RLS/data | Anonymous publishable client; reads only already-public published rows. No RLS weakening, no writes, no migrations |
| Error boundary | Only the global `errorComponent` in `src/routes/__root.tsx` — a whole-page error, not a graceful marketing fallback |

## Root cause

Host detection is a **client-only effect**, but the announcement claim exists in three places that
are produced on the server: the head metadata, the JSON-LD, and the first HTML paint. A single
client-side signal cannot gate server-rendered output. Compounding this, the loader treats a remote
count as a hard dependency of a static marketing page.

## Repair options

### Option 1 — Server-derived host gate (recommended, smallest durable fix)
- **Files:** `src/routes/_app.launch.tsx`, small helper in `src/lib/seo.ts`.
- **Change:** derive `live` once on the server (request host vs `SITE_URL`) via the loader, return it
  in loader data, and make `head()` read that value so title/description/JSON-LD switch together.
  Drop `useIsLiveHost()`.
- **Data impact:** none. **Tests:** unit test for the host helper; SSR assertion that preview HTML
  contains no `NewsArticle` and no "is here" headline. **Risk:** low. **Rollback:** revert file.

### Option 2 — Build-time flag
- **Files:** `src/lib/feature-flags.ts`, `src/routes/_app.launch.tsx`.
- **Change:** gate on an explicit `ANNOUNCEMENT_LIVE` flag rather than host inference.
- **Risk:** medium — requires a deploy-time toggle discipline; can go stale. **Rollback:** revert flag.

### Option 3 — Split routes
- **Files:** new `/launch` (candidate) + `/announcement` (live), sitemap and footer updates.
- **Risk:** highest — duplicate marketing copy, two SEO surfaces, more dead-nav exposure.

### Loader hardening (bundled with whichever option is chosen)
Wrap `getCatalogStats()` so a failure yields `{ useCases: 0, industries: 0 }` and the copy omits
counts, plus add a route-level `errorComponent`. Files: `src/routes/_app.launch.tsx`.

## Verdict

| Item | Status | Risk | Next action |
| --- | --- | --- | --- |
| Announcement claim on preview (head + JSON-LD) | **FAIL** | High — premature launch claim indexable by crawlers | Option 1 |
| Body copy gating | PASS (post-hydration only) | Medium — flash of launch wording | Folded into Option 1 |
| Loader resilience | **FAIL** | Medium — public page 500s on backend error | Loader hardening |
| Corpus counts (live, not hardcoded) | PASS | Low | none |
| Auth / RLS / secrets / migrations | PASS | Low | none |
| `/launch` browser + SEO coverage | FAIL | Medium | Add spec with Option 1 |

**Overall: FAIL** on the announcement gate — the defect is real and reproducible from source.
Recommended fix: **Option 1 + loader hardening**. Recommended next prompt ID: `FIX-LAUNCH-HOST-GATE-SSR`.
