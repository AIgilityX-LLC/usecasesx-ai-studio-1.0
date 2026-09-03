# Enterprise AI Use Case Studio + Research Engine Control Panel

Two connected pieces: a deeper, more executive Studio brief form, and an admin control panel that decides which research engines exist — the built-in default (ConversX) or external models (KIMI, OpenAI, Gemini, DeepSeek) reached with an API key.

## 1. Enterprise Studio brief

Today the Studio asks for organization, industry, objective and free-text context, and offers three engine tiles. It will become a structured enterprise brief, grouped into collapsible sections so the page stays calm:

**Depth & rigor**
- Research depth: Fast scan / Balanced / Deep analysis
- Output detail: Executive brief / Standard / Full blueprint
- Audience & tone: Board, Executive sponsor, Technical team, Regulator

**Value & scope**
- Business function, time horizon (Now / Next / Later), budget band
- Target KPIs and existing systems / platforms in place

**Governance & risk**
- Regulatory regime (e.g. GDPR, HIPAA, EU AI Act, local)
- Data sensitivity level, deployment model (SaaS / private cloud / on-prem / air-gapped)
- Data residency / sovereignty constraint

**Output shaping**
- Toggle which sections the draft includes
- Number of KPIs and risks to produce
- Optionally compare 2–3 alternative solution approaches

The brief panel gets a summary chip row (depth, audience, regime) so a user can see their configuration at a glance, plus save/reuse of the last brief and clearer states while the engine drafts. Everything new is optional — the current one-line objective flow still works.

Draft output gains an executive layout: an at-a-glance header (approach, horizon, risk posture), KPI and risk tables, an assumptions/evidence note, and the existing save-to-workspace action.

## 2. Research engine control panel (Administration)

New page: **Administration → AI Engines**, super-admin/admin only.

- **Engine catalog**: every engine with status (Default / Enabled / Disabled / Not configured), provider, and which capability tiers it serves.
- **Default engine**: ConversX stays the default; an admin can change the platform default.
- **Bring your own model**: add an engine backed by an external API — KIMI (Moonshot), OpenAI, Gemini, DeepSeek, or a custom OpenAI-compatible endpoint (base URL + model id).
- **Key handling**: keys are entered in the panel, encrypted before storage, never returned to the browser, and only ever decrypted inside server code. The panel shows a masked hint (last 4 characters) and who added it.
- **Test connection**: a button that runs one small live request and reports success, latency, and the error message if it fails.
- **Availability rules**: per-engine enable/disable, plus which editions may use it (Lite / Pro / Enterprise).
- **Usage view**: calls, failures and average latency per engine, from the existing AI usage events.

### Per-workspace keys

Enterprise workspaces can add their own key for an engine, under **Account → AI Engines**, visible to workspace owners/admins only. Resolution order for a Studio call:
1. Workspace key for the selected engine, if present and enabled
2. Platform key for that engine
3. Platform default engine (ConversX via the built-in gateway)

The Studio engine picker shows only engines the caller's workspace and edition may use, with a small "your workspace key" badge when one applies.

## Technical notes

- **Schema (additive)**: `ai_engines` (platform catalog: slug, provider, label, model id, base URL, tier mapping, enabled, is_default, edition allowlist), `ai_engine_credentials` (platform-level, service-role only, ciphertext), `workspace_ai_engines` (workspace_id, engine slug, ciphertext, enabled). Every table gets GRANTs, RLS, and policies in the same migration: workspace rows readable/writable only by workspace owners/admins; credential ciphertext never granted to `anon` or `authenticated`.
- **Encryption**: AES-256-GCM in a server-only helper, using a provisioned secret; ciphertext stored as one opaque column. Keys never cross the server boundary — no server function returns plaintext.
- **Provider neutrality**: `src/lib/ai/models.ts` gains a resolver that maps an engine slug to a route (Lovable gateway vs. external OpenAI-compatible endpoint). `AIService` keeps its entitlement checks, fair-use limits, Zod output validation, provenance stamping and usage logging for every engine — external engines are not a bypass.
- **Failure handling**: a failing external engine degrades to a typed error with a clear message and, if the admin allows it, falls back to the default engine rather than breaking the draft.
- **Studio parameters** flow through the existing `draftUseCase` input as an optional structured `brief` object, validated with Zod and reflected in the prompt; older saved drafts stay readable.
- **Verification**: typecheck, lint, build, route and nav checks; RLS test for the new tables; a browser pass over the Studio brief and the admin panel including a live test-connection call.

## Out of scope

- No per-user API keys, no billing/metering per external provider, no streaming chat UI changes.
