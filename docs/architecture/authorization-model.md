# Edition-aware authorization model

Single, centralized authorization model for Lite, Pro Founding Access and
Enterprise. One codebase — editions differ only by data, entitlements and
capability flags.

## Modules

| File                                    | Responsibility                                                                                           |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `src/lib/authz/editions.ts`             | Edition enum/rank, plan-code mapping, **Founding Access configuration**, `resolveEdition()`              |
| `src/lib/authz/roles.ts`                | Launch roles (Owner, Admin, Contributor, Facilitator, Viewer), alias normalization, platform-admin roles |
| `src/lib/authz/flags.ts`                | Capability flags for unshipped Enterprise features (default OFF)                                         |
| `src/lib/authz/catalogue.ts`            | **Entitlement catalogue** — every gated capability with its min edition, allowed roles and flag          |
| `src/lib/authz/permission-service.ts`   | `evaluate` / `can` / `evaluateAll` / `assertEntitled` — pure, isomorphic decision engine                 |
| `src/lib/authz.server.ts`               | Server-only subject resolution from profiles, `user_roles`, memberships and org entitlements             |
| `src/lib/authz.functions.ts`            | `getAuthzContextFn`, `checkEntitlementFn` (authenticated server functions)                               |
| `src/hooks/useAuthz.ts`                 | Client entry point — mirrors the server decision                                                         |
| `src/components/RequireEntitlement.tsx` | Declarative UI gate with honest locked states                                                            |

## Decision order

1. **Capability flag** — an unshipped feature is off for everyone, platform
   admins included. Reason: `not_available` ("not available yet"), never an upsell.
2. **Platform admin bypass** — staff roles from `user_roles` (signed in only).
3. **Authentication** — anonymous is allowed only for `anonymous: true` entries.
4. **Workspace membership** — no membership, no workspace capability.
5. **Role** — the entitlement's allowed roles.
6. **Edition** — `lite < pro < enterprise`.

## Roles

Owner · Admin · Contributor · Facilitator · Viewer. Facilitator is a peer of
Contributor for editing and is the only non-admin role that can run workshops.
Advanced Enterprise roles remain reserved.

## Founding Access

Configured centrally in `DEFAULT_FOUNDING_ACCESS` (expires `2026-12-31T23:59:59Z`).
Override without a code change:

- Server: `FOUNDING_ACCESS_UNTIL=<ISO date>`
- Browser: `VITE_FOUNDING_ACCESS_UNTIL=<ISO date>`

After expiry, founding members degrade silently to Lite — no separate code path.

## Capability flags

| Flag             | Env (server / browser)                                           | Default |
| ---------------- | ---------------------------------------------------------------- | ------- |
| `opportunityMap` | `CAPABILITY_OPPORTUNITY_MAP` / `VITE_CAPABILITY_OPPORTUNITY_MAP` | on      |
| `workshopMode`   | `CAPABILITY_WORKSHOP_MODE` / `VITE_…`                            | off     |
| `stageGates`     | `CAPABILITY_STAGE_GATES` / `VITE_…`                              | off     |
| `multiEntity`    | `CAPABILITY_MULTI_ENTITY` / `VITE_…`                             | off     |
| `integrations`   | `CAPABILITY_INTEGRATIONS` / `VITE_…`                             | off     |
| `sso`            | `CAPABILITY_SSO` / `VITE_…`                                      | off     |
| `fullAudit`      | `CAPABILITY_FULL_AUDIT` / `VITE_…`                               | off     |

## Enforcement rule

The UI gate is **not** the security boundary. Every protected action must:

1. Gate the affordance with `useAuthz().can(...)` or `<RequireEntitlement>`.
2. Re-check inside the server function with `assertEntitled(subject, key)`
   after `resolveSubject()`.
3. Remain covered by RLS at the row level.

## Tests

`bun run test:authz` — 60 assertions across anonymous access, the role matrix,
edition gating, flag honesty, platform staff, membership, Founding Access
expiry/configurability, role normalization and catalogue integrity.

## Migration status

Legacy helpers (`usePlan`, `useEntitlement`, `src/lib/permissions.ts`,
`RequirePlan`, `Can`) are still in place and unchanged — existing surfaces keep
working. New and refactored surfaces must use `useAuthz` /
`RequireEntitlement`; legacy call sites are retired incrementally, each behind
its own tested change.
