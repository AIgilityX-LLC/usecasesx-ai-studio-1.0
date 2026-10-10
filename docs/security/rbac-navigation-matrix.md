# RBAC navigation matrix — UseCasesX™

**Status:** Active (extends existing authz; does not replace RLS or entitlements)  
**Code:** `src/lib/authz/nav-capabilities.ts`, `RequireCapability`, `AppSidebar`  
**Authoritative security:** Supabase RLS + `createServerFn` role/entitlement checks  

Navigation visibility is **capability-first**. Personas (roles) map to capabilities via `ROLE_CAPABILITY_MAP`. Hiding a menu item is never the security boundary.

---

## How this layers on the existing system

| Layer | Responsibility |
|-------|----------------|
| Supabase RLS + `has_role` / `is_admin_tier` / `user_in_workspace` | Authoritative data access |
| Entitlement catalogue (`src/lib/authz/catalogue.ts`) + `useAuthz` | Edition + workspace-role product gates |
| Scoped permissions / bundles (`scoped-permissions.ts`) | V2 gate/review vocabulary |
| Platform `user_roles` + `RequireRoles` | AIgilityX staff CMS / ops |
| **Nav capabilities (this doc)** | Sidebar visibility + matching route UI guards |

Personas are **derived** from existing signals (no new `user_roles` enum values):

| Persona | Derived from |
|---------|----------------|
| `SUPER_ADMIN` | `user_roles.role = super_admin` |
| `PLATFORM_ADMIN` | Any `ADMIN_TIER_ROLES` / `isPlatformAdmin` |
| `WORKSPACE_ADMIN` | `workspace_members.role` ∈ {owner, admin} |
| `AI_LEADER` | Workspace **owner** (union) |
| `BUSINESS_OWNER` | contributor / facilitator |
| `USE_CASE_OWNER` | contributor |
| `EXECUTIVE` | workspace **viewer** (read-heavy) |
| `PORTFOLIO_MANAGER` | Enterprise bundle `portfolio_manager` |
| `GOVERNANCE_REVIEWER` | Bundles `risk_reviewer` / `technical_reviewer` |
| `FINANCE_REVIEWER` | Bundle assignment (matrix persona; grant via bundle when wired) |

`platform.manage` is **never** granted to tenant-only personas (`WORKSPACE_ADMIN` included).

---

## Capability × persona matrix

Legend: **Y** = granted by `ROLE_CAPABILITY_MAP` · **—** = not granted.

| Capability | Executive | AI Leader | Business Owner | Portfolio Manager | Finance | Governance | Workspace Admin | Platform Admin |
|------------|:---------:|:---------:|:--------------:|:-----------------:|:-------:|:----------:|:---------------:|:--------------:|
| dashboard.read | Y | Y | Y | Y | Y | Y | Y | Y |
| repository.read | Y | Y | Y | Y | Y | Y | Y | Y |
| opportunity.read | Y | Y | Y | Y | Y | Y | Y | Y |
| opportunity.create | — | Y | Y | Y | — | — | Y | Y |
| opportunity.manage | — | Y | — | Y | — | — | Y | Y |
| usecase.read | Y | Y | Y | Y | Y | Y | Y | Y |
| usecase.create | — | Y | Y | Y | — | — | Y | Y |
| usecase.edit | — | Y | Y | Y | — | — | Y | Y |
| usecase.submit | — | Y | Y | Y | — | — | Y | Y |
| assessment.read | Y | Y | Y | Y | — | Y | Y | Y |
| assessment.manage | — | Y | Y | Y | — | — | Y | Y |
| roi.read | Y | Y | Y | Y | Y | Y | Y | Y |
| roi.manage | — | Y | Y | Y | Y | — | Y | Y |
| portfolio.read | Y | Y | Y | Y | Y | Y | Y | Y |
| portfolio.manage | — | Y | — | Y | — | — | Y | Y |
| decision.read | Y | Y | Y | Y | — | Y | Y | Y |
| decision.approve | — | Y | — | — | — | Y | Y | Y |
| pilot.read | Y | Y | Y | Y | — | Y | Y | Y |
| pilot.manage | — | — | — | — | — | — | Y | Y |
| governance.read | Y | Y | Y | Y | — | Y | Y | Y |
| governance.review | — | Y | — | — | — | Y | Y | Y |
| analytics.read | Y | Y | — | Y | Y | Y | Y | Y |
| report.read | Y | Y | Y | Y | Y | Y | Y | Y |
| report.generate | Y | Y | Y | Y | Y | Y | Y | Y |
| integration.read | Y | Y | Y | Y | — | Y | Y | Y |
| integration.manage | — | — | — | — | — | — | Y | Y |
| workspace.manage | — | — | — | — | — | — | Y | Y |
| security.manage | Y | Y | Y | Y | Y | Y | Y | Y |
| **platform.manage** | **—** | **—** | **—** | **—** | **—** | **—** | **—** | **Y** |

