# Contextual navigation migration — UseCasesX™

**Status:** Design inventory only — **no routes migrated yet.**  
**Date:** 2026-10-12  
**Audience:** Product + engineering implementing object-level chrome (Use Case, Pilot, Portfolio).  
**Related:** `docs/architecture/navigation-current-state.md`, `docs/architecture/platform-admin-separation.md`, `src/lib/navigation/enterprise-nav.ts`.

---

## 1. Principle

| Surface | Owns | Must not own |
| ------- | ---- | ------------ |
| **Global sidebar** (`ENTERPRISE_NAV_SECTIONS`) | Major product destinations (lists, hubs, workspace tools) | Tabs that only make sense for one Use Case / Pilot / Portfolio instance |
| **Contextual navigation** | Object-scoped sections (Overview → Activity / Decisions) | Duplicate copies of the same destination in the sidebar |
| **Command palette** | Jump to hubs + find entities | Promote every object tab as a top-level destination |

**Rule of thumb:** if the page needs an `$id` (or selected portfolio) to be meaningful, it belongs in contextual nav — not the sidebar.

---

## 2. Current state (what exists today)

### 2.1 Global sidebar destinations (keep as hubs)

These remain **global** after migration. They are list/hub surfaces, not object tabs.

| Label (sidebar) | Route | Role |
| --------------- | ----- | ---- |
| Dashboard | `/dashboard` | Workspace overview |
| Global Repository | `/repository` | Catalogue browse |
| Discovery Wizard | `/discover` | Guided discovery |
| Pattern Library | `/patterns` | Pattern catalogue |
| Deployment Intelligence | `/insights` | Cross-corpus insights |
| Demo Scenarios | `/demo-scenarios` | Demo entry |
| AI Use Case Studio | `/studio` | Draft / create hub |
| My Use Cases | `/my-use-cases` | Personal / workspace use-case list |
| Use Case Boards | `/boards` | Board list |
| Submit a Use Case | `/submit` | Contribution |
| Opportunities | `/opportunities` | Opportunity list |
| Opportunity Map | `/opportunity-map` | Cross-opportunity map |
| Workshops | `/workshops` | Workshop list |
| Quick Wins Matrix | `/quick-wins` | Cross-catalogue prioritization tool |
| Review Inbox | `/reviews` | Cross-object decision inbox |
| Reports | `/reports` | Reporting hub |
| Module Analytics | `/module-analytics` | Cross-module events (flagged) |
| Export & AI Activity | `/admin-observability` | Workspace admin |
| Pilot Mission | `/pilot` | Pilot entry (participant) |
| Help / FAQ / Support | `/support`, `/faq` | Help |

### 2.2 Object-scoped work already nested (partial contextual)

Studio **already** has per–use-case routes under `/studio/use-case/$id/*`, but navigation is an unstructured chip strip on the index page — not a durable contextual chrome with breadcrumbs/authz/tab hiding.

| Existing route | Today’s label (chip) | Notes |
| -------------- | -------------------- | ----- |
| `/studio/use-case/$id/` | (detail / canvas summary) | De facto Overview |
| `/studio/use-case/$id/wizard` | Guided design | Capture / design flow |
| `/studio/use-case/$id/brief` | Implementation brief | Implementation-adjacent |
| `/studio/use-case/$id/solution-design` | Solution Design | AI solution |
| `/studio/use-case/$id/value` | Value | Value |
| `/studio/use-case/$id/scorecard` | Scorecard | Scoring / ROI-adjacent |
| `/studio/use-case/$id/feasibility` | Feasibility | Feasibility |
| `/studio/use-case/$id/data-readiness` | Data Readiness | Data |
| `/studio/use-case/$id/c3g-governance` | Governance preview | Governance |
| `/studio/use-case/$id/blueprint` | Blueprint | Implementation / delivery |
| `/studio/use-case/$id/gates` | Decision Gates | Decisions |
| `/studio/use-case/$id/evidence` | Evidence | Evidence (may fold under Governance / Activity) |
| `/studio/use-case/$id/deliverables` (+ `$type`) | Deliverables | Implementation outputs |
| `/studio/use-case/$id/sarpi` | SARPI | Suite handoff (contextual) |
| `/studio/use-case/$id/advisorx` | AdvisorX | Suite handoff (contextual) |

**Gaps vs target tabs:** no dedicated **Business Problem**, **ROI**, or **Activity** routes; DecisionHistory + CollaborationPanel live on the index only.

### 2.3 Global (or footer) items that are object-level in nature

These are the primary **candidates to stop promoting as global product destinations** and instead attach to an object context.

