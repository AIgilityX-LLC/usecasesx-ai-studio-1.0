# Platform Administration separation

Separates **AIgilityX platform operations** from the customer-facing **UseCasesX** product shell.

Status: implemented. Existing functionality is preserved; legacy URLs redirect into `/platform-admin/*`.

---

## Classification

### A — Tenant customer functionality

Workspace-scoped product surfaces for signed-in customers.

| Module | Route | Gate |
| ------ | ----- | ---- |
| Review Inbox (decision gates) | `/reviews` | `decision.read` |
| Reports, Studio, Portfolio, Discover, … | customer journey routes | edition + nav capabilities |

### B — Workspace administration

Tenant/workspace operators managing **their** workspace — not AIgilityX staff.

| Module | Route | Gate |
| ------ | ----- | ---- |
| Export & AI Activity | `/admin-observability` | `workspace.manage` |
| Organization structure / team | `/account/organization`, `/account` | org membership + roles |
| Suite handoffs (when shipped) | `/handoffs` | `integration.read` |

### C — AIgilityX platform operations

Global catalogue, go-live, and operator tooling. **Only** `user_roles` in the platform admin tier (`is_admin_tier` / `PLATFORM_ADMIN_ROLES`).

| Module | Canonical route | Permission |
| ------ | --------------- | ---------- |
| Admin Panel (catalogue CMS) | `/platform-admin` | `PLATFORM_ADMIN_ROLES` + `platform.manage` |
| Requests Inbox | `/platform-admin/requests` | same |
| Founding Access | `/platform-admin/founding-access` | same |
| Lead Pipeline | `/platform-admin/leads` | same |
| Free Pro Waitlist | `/platform-admin/waitlist` | same |
| Email Delivery | `/platform-admin/email-delivery` | same |
| AI Engines | `/platform-admin/ai-engines` | same |
| Submission Review | `/platform-admin/submissions` | same |
| Submission Audit | `/platform-admin/submission-audit` | same |
| Pilot Programme | `/platform-admin/pilot` | same |
| Pilot Milestones | `/platform-admin/pilot-milestones` | same |
| Readiness | `/platform-admin/readiness` | same |
| Production Readiness | `/platform-admin/production-readiness` | same |
| Production Data Audit | `/platform-admin/production-data` | same |
| Launch Checks | `/platform-admin/launch-checks` | same |
| Release Candidate | `/platform-admin/release-candidate` | same |
| Readiness to Launch | `/platform-admin/launch-readiness` | same |
| Launch Learning | `/platform-admin/launch-learning` | same |
| Platform Admins | `/platform-admin/platform-admins` | `super_admin` (stricter) |
| Platform Analytics | `/platform-admin/analytics` | `PLATFORM_ADMIN_ROLES` |
| Feedback Triage | `/platform-admin/feedback` | same |

Platform roles (`PLATFORM_ADMIN_ROLES`): `admin`, `moderator`, `super_admin`, `ai_hub_admin`, `usecasex_admin`, `content_manager`, `reviewer`.

A workspace **owner/admin is not** a platform admin.

---

## Migrated routes (compatibility redirects)

| Legacy | Canonical |
| ------ | --------- |
| `/administration` | `/platform-admin` |
| `/administration/requests` | `/platform-admin/requests` |
| `/administration/founding-access` | `/platform-admin/founding-access` |
| `/administration/leads` | `/platform-admin/leads` |
| `/administration/pilot` | `/platform-admin/pilot` |
| `/administration/pilot-milestones` | `/platform-admin/pilot-milestones` |
| `/administration/ai-engines` | `/platform-admin/ai-engines` |
| `/administration/email-delivery` | `/platform-admin/email-delivery` |
| `/administration/platform-admins` | `/platform-admin/platform-admins` |
| `/administration/readiness` | `/platform-admin/readiness` |
| `/administration/readiness/:audience` | `/platform-admin/readiness/:audience` |
| `/administration/production-readiness` | `/platform-admin/production-readiness` |
| `/administration/production-data` | `/platform-admin/production-data` |
| `/administration/launch-checks` | `/platform-admin/launch-checks` |
| `/administration/release-candidate` | `/platform-admin/release-candidate` |
| `/administration/launch-readiness` | `/platform-admin/launch-readiness` |
| `/administration/launch-learning` | `/platform-admin/launch-learning` |
| `/administration/feedback` | `/platform-admin/feedback` |
| `/administration/analytics` | `/platform-admin/analytics` |
| `/admin-submissions` | `/platform-admin/submissions` |
| `/admin-waitlist` | `/platform-admin/waitlist` |
| `/admin-audit` | `/platform-admin/submission-audit` |

Redirects are declared in `EXPECTED_REDIRECTS` (`src/lib/nav-integrity.ts`) and `PLATFORM_ADMIN_REDIRECTS` (`src/lib/navigation/platform-admin-nav.ts`).

---

## Authorization model

1. **Server `beforeLoad`** on `/_app/platform-admin` calls `requirePlatformAdminFn` → RPC `is_admin_tier`. Failures redirect away from the area.
2. **Client `RequireRoles`** (`PLATFORM_ADMIN_ROLES`) on the layout and individual pages.
3. **Server functions / RLS** continue to enforce mutations (catalogue, waitlist, pilot, etc.).
4. **Customer sidebar** never lists platform destinations — entry is only via User menu “Platform Administration” for users who already hold platform roles.

UI visibility is never the only control.

---

## Navigation architecture

| Surface | Config | Who sees it |
| ------- | ------ | ----------- |
| Customer UseCasesX sidebar | `ENTERPRISE_NAV_SECTIONS` | All signed-in tenants |
| Platform Admin sidebar | `PLATFORM_ADMIN_NAV_SECTIONS` | Only while path is `/platform-admin/*` |
| Context strip | `PlatformAdminChrome` | Every platform-admin page |

Workspace switcher remains available in the shell; platform ops stay conceptually separate from the active customer workspace.

---

## Related code

- `src/routes/_app.platform-admin.tsx` — layout + server gate
- `src/lib/navigation/platform-admin-nav.ts` — platform nav + redirect map
- `src/lib/admin/platform-admin.ts` — role lists
- `src/lib/admin/require-platform-admin.functions.ts` — server gate
- `tests/unit/platform-admin-separation.test.ts` — tenant isolation of nav/capabilities