Additional personas in code (same map file):

- **USE_CASE_OWNER** — authoring without `opportunity.manage` / `decision.approve` / `workspace.manage`
- **SUPER_ADMIN** — all capabilities including `platform.manage`

Signed-in users also receive `AUTHENTICATED_BASELINE` (dashboard, repository, usecase read/submit, assessment/roi/pilot/report read, security, integration read) so account surfaces stay reachable before workspace membership lands.

---

## Route → capability (sidebar + guards)

| Route pattern | Capability |
|---------------|------------|
| `/dashboard` | `dashboard.read` |
| `/repository`, `/discover`, `/patterns` | `repository.read` |
| `/opportunities`, `/opportunity-map`, `/workshops` | `opportunity.read` |
| `/studio`, `/my-use-cases`, `/boards`, `/demo-scenarios` | `usecase.read` |
| `/submit` | `usecase.submit` |
| `/quick-wins` | `assessment.read` |
| `/roi-calculator` | `roi.read` |
| `/roadmap` | `portfolio.read` |
| `/reviews` | `decision.read` |
| `/reports` | `report.read` |
| `/admin-observability` | `workspace.manage` |
| `/module-analytics` | `analytics.read` |
| `/administration/*`, `/admin-submissions`, `/admin-waitlist`, `/admin-audit` | `platform.manage` |
| `/account`, `/account/security`, `/entitlement`, `/support` | `security.manage` |
| Suite shells (`/sarpi`, `/advisorx`, `/handoffs`) | `integration.read` |
| `/cyberx/c3g/intake` | `governance.read` |
| `/pilot` | `pilot.read` |

UI guards: `RequireCapability` on `/reviews`, `/reports`, `/admin-observability`, `/module-analytics`. Platform CMS routes keep `RequireRoles(PLATFORM_ADMIN_ROLES)` (equivalent staff gate to `platform.manage`).

---

## Backward compatibility

- Existing `RequireRoles` / `RequirePlan` / `useAuthz` / RLS unchanged and still enforced.
- Sidebar `admin: true` remains on platform items as a hint; visibility resolves through `platform.manage`.
- Soft Pro badges (`pro: true`) remain; capability hide is additive.
- No RLS policy changes; no new `app_role` enum values.

---

## Tests

| Suite | Command | Covers |
|-------|---------|--------|
| Unit matrix | `bun test tests/unit/nav-capabilities.test.ts` | Persona map, platform isolation, route alignment |
| Existing entitlements | `bun run test:authz` | Edition × workspace role catalogue |
| Integration (anonymous deep links) | `bunx playwright test tests/nav-capabilities.spec.ts` | Access-denied / sign-in affordance on protected paths |

---

## Operator notes

1. Do not grant `platform.manage` via workspace membership alone.
2. Prefer assigning Enterprise **bundles** for Finance / Governance personas when those memberships exist; until then the matrix defines intended grants.
3. Server handlers must continue to call `is_admin_tier` / `has_role` / workspace checks — never trust nav alone.
