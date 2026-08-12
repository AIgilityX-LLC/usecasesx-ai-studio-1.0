# 02 — Target Architecture

```text
                     ┌──────────────────────────────────────┐
 Browser ───────────▶│  Vercel — Next.js App Router (web)   │
                     │  RSC pages, route handlers for BFF   │
                     │  Supabase SSR client (session only)  │
                     └───────────┬──────────────────────────┘
                                 │  HTTPS + Bearer (Supabase access token)
                                 ▼
                     ┌──────────────────────────────────────┐
                     │  Railway — API service (Hono/Node)   │
                     │  JWKS verify → workspace scope guard │
                     │  domain logic · audit · rate limits  │
                     │  AI gateway · exports · webhooks     │
                     └───────────┬──────────────────────────┘
                                 │  postgres + service role (privileged)
                                 │  postgres + user JWT (RLS as user)
                                 ▼
                     ┌──────────────────────────────────────┐
                     │  Supabase — Postgres · Auth · Storage │
                     │  RLS is the authoritative boundary    │
                     └──────────────────────────────────────┘
```

## Responsibility split

| Concern | Vercel (web) | Railway (api) | Supabase |
|---|---|---|---|
| Rendering, SEO, metadata, OG images | ✅ | — | — |
| Session cookie management, sign-in UI | ✅ | — | issues tokens |
| Public catalogue reads (cacheable) | ✅ direct anon read *or* via api | optional | RLS `TO anon` |
| Authenticated reads/writes | proxy only | ✅ | RLS as user |
| Privileged operations (publish, role grants, admin) | ❌ never | ✅ service role | — |
| Business rules, scoring, exports, AI orchestration | ❌ | ✅ | — |
| Cron, queues, long jobs, webhooks | ❌ | ✅ | — |
| Audit event writes | ❌ | ✅ | append-only tables |

**Rule**: if a request needs a secret, decides authorization, or writes audit history, it belongs on
Railway. Vercel may render and may hold the user's session; it must not hold privileged keys.

## Auth token flow

1. User signs in through Supabase Auth in the Next.js app (`@supabase/ssr`, cookie-based session).
2. Server Components and Route Handlers read the session from cookies.
3. Any call to the Railway API attaches `Authorization: Bearer <access_token>`.
4. Railway middleware verifies the JWT against Supabase JWKS (`<project>/auth/v1/.well-known/jwks.json`),
   caches keys, and rejects expired/invalid tokens with 401.
5. Middleware then loads the caller's workspace memberships and roles, and attaches
   `{ userId, claims, workspaceIds, roles }` to request context.
6. Data access uses **two** Postgres clients:
   - **user client** — Supabase JS with the caller's bearer token; RLS applies as the user. Default.
   - **admin client** — service role; RLS bypassed. Only after an explicit role check, and only for
     privileged operations (publishing submissions, granting roles, maintenance, verified webhooks).
7. Every privileged call re-verifies role server-side via `has_role()`. Never trust a client claim.

## Tenancy enforcement — belt and braces

RLS remains the authoritative boundary. The API adds a **second, independent** check:

```ts
// apps/api/src/middleware/scope.ts
export const requireWorkspace = (paramName = 'workspaceId') => async (c, next) => {
  const wsId = c.req.param(paramName) ?? c.req.query(paramName)
  if (!wsId || !c.get('workspaceIds').includes(wsId)) {
    await emitAudit(c, { action: 'workspace.scope.denied', subject: wsId })
    return c.json({ error: 'forbidden' }, 403)
  }
  await next()
}
```

Do not remove policies because "the API checks it". Cross-workspace tests must pass against the
database directly (see `10-testing-and-dod.md`).

## API surface shape

- REST + JSON, versioned under `/v1`.
- Zod schemas from `packages/contracts` validate every request body, query, and response.
- OpenAPI generated from the Zod schemas (`@hono/zod-openapi`); the web app consumes a generated
  typed client from `packages/api-client`.
- Public, unauthenticated endpoints live under `/v1/public/*` and return only safe columns.
- Webhooks live under `/v1/hooks/*` and verify provider signatures (HMAC, timing-safe compare)
  **before** any processing.
- Health at `/healthz` (liveness) and `/readyz` (DB + JWKS reachable) for Railway probes.
- Structured JSON logs with a `correlationId` per request, propagated from the web app via
  `x-correlation-id`. Never log tokens, emails in full, or secret values.

## Environment and secret matrix

| Name | Vercel (web) | Railway (api) | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | — | browser-safe |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ✅ | — | browser-safe |
| `NEXT_PUBLIC_API_BASE_URL` | ✅ | — | Railway public URL |
| `NEXT_PUBLIC_SITE_URL` | ✅ | — | canonical origin for metadata |
| `SUPABASE_URL` | — | ✅ | |
| `SUPABASE_PUBLISHABLE_KEY` | — | ✅ | user-scoped client |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ never | ✅ | privileged only |
| `SUPABASE_JWT_ISSUER` | — | ✅ | from OIDC discovery |
| `DATABASE_URL` | — | ✅ | only if using direct SQL/migrations from the service |
| `AI_GATEWAY_URL` / `AI_GATEWAY_KEY` | — | ✅ | provider-neutral |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | — | ✅ | |
| `EMAIL_API_KEY` / `EMAIL_SENDER_DOMAIN` | — | ✅ | |
| `CRON_HOOK_SECRET` | — | ✅ | shared with scheduler |
| `ALERT_WEBHOOK_URL` | — | ✅ | ops alerts |
| `SENTRY_DSN` | ✅ | ✅ | separate projects |

Read `process.env` only inside handlers/module init on the API. In the web app, anything not prefixed
`NEXT_PUBLIC_` must be used only in Server Components, Route Handlers, or Server Actions.

## CORS and cookies

- Web and API are on different origins. The API allows only the known web origins
  (production, staging, and Vercel preview pattern) with `Access-Control-Allow-Credentials: false`.
- Authentication is **bearer-token**, not cross-site cookies. Supabase session cookies stay
  first-party to the web origin only. This avoids `SameSite`/third-party-cookie failures.
- Every cross-origin route implements `OPTIONS` returning 204 with matching headers.
- Optional hardening: proxy all API calls through Next.js Route Handlers (`/api/proxy/*`) so the
  browser only ever talks to its own origin and the token never crosses origins from the client.
  Recommended for the authenticated app; use direct calls only for public cacheable reads.

## Rendering strategy

- **Static / ISR**: marketing, legal, editions, pricing, taxonomy landing pages, public use-case
  detail pages (revalidate on publish via an ISR webhook from the API).
- **Server-rendered**: discover/repository search results, public collections, sector/segment pages.
- **Client-heavy islands**: Studio wizard, scoring, Opportunity Map, roadmap, portfolio, workshops,
  admin consoles. These are authenticated and non-indexable — render the shell on the server, hydrate
  the interaction with TanStack Query against the API.
- Metadata is per-route via the `metadata` export / `generateMetadata`. Every route keeps a unique
  title (<60 chars) and description (<160 chars). Authenticated routes emit `noindex`.
