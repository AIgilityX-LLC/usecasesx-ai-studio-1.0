/**
 * Client-safe AI boundary exports.
 *
 * Contains types, schemas, prompt metadata and the model registry only.
 * The transport (`gateway.server.ts`) and the service (`service.server.ts`)
 * are server-only and are never reachable from this barrel.
 */

export * from "./models";
export * from "./types";
export { AI_TASKS, PROMPT_REGISTRY, promptFor, type AiTask } from "./prompts";
export * from "./schemas";
export {
  limitsForEdition,
  evaluateFairUse,
  isMetered,
  type FairUseLimits,
  type FairUseVerdict,
} from "./fair-use";