| Current surface | Route(s) | Why it is object-level | Recommended disposition |
| --------------- | -------- | ---------------------- | ----------------------- |
| **ROI & Mission Value** (sidebar) | `/roi-calculator` | Calculator is for *a* use case’s economics; no persistence to an object today | **Contextual:** Use Case → **ROI** tab (reuse calculator UI; optional `?useCaseId=`). Keep `/roi-calculator` as a thin redirect or “scratch calculator” tool linked from the tab — **do not** keep it as a primary sidebar item once the tab ships |
| **Portfolio Roadmap** (sidebar) | `/roadmap` | Roadmap is scoped to portfolio entries / stages | **Contextual:** Portfolio → **Roadmap** tab. Keep `/roadmap` URL working (bookmarkable) but enter via portfolio chrome; remove standalone sidebar entry when Portfolio hub is clear |
| **PortfolioX** (footer / aliases) | `/portfoliox`, `/studio/portfolio` | Portfolio object hub; selection is **local state today** (not in URL) | **Global hub** stays (`/portfoliox` or list). **Object chrome** needs bookmarkable `/portfoliox/$portfolioId/…` (or `?portfolio=`) — see §4 |
| FeasibilityX™ (footer) | `/feasibility` → redirect `/studio` | Feasibility is per use case | Keep redirect; deep-link to last/selected UC feasibility when known; **never** re-add to sidebar |
| DataReadinessX™ (footer) | `/data-readiness` → `/studio` | Per use case | Same as feasibility |
| Blueprint (footer / redirect) | `/blueprint` → `/studio` | Per use case | Same |
| GovernanceX™ (footer) | `/governance` → `/studio` | Governance preview is per use case (`…/c3g-governance`) | Prefer Review Inbox (`/reviews`) as the **global** govern destination; object Governance tab on the use case |
| Suite shells (when Integrations enabled) | `/sarpi`, `/advisorx`, `/cyberx/c3g/intake` | Often launched *from* a use case; generic shells are thin | Prefer contextual `/studio/use-case/$id/sarpi` (etc.); suite entry points optional under Integrations |
| Pilot portal sections | `/pilot`, `/pilot/portal` | Single scrolling pages with milestones / checkpoints mixed in | **Contextual tabs** under Pilot (§4) — no new sidebar items |
| Use-case index chip strip | `/studio/use-case/$id` | Object nav implemented as ad-hoc links | Replace with shared **ContextualNav** chrome |

### 2.4 Related list hubs (stay global; open objects into contextual chrome)

| Hub | Opens object at |
| --- | --------------- |
| `/my-use-cases`, `/studio`, `/boards/$boardId` | `/studio/use-case/$id/…` |
| `/opportunities` | `/opportunities/$id` (future opportunity contextual tabs — out of scope for v1 patterns below) |
| `/reviews` | `/studio/use-case/$id/gates` |
| `/pilot` | `/pilot/portal` (or future `/pilot/$seatId/…`) |
| `/portfoliox` | future `/portfoliox/$id/…` |

---

## 3. Target contextual patterns

Shared UX for all three objects:

1. **Layout route** with sticky/object header + horizontal tab list (scrollable on mobile).
2. **Breadcrumbs:** `Home / {Hub} / {Object title} / {Tab}`.
3. **One URL per tab** (nested path or stable search param) — bookmarkable; back/forward works.
4. **Authz:** each tab declares a capability; **hide** tab if user lacks it (no disabled tease).
5. **No duplicate page bodies** — tabs render existing route components or thin wrappers.
6. **Mobile:** tab list is a horizontal scroll region or a “Sections” select; content remains single-column.

### 3.1 Use Case — target tabs

| Tab | Maps to existing (reuse) | New route? | Suggested capability |
| --- | ------------------------ | ---------- | -------------------- |
| **Overview** | `/studio/use-case/$id/` | No — keep index | `usecase.read` |
| **Business Problem** | Prefer `/wizard` (problem steps) + canvas problem fields; or section deep-link on Overview | Prefer **alias route** `/…/problem` → existing wizard/overview section **without** copying UI | `usecase.read` / `usecase.edit` |
| **AI Solution** | `/solution-design` | Optional alias `/…/solution` | `usecase.read` |
| **Value** | `/value` | No | `usecase.read` |
| **ROI** | Embed `/roi-calculator` UI with use-case context; optionally link scorecard | **Yes, beneficial:** `/studio/use-case/$id/roi` wrapping existing calculator | `roi.read` |
| **Feasibility** | `/feasibility` | No | `assessment.read` (or `usecase.read`) |
| **Data** | `/data-readiness` | Optional alias `/…/data` | `usecase.read` |
| **Governance** | `/c3g-governance` (+ evidence as secondary) | Optional alias `/…/governance` | `governance.read` |
| **Implementation** | `/brief` + `/blueprint` + `/deliverables` | Prefer **one** tab with sub-links or nested child routes under `/…/implementation` | `usecase.read` |
| **Decisions** | `/gates` (+ DecisionHistory) | No | `decision.read` |
| **Activity** | CollaborationPanel + audit/product events | **Yes, beneficial:** `/studio/use-case/$id/activity` | `usecase.read` |

