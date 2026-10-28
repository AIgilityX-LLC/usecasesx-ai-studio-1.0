/**
 * Ports & adapters — client-safe catalogue and registry.
 *
 * Server resolvers live in `resolve.server.ts` (never import from the browser).
 */

export * from "./types";
export * from "./registry";
export * from "./ai.port";
export * from "./storage.port";
export * from "./auth.port";
export * from "./database.port";
export * from "./email.port";
export * from "./analytics.port";
