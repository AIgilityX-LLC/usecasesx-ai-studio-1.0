/**
 * Shared vocabulary for ports & adapters (Phase 6 — sovereignty).
 *
 * Ports are provider-neutral contracts. Adapters bind a vendor. The app depends
 * on ports; only adapter modules may name vendor SDKs or endpoints.
 */

export const PORT_IDS = [
  "database",
  "authentication",
  "object_storage",
  "ai_provider",
  "email",
  "analytics",
] as const;

export type PortId = (typeof PORT_IDS)[number];

export type AdapterStatus = "active" | "planned";

export type AdapterMeta = {
  /** Stable adapter id (snake_case). */
  id: string;
  port: PortId;
  label: string;
  status: AdapterStatus;
  /** Where the live implementation lives today (or will live). */
  implementation: string;
  notes?: string;
};

export type PortBinding = {
  port: PortId;
  /** Active adapter id for this process. */
  adapterId: string;
  /** Env var that may override the default binding. */
  envKey: string;
};