**Secondary (not primary tabs — overflow / “More”):** Scorecard, Evidence, SARPI, AdvisorX, Deliverable types, Guided wizard entry CTA.

**Do not duplicate:** keep single component implementations; aliases are redirects or shared components.

### 3.2 Pilot — target tabs

Today: `/pilot` (mission / onboarding) and `/pilot/portal` (seat, milestones, checkpoints) are largely **monolithic**.

| Tab | Existing content source | Nested route? | Capability |
| --- | ----------------------- | ------------- | ---------- |
| **Overview** | Portal header / seat status / progress | `/pilot/portal` or `/pilot/portal/` | `pilot.read` |
| **Objectives** | Intake / mission goals sections in portal + onboarding | Prefer hash or `/pilot/portal/objectives` if content splits cleanly | `pilot.read` |
| **Milestones** | `PilotMilestoneBoard` | `/pilot/portal/milestones` **beneficial** (already a distinct component) | `pilot.read` |
| **KPIs** | Checkpoint answers / progress metrics | Extract from portal; nest when split | `pilot.read` |
| **Risks** | Governance / freeze / evidence-gap signals (`pilot.governance`) | Nest when UI is pulled out of admin-only views for participants | `pilot.read` |
| **Evidence** | Portal evidence counts / submissions | Nest when distinct | `pilot.read` |
| **Activity** | Reminders, checkpoint history, status changes | Nest when distinct | `pilot.read` |

**Global sidebar:** keep a single **Pilot Mission** entry → `/pilot` (or portal if seated). Do **not** add Milestones/KPIs to the sidebar.

**Platform admin** pilot ops (`/platform-admin/pilot`, `…/pilot-milestones`) stay platform-admin — not customer contextual tabs.

### 3.3 Portfolio — target tabs

Today: `/portfoliox` uses **in-memory `selectedId`** (not URL). `/roadmap` is a **separate global** destination over portfolio entries.

| Tab | Existing content source | Nested route? | Capability |
| --- | ----------------------- | ------------- | ---------- |
| **Overview** | Portfolio header, metrics, filters | Bookmarkable `/portfoliox/$id` (or `?portfolio=`) **required** for history | `portfolio.read` / `portfolio.view` |
| **Use Cases** | `PortfolioEntriesTable` | `/portfoliox/$id/use-cases` or tab on same page | `portfolio.read` |
| **Roadmap** | `_app.roadmap.tsx` | Prefer `/portfoliox/$id/roadmap` **reusing** roadmap components; keep `/roadmap` as redirect into active portfolio when possible | `portfolio.read` |
| **Investment** | Funding / target period fields on entries + portfolio meta | Tab wrapping existing fields; nest when distinct | `portfolio.manage` to edit |
| **Value** | Portfolio charts / value summaries | Reuse `PortfolioCharts` / metrics | `portfolio.read` |
| **Risks** | Risk-related entry fields / dependencies concentration | Reuse dependency panel signals | `portfolio.read` |
| **Decisions** | Entry decisions + `PortfolioAuditTrail` | Tab; nest `/…/decisions` if beneficial | `portfolio.read` / `decision.read` |

**Global sidebar:** one **Portfolio** hub (recommend `/portfoliox` as the label destination). Remove **Portfolio Roadmap** as a sibling sidebar item once contextual Roadmap is reachable.

---

## 4. Migration inventory — before any code moves

### 4.1 Remove or demote from global sidebar (when contextual chrome ships)

| Item | Current | After |
| ---- | ------- | ----- |
| ROI & Mission Value | Sidebar → `/roi-calculator` | Use Case contextual **ROI**; optional tool link from Overview |
| Portfolio Roadmap | Sidebar → `/roadmap` | Portfolio contextual **Roadmap** |
| (Do not add) Feasibility / Data / Blueprint / Governance product names | Footer aliases only | Stay redirects; never sidebar |

### 4.2 Stay global (explicit non-goals)

- Review Inbox (`/reviews`) — cross-object queue  
- Reports, Repository, Studio hub, My Use Cases, Boards list, Opportunities list  
- Quick Wins Matrix — cross-catalogue tool (not one object)  
- Platform Admin namespace — already separated  

### 4.3 Bookmark / history requirements (must fix during migration)

| Gap | Impact | Fix |
| --- | ------ | --- |
| Portfolio selection is React state only | Cannot bookmark a portfolio tab | Put `$portfolioId` (or `portfolio` search) in the URL |
| Use-case chips are not a layout | Refresh loses “which section” only if on index | Prefer path-per-tab (already true for most studio children) |
| Generic `/roi-calculator` | No link back to use case | Accept `useCaseId` search; write results into use-case value/ROI when authorized |

