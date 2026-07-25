# Launch Acceptance Matrix — 14 August 2026

Every row is a launch gate. A row is `PASS` only when all cells are green.
Executed against the **production candidate** by 12 Aug (QA freeze).

Source: `docs/product/scope-2026-08-14/outcomes-by-role.md`, `docs/product/scope-2026-08-14/metrics-and-defect-policy.md`, `docs/audit/2026-07-25/ux/*`.

---

## 1. Journey × role acceptance

| Journey step | Anonymous | Pro FA user | Facilitator | Workspace Admin | Platform Admin |
|---|---|---|---|---|---|
| Landing `/` renders + LCP < 2.5s | ✅ | ✅ | ✅ | ✅ | ✅ |
| Discover Wizard completes | ✅ | ✅ | ✅ | ✅ | ✅ |
| Repository filter returns non-empty | ✅ | ✅ | ✅ | ✅ | ✅ |
| Capture Opportunity via `/submit` | ✅ row created | ✅ | ✅ | ✅ | ✅ |
| Studio create use case | 🔒 gated | ✅ persisted | ✅ | ✅ | ✅ |
| Score use case | 🔒 | ✅ `use_case_scores` row | ✅ | ✅ | ✅ |
| Add to portfolio | 🔒 | ✅ `portfolio_items` row | ✅ | ✅ | ✅ |
| Export ≥ 1 deliverable | 🔒 | ✅ download event | ✅ | ✅ | ✅ |
| Advisory CTA visible | ✅ | ✅ | ✅ | ✅ | ✅ |
| Board share opens in 2nd session | — | ✅ | ✅ | ✅ | ✅ |
| Admin sees live members + fair-use meter | — | — | — | ✅ | ✅ |
| Module analytics role-gated | 🔒 blocked | 🔒 blocked | 🔒 blocked | ✅ | ✅ |

## 2. Browser matrix

| Browser | Version | Desktop | Mobile |
|---|---|---|---|
| Chrome | current + current-1 | required | required |
| Safari | 17+ | required | required (iOS 17+) |
| Firefox | current | required | best-effort |
| Edge | current | required | — |

## 3. Device / viewport matrix

| Device class | Viewport | Requirement |
|---|---|---|
| Mobile S | 360 × 640 | no horizontal overflow |
| Mobile M | 390 × 844 | no horizontal overflow (fixes P0-4) |
| Tablet | 768 × 1024 | layouts do not clip |
| Desktop | 1280 × 800 | primary target |
| Desktop L | 1920 × 1080 | no unbounded content |

## 4. Quality bars (launch gates)

| Bar | Threshold | Verified by |
|---|---|---|
| Performance | LCP < 2.5s on `/`, `/repository`, `/dashboard` (Fast 3G, mid-tier device) | Playwright + Lighthouse |
| Accessibility | 0 critical axe violations on all launch routes | `bun run test:e2e` axe checks |
| Responsive | no horizontal overflow 360–1920 px on launch routes | `bun run test:mobile` |
| Data truth | 0 references to `MOCK_USE_CASES` on any Pro route | grep in CI |
| Security | `bun run test:rls` green; RLS on every new table | CI + review checklist |
| SEO | unique `head()` per content route; title <60, description <160 | route-tree verify + manual sweep |
| Nav integrity | `bun run check:nav-integrity` green | CI |
| Analytics | 8 activation events fire end-to-end | `tests/use-case-analytics.e2e.ts` |

## 5. Test suites (must be green by 12 Aug)

| Suite | Command | Coverage |
|---|---|---|
| Lint | `bun run lint` | Full repo |
| Typecheck | `tsgo` | Full repo |
| Build | `bun run build` | Route tree verify + Vite build |
| Nav integrity | `bun run check:nav-integrity` | Sidebar + shell + redirects |
| Compare analytics | `bun run check:compare` | Compare tray |
| E2E full | `bun run test:e2e` | Core journey |
| Smoke | `bun run test:smoke` | Prod-shaped smoke |
| Navbar | `bun run test:navbar` | Navbar spec |
| Mobile | `bun run test:mobile` | Responsive |
| RLS | `bun run test:rls` | Tenant isolation |

## 6. Sign-off

| Area | Owner | Date | Signature |
|---|---|---|---|
| Product | | | |
| Engineering | | | |
| Design / A11y | | | |
| Security | | | |
| QA | | | |

## 7. Rollback trigger

Any single row failing on 13 Aug (launch freeze) triggers §10 of the release board's rollback policy. Launch commander is the sole go/no-go.
