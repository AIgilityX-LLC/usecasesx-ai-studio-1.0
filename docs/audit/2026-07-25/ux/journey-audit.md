# UX journey audit — 2026-07-25

Unauthenticated walkthrough of the core journey on desktop (1280×1800) and
mobile (390×844). Rating scale for **Abandonment risk**: Low / Med / High.

| Step       | Route(s)                                             | Purpose                            | Current state                                                                                            | Next-action clarity | Abandonment risk  | One-line rec                                                            |
| ---------- | ---------------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------- | ----------------- | ----------------------------------------------------------------------- |
| Land       | `/`                                                  | Establish value + edition          | Strong hero copy; mobile clips `<h1>` mid-word; primary CTA is Waitlist, secondary is Explore Repository | Clear               | **High (mobile)** | Fix mobile hero overflow before launch (P0-2)                           |
| Discover   | `/discover`, `/repository`                           | Browse and filter global catalogue | `/discover` wizard renders; `/repository` returns **0 rows** with a sample-data disclaimer below         | Blocked             | **High**          | Publish curated `use_cases` OR restore vetted mock rows (P0-1)          |
| Capture    | `/submit`, `/discover`                               | User captures own opportunity      | Route exists; not exercised in this pass                                                                 | Med                 | Med               | Verify from Explore → Capture handoff has a CTA                         |
| Design     | `/ai-use-case-studio`, `/studio/use-case/$id`        | Studio design and structuring      | Studio landing renders; deep board pages require auth + seeded workspace                                 | Med                 | Med               | Add "next step" banner on first-run empty board                         |
| Score      | `/feasibility`, `/data-readiness`, `/roi-calculator` | Score feasibility/readiness/ROI    | Routes render; not verified end-to-end                                                                   | Low                 | Med               | Confirm results write to `use_case_scores` and surface a summary        |
| Prioritize | `/portfoliox`, `/compare`, `/quick-wins`             | Rank and shortlist                 | Not exercised                                                                                            | Low                 | Med               | Post-launch: workspace-owned portfolio (see architecture debt A-08)     |
| Portfolio  | `/dashboard`, `/my-use-cases`, `/studio/portfolio`   | Portfolio home for signed-in users | All three redirect signed-out users to `/pro` with no context copy                                       | Low                 | Med               | Add "Sign in to access X" explainer on `/pro` (P1-6)                    |
| Roadmap    | `/roadmap`                                           | RoadmapX™ Gantt + phasing          | `/roadmap` route renders header; content is placeholder-heavy                                            | Low                 | Med               | Add an empty state + example roadmap; don't imply data is live          |
| Export     | `/reports`, `/studio/use-case/$id/deliverables`      | PDF/PPT deliverables               | Deliverables scaffolding present per `deliverables.ts`; not verified in this pass                        | Med                 | Med               | Confirm at least one export path is live end-to-end for Founding Access |
| Advisory   | `/advisorx`                                          | Advisor triage                     | Coming Soon page in primary nav                                                                          | Low                 | Med               | Demote from primary nav or badge as "Roadmap" (P1-7)                    |

## Cross-journey observations

- **Edition differentiation** is inconsistent. `/pro` sells Founding Access
  effectively, but signed-out clicks on `/my-use-cases` and `/dashboard`
  land there without any explanatory copy — users can't tell whether they
  need to sign up or sign in.
- **No breadcrumbs** on Studio deep pages; `AppBreadcrumb` exists — verify
  it is wired into `_app` shell so Studio → Board → Case navigation is
  reversible.
- **Empty states** on `/repository` and (likely) `/dashboard` fall back to
  the ambient page background rather than a purpose-built empty component
  (`EmptyState` exists in `src/components/`). Wire it in.
- **Sample-data disclaimer** is well written but appears _below_ the
  content it qualifies. Move above so it sets expectations before the
  user forms an opinion.

## Time-to-value estimates (heuristic)

| Journey step                | Time to understand | Notes                                                      |
| --------------------------- | ------------------ | ---------------------------------------------------------- |
| Landing → value prop        | ~10 s              | Hero copy strong; mobile clip may cost trust in first 2 s. |
| Landing → Explore           | ~20 s              | Blocked by P0-1 (empty repository).                        |
| Explore → open a case       | Not testable       | No rows present.                                           |
| Sign up → first Studio case | ~2–3 min           | Requires auth + `ensure_user_workspace` + board creation.  |
| Discover wizard             | ~1 min             | Route responds cleanly on both viewports.                  |
