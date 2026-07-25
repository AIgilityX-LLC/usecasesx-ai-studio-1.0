# Environment configuration inventory (T=0)

Names only. **No secret values are ever written to this file or the repo.**

## Server-only (read via `process.env` inside handlers)
| Name | Purpose | Notes |
|---|---|---|
| `SUPABASE_URL` | Backend URL | Also mirrored to `VITE_SUPABASE_URL` for the browser client |
| `SUPABASE_PUBLISHABLE_KEY` | Anonymous/publishable key for user-scoped calls | Mirrored to `VITE_SUPABASE_PUBLISHABLE_KEY` |
| `SUPABASE_SERVICE_ROLE_KEY` | Privileged key for `client.server.ts` — bypasses RLS | Server-only. Never import in client code. Not accessible in Lovable Cloud UI. |
| `SUPABASE_DB_URL` | Direct Postgres connection string | Server-only, used by tooling |
| `LOVABLE_API_KEY` | Lovable AI Gateway auth | Server-only. Rotate via `lovable_api_key--rotate_lovable_api_key` |

## Public (browser-safe, injected by Vite)
| Name | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Browser Supabase client URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser Supabase client anon key |
| `VITE_SUPABASE_PROJECT_ID` | Project ref for diagnostics |

## Rules
- Secrets are stored in Lovable Cloud, not in `.env` committed to the repo
  (the committed `.env` contains only public `VITE_*` values + project id).
- Never log, screenshot, or echo `SUPABASE_SERVICE_ROLE_KEY`,
  `SUPABASE_DB_URL`, or `LOVABLE_API_KEY`.
- Rotate `LOVABLE_API_KEY` with `lovable_api_key--rotate_lovable_api_key`;
  rotate Supabase keys via `supabase--rotate_api_keys`.
