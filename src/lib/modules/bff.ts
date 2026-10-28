/**
 * API / BFF layer for the modular monolith.
 *
 * UseCasesX does **not** run a separate BFF process. The BFF is the TanStack
 * Start server-function + public-route surface that sits between the React UI
 * and application services:
 *
 * - App-internal: `createServerFn` in `src/lib/*.functions.ts` (+ domain folders)
 * - External HTTP: `src/routes/api/public/*` with signature verification
 *
 * Handlers must stay thin: validate → call application/domain modules → map errors.
 * No business rules or provider secrets at module scope.
 */

export const BFF_LAYER = {
  id: "api_bff",
  label: "API / BFF",
  runtime: "tanstack_start_server_fns",
  internalPattern: "src/lib/**/*.functions.ts",
  publicPattern: "src/routes/api/public/**",
  rules: [
    "Thin wrappers only — no runtime helpers or mock generators at module scope",
    "Protected fns use requireSupabaseAuth; never call them from public loaders",
    "Derive tenant context from authenticated membership, not client tenant_id",
    "Map failures to DomainError.userMessage before returning to the UI",
  ],
} as const;
