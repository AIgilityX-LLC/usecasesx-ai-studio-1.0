# Workspace navigation context

How UseCasesX surfaces **organization** and **workspace** context in the signed-in shell, without introducing a parallel tenant model.

**Do not add a `tenants` table.** `organizations` is the tenant. `workspaces` are portfolios of work inside an organization.

**Phase 4:** Full hierarchy + central services (`TenantContext`, `AuthorizationService`, `PolicyService`, `EntitlementService`) live in `src/lib/tenancy/` — see `docs/architecture/enterprise-multi-tenancy.md`. Prefer `useTenantContext` for new UI; never filter by a client-supplied `tenant_id`.

---

## Concepts

| Concept | Source of truth | Notes |
| ------- | --------------- | ----- |
| **Organization** | `organizations` | Tenant boundary for plan, entitlements, org units, SSO. |
| **Workspace** | `workspaces` (`organization_id`) | Active working context (e.g. “Enterprise AI Portfolio”). One org may own many workspaces. |
| **User membership (org)** | `organization_members` (`role`, `status`) | `status = active` required for normal use. Non-active → treated as **suspended**. |
| **User membership (workspace)** | `workspace_members` (`role`) | Owner / admin / contributor / facilitator / viewer. |
| **Role** | Workspace role on `workspace_members`; org role on `organization_members`; platform roles on `user_roles` | Platform roles never stored on `profiles`. |
| **Capability** | `useNavCapabilities` / `nav-capabilities` + entitlement catalogue | Derived from workspace + platform roles and flags — not from client-supplied claims. |
| **Data isolation** | Supabase **RLS** (membership helpers) | App context scopes UX; RLS is authoritative. |
| **Routing** | File routes under `src/routes/_app.*` | Optional `?workspace=<uuid>` deep-link; resource URLs validated by membership (403 vs 404). |

Provisioning for new accounts remains `ensure_user_workspace(_user_id)` (SECURITY DEFINER, called from server functions via service role).

---

## Active context (app layer)

Central hook: `useWorkspaceContext()` → server fn `getWorkspaceContextFn`.

Returns:

- `organization` — `{ id, name, plan }`
- `workspace` — `{ id, name }` (active)
- `orgRole`, `workspaceRole`, `orgStatus`
- `entitlement`, `can.*`
- `availableWorkspaces[]` — memberships visible to the user (includes suspended org rows for display)
- `status` — `ready` \| `no_workspace` \| `suspended` \| `forbidden`

### Selection rules (`pickActiveWorkspace`)

1. Build selectable set = memberships whose org status is `active`.
2. Prefer last-selected id (client hint) **if** it is still selectable.
3. Else prefer id returned by `ensure_user_workspace`.
4. Else first selectable membership.
5. If only suspended memberships → `status: suspended`.
6. If none → `status: no_workspace`.

Invalid preferred ids are **ignored** (never trusted). Switching uses `setActiveWorkspaceFn`, which re-checks `workspace_members` through the **user-scoped** Supabase client (RLS). Suspended org memberships cannot be activated.

### Persistence

| Store | Key | Purpose |
| ----- | --- | ------- |
| `localStorage` | `usecasesx.active_workspace.<userId>` | Last selected workspace |
| Cookie | `usecasesx_workspace` | Same preference for cold start / SSR-friendly read |

Preference is a **hint only**. Membership is always revalidated on the server.

---

## UI

`WorkspaceSwitcher` (sidebar header):

```
ACME Group
Enterprise AI Portfolio ▼
```

| Situation | Behaviour |
| --------- | ---------- |
| Loading | Skeleton |
| Error | Alert + Retry |
| No workspace | Empty state → Account |
| Suspended org membership | Suspended message |
| One workspace | Read-only context label |
| Multiple workspaces | Dropdown; non-active org memberships shown disabled (“Suspended”) |

`WorkspaceUrlSync` honors `?workspace=<uuid>`: validates via `switchWorkspace`, then strips the query param.

---

## Data isolation & pages

- **RLS** decides which rows exist for the session (membership helpers such as `is_workspace_member` / `user_in_workspace`).
- **Active workspace** decides which of those rows the product shows while the user is “in” a given portfolio.
- Example: `useWorkspacePortfolios` filters visible portfolios to `workspace_id === activeWorkspace.id` after the RLS-scoped read.
- Switching invalidates workspace-scoped React Query keys (`workspace-context`, `portfolios`, `boards`, `handoffs`, `reviews`, `opportunities`, `reports`).

Direct resource URLs (boards, use cases, etc.) continue to use existing server loaders that distinguish **404** (missing) vs **403** (exists but not a member). That is the membership check for deep links.

---

## Capability vs membership

| Layer | Question |
| ----- | -------- |
| Membership | May this user open this org/workspace at all? |
| Workspace role | May they edit / manage members inside it? |
| Entitlement / plan | Which product edition is licensed for the org? |
| Nav capability | Which sidebar destinations appear? (`platform.manage`, module flags, …) |

Never invent a second tenant id. Always resolve through `organizations` → `workspaces` → memberships.

---

## Related

- `docs/architecture/tenancy-rls-design.md` — RLS helpers & policy matrix
- `docs/architecture/tenancy-migration-plan.md` — foundation tables (already in schema)
- `src/lib/workspace.functions.ts` — `getWorkspaceContextFn`, `setActiveWorkspaceFn`
- `src/lib/workspace-selection.ts` — pure pick + persistence helpers
- `src/hooks/useWorkspaceContext.ts` — client context + switch
- `src/lib/authz.server.ts` — `resolveSubject(..., workspaceId?)`
