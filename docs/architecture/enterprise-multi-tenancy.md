# Phase 4 — Enterprise multi-tenancy

**Status:** Implemented as a central application plane on existing schema.  
**Rule:** Do not add a parallel `tenants` table. `organizations` **is** the tenant.  
**Companion:** `docs/architecture/workspace-navigation-context.md`, `docs/architecture/tenancy-rls-design.md`.

---

## 1. Organizational hierarchy

```text
Platform                         (AIgilityX ops via user_roles — not a tenant row)
   ↓
Tenant / Organization            public.organizations
   ↓
Business Unit                    public.organization_units (unit_type = business_unit)
   ↓
Portfolio                        public.portfolios
   ↓
Program / Initiative             public.organization_units (unit_type = program)
                                 or nested portfolios (parent_portfolio_id)
   ↓
Use Case                         public.ai_use_cases
```

**Workspace** (`public.workspaces`) is the **active working context** and RLS membership boundary inside a tenant. It is not a substitute for Portfolio / Program in the product hierarchy.

---

## 2. First-class models → schema

| Model | Source of truth |
| ----- | --------------- |
| Organization / Tenant | `organizations` |
| Workspace | `workspaces` |
| Membership | `organization_members`, `workspace_members` |
| Business unit | `organization_units` |
| Roles | workspace/org membership roles + `user_roles` (platform) — never on `profiles` |
| Permissions | `src/lib/authz/catalogue.ts`, `scoped-permissions.ts` |
| Subscriptions | `entitlements` ledger (`plan_code`, `expires_at`, `revoked_at`) |
| Quotas | `plans.limits` jsonb + `src/lib/ai/fair-use.ts` |
| Feature entitlements | entitlements + authz catalogue / `permission-service` |
| Policy configuration | `src/lib/enterprise/tenant-policy.ts` (sovereignty / AI routes) |

TypeScript models: `src/lib/tenancy/models.ts`. Hierarchy helpers: `src/lib/tenancy/hierarchy.ts`.

---

## 3. Central services (do not filter in random UI)

| Service | Module | Responsibility |
| ------- | ------ | -------------- |
| **TenantContext** | `tenant-context.ts` + `tenant-context.server.ts` + `useTenantContext` | Membership-derived org/workspace/subscription/hierarchy |
| **AuthorizationService** | `authorization-service.ts` | Facade over permission-service + scoped permissions + resource-in-tenant asserts |
| **PolicyService** | `policy-service.ts` | Facade over tenant sovereignty / AI route allow-lists |
| **EntitlementService** | `entitlement-service.ts` | Subscriptions, edition resolution, quotas, feature evaluate |

Scoping helpers for domain code (not JSX): `src/lib/tenancy/scope.ts` (`requireTenantScope`, `filterByActiveWorkspace`, `ignoreClientTenantId`).

---

## 4. Identity-derived context (hard rule)

1. Authenticate the caller (`requireSupabaseAuth` / session).
2. Load **memberships** for that user id.
3. Resolve active workspace with `pickActiveWorkspace` (preferred id is a **hint** only).
4. Derive `organization_id` / tenant from the chosen workspace’s `organization_id`.
5. Attach subscription from `entitlements` for that organization.

**Never** trust a request body / query `tenant_id` or `organization_id` as the security or scoping authority. Strip them with `ignoreClientTenantId` when present. RLS remains the database authority.

Server entry: `resolveTenantContext` → used by `getWorkspaceContextFn` / `setActiveWorkspaceFn`.

---

## 5. Explicit non-claims

- No destructive schema rename of `organizations` → `tenants`.
- No new parallel role/permission tables in this phase.
- Program remains `organization_units` / nested portfolio until a dedicated programs product surface ships.
- UI migration of every list filter to `useTenantContext` is incremental; new code must use the central plane.

---

## 6. Verification

```bash
bun test tests/unit/tenancy.test.ts
bun run test:unit
```

Related e2e (credentials required): `bun run test:tenancy`, `bun run test:cross-tenant`.
