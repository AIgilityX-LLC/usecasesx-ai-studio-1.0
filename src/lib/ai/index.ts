/**
 * Client-safe AI boundary exports.
 *
 * Contains types, schemas, prompt metadata and the model registry only.
 * The transport (`gateway.server.ts`) and the service (`service.server.ts`)
 * are server-only and are never reachable from this barrel.
 */

export * from "./models";
export * from "./types";
export {
  AI_TASKS,
  PROMPT_REGISTRY,
  FR14_PURPOSE_OPS,
  promptFor,
  type AiTask,
} from "./prompts";
export * from "./schemas";
export {
  limitsForEdition,
  evaluateFairUse,
  isMetered,
  type FairUseLimits,
  type FairUseVerdict,
} from "./fair-use";
export {
  TRAINING_POLICY,
  AI_CONFIDENCE_CAVEAT,
  MANUAL_FALLBACK_HINT,
  AI_FEEDBACK_ACTIONS,
  type AiFeedbackAction,
} from "./feedback";
export {
  AI_EVAL_DATASET_VERSION,
  AI_EVAL_CASES,
  AI_EVAL_THRESHOLDS,
  evaluateCategory,
  casesForCategory,
} from "./eval/dataset";
export { createCircuit, DEFAULT_CIRCUIT, type CircuitState } from "./circuit-breaker";
export { sanitizeUntrusted, fenceUntrusted, FENCE_NOTICE } from "./sanitize";
