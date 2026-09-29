/**
 * AI suggestion feedback — Apply / Dismiss / helpfulness (client-safe model).
 * Never stores suggestion body, prompts, or secrets (FR-14 redacted telemetry).
 */

import { z } from "zod";
import { AI_TASKS } from "./prompts";

export const AI_FEEDBACK_ACTIONS = ["apply", "dismiss", "helpful", "unhelpful"] as const;
export type AiFeedbackAction = (typeof AI_FEEDBACK_ACTIONS)[number];

export const aiFeedbackInputSchema = z.object({
  task: z.enum(AI_TASKS),
  action: z.enum(AI_FEEDBACK_ACTIONS),
  promptVersion: z.string().trim().min(1).max(40),
  entityType: z.string().trim().max(80).optional(),
  entityId: z.string().uuid().optional(),
  /** Opaque correlation for the suggestion turn — not content. */
  correlationId: z.string().trim().max(80).optional(),
});

export type AiFeedbackInput = z.infer<typeof aiFeedbackInputSchema>;

export const TRAINING_POLICY =
  "Customer content is not used for model training by UseCasesX unless separately and explicitly agreed.";

export const AI_CONFIDENCE_CAVEAT =
  "AI suggestions are drafts for human review. Verify against evidence before applying. Not legal advice, certification, or an automatic approval.";

export const MANUAL_FALLBACK_HINT =
  "AI assistance is unavailable. Continue with the manual form — capture, score and review still work without AI.";