### 4.4 Authorization matrix (tab visibility)

| Object | Default read | Edit / decide | Hide when missing |
| ------ | ------------ | ------------- | ----------------- |
| Use Case | `usecase.read` | `usecase.edit`, `usecase.decide`, `decision.read` | ROI without `roi.read`; Decisions without `decision.read`; Governance without `governance.read` |
| Pilot | `pilot.read` | `pilot.manage` (facilitator) | Participant never sees platform-admin milestone queues |
| Portfolio | `portfolio.view` / `portfolio.read` | `portfolio.manage` | Investment edit controls; Decisions approve actions |

Server RLS and `createServerFn` checks remain authoritative; tab hiding is UX only.

### 4.5 Breadcrumbs

Extend `AppBreadcrumb` (or object layout) beyond path prettify:

- Resolve `$id` → object title (use case / portfolio name).  
- Map segment aliases (`c3g-governance` → “Governance”, `data-readiness` → “Data”).  
- Hub crumb links to list routes (`/my-use-cases`, `/portfoliox`, `/pilot`).  
- Keep mobile: breadcrumbs can remain `md+`; object title stays in contextual header.

### 4.6 Mobile

- Contextual tabs: `overflow-x-auto` tab list, `scroll-snap`, or compact `<Select>` of sections.  
- Do not nest a second sidebar for object tabs.  
- Preserve one primary CTA in the object header.

---

## 5. Recommended implementation phases

**Phase 0 — this document (done)**  
Inventory only; no route moves.

**Phase 1 — Use Case contextual chrome**  
- Add layout route `_app.studio.use-case.$id.tsx` with shared header + tab list + outlet.  
- Wire tabs to **existing** child routes; add `/roi` and `/activity` only where needed.  
- Capability-filter tabs; improve breadcrumbs.  
- Leave sidebar unchanged except optional demotion of ROI after `/roi` ships.

**Phase 2 — Portfolio URL + chrome**  
- Make portfolio id bookmarkable.  
- Move Roadmap into portfolio tabs (reuse components).  
- Demote `/roadmap` from sidebar; redirect `/roadmap` → last/active portfolio roadmap.

**Phase 3 — Pilot portal tabs**  
- Split portal sections into nested routes under `/pilot/portal/*` without duplicating data loaders.  
- Keep `/pilot` as entry / onboarding.

**Phase 4 — Cleanup**  
- Footer aliases point at contextual patterns where a use-case id is known.  
- Command palette: entity hits land on Overview; optional “open ROI” actions later.  
- Nav integrity + Playwright journeys updated.

---

## 6. Explicit non-actions (YAGNI for this pass)

- Do **not** invent parallel pages for Business Problem / ROI / Activity until Phase 1 layout exists.  
- Do **not** put object tabs into `ENTERPRISE_NAV_SECTIONS`.  
- Do **not** broad-search migrate Opportunities/Workshops/Boards in the same PR — same pattern later.  
- Do **not** remove `/roi-calculator` or `/roadmap` URLs until redirects and contextual entry points are live.

---

## 7. Acceptance checklist (when a phase ships)

- [ ] Direct URL to each tab loads the same content after refresh  
- [ ] Browser back/forward moves between tabs correctly  
- [ ] Unauthorized tabs are absent (not merely disabled)  
- [ ] Breadcrumbs show hub → object title → tab  
- [ ] Mobile tab list usable at 360px width  
- [ ] No duplicate nav entries for the same destination in global sidebar  
- [ ] `bun run check:nav-integrity` and relevant unit/e2e journeys pass  

---

## 8. Source map (quick reference)

| Concern | Location |
| ------- | -------- |
| Global sidebar config | `src/lib/navigation/enterprise-nav.ts` |
| Studio use-case children | `src/routes/_app.studio.use-case.$id.*.tsx` |
| Ad-hoc use-case chips | `src/routes/_app.studio.use-case.$id.index.tsx` |
| Portfolio page | `src/routes/_app.portfoliox.tsx` |
| Roadmap page | `src/routes/_app.roadmap.tsx` |
| ROI calculator | `src/routes/_app.roi-calculator.tsx` |
| Pilot | `src/routes/_app.pilot.tsx`, `_app.pilot_.portal.tsx` |
| Breadcrumbs | `src/components/AppBreadcrumb.tsx` |
| Footer aliases | `src/components/UseCasesXFooter.tsx` |
| Redirect stubs | `_app.feasibility.tsx`, `_app.data-readiness.tsx`, `_app.blueprint.tsx`, `_app.governance.tsx` |
| Nav integrity redirects | `src/lib/nav-integrity.ts` → `EXPECTED_REDIRECTS` |
