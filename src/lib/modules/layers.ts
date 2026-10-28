/**
 * Modular monolith layers — dependency direction is strictly downward.
 *
 *   Web UI  →  API / BFF  →  Application Services  →  Domain / Policy / Rules  →  Adapters
 *
 * Do not introduce network-split microservices for these layers. They ship as
 * one TanStack Start deployable. See docs/architecture/modular-monolith.md.
 */

export const ARCHITECTURE_LAYERS = [
  "web_ui",
  "api_bff",
  "application",
  "domain_policy",
  "adapters",
] as const;

export type ArchitectureLayer = (typeof ARCHITECTURE_LAYERS)[number];

export const LAYER_RANK: Record<ArchitectureLayer, number> = {
  web_ui: 0,
  api_bff: 1,
  application: 2,
  domain_policy: 3,
  adapters: 4,
};

export const LAYER_LABEL: Record<ArchitectureLayer, string> = {
  web_ui: "UseCasesX Web UI",
  api_bff: "API / BFF",
  application: "Application Services",
  domain_policy: "Domain / Policy / Rules",
  adapters: "Data / Queue / Storage / AI Adapters",
};

/**
 * A module at `from` may depend on `to` only when `to` is the same layer
 * (explicit peer contract) or a lower layer (higher rank number).
 */
export function canDependOn(from: ArchitectureLayer, to: ArchitectureLayer): boolean {
  return LAYER_RANK[to] >= LAYER_RANK[from];
}

/** True when an import would climb the stack (forbidden). */
export function isUpwardDependency(from: ArchitectureLayer, to: ArchitectureLayer): boolean {
  return LAYER_RANK[to] < LAYER_RANK[from];
}
