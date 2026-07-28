/**
 * Structured-output schema registry.
 *
 * Every AI task has exactly one Zod schema (used to validate the model output
 * before anything is written or rendered) and one JSON tool schema (sent to the
 * gateway). Nothing that fails `parse` is ever persisted.
 */

import { z } from "zod";
import type { AiTask } from "./prompts";

const shortText = z.string().trim().min(1);
const list = z.array(z.string().trim().min(1));

/* ---------------------------------------------------------------- schemas */

export const enrichOpportunitySchema = z.object({
  refinedProblemStatement: shortText,
  refinedSolutionConcept: shortText,
  suggestedCapabilities: list,
  suggestedDataRequirements: list,
  suggestedKpis: list,
  suggestedRisks: list,
  clarifyingQuestions: list,
});
export type EnrichOpportunityOutput = z.infer<typeof enrichOpportunitySchema>;

export const draftUseCaseSchema = z.object({
  title: shortText,
  summary: shortText,
  problemStatement: shortText,
  proposedSolution: shortText,
  aiCapabilities: list,
  aiType: shortText,
  businessFunction: shortText,
  targetUsers: list,
  dataRequirements: list,
  roiAreas: list,
  valuePotential: shortText,
  complexity: shortText,
  riskLevel: shortText,
  timeToValue: shortText,
  governanceConsiderations: list,
  kpis: list,
  nextSteps: list,
});
export type DraftUseCaseOutput = z.infer<typeof draftUseCaseSchema>;

export const recommendCapabilitiesSchema = z.object({
  capabilities: z.array(
    z.object({
      name: shortText,
      rationale: shortText,
      confidence: z.enum(["low", "medium", "high"]),
    }),
  ),
  dataFoundations: list,
  gaps: list,
});
export type RecommendCapabilitiesOutput = z.infer<typeof recommendCapabilitiesSchema>;

export const explainScoreSchema = z.object({
  headline: shortText,
  narrative: shortText,
  strengths: list,
  weaknesses: list,
  recommendedActions: list,
});
export type ExplainScoreOutput = z.infer<typeof explainScoreSchema>;

export const findSimilarUseCasesSchema = z.object({
  matches: z.array(
    z.object({
      slug: shortText,
      reason: shortText,
      similarity: z.enum(["low", "medium", "high"]),
    }),
  ),
});
export type FindSimilarUseCasesOutput = z.infer<typeof findSimilarUseCasesSchema>;

export const generateExecutiveSummarySchema = z.object({
  headline: shortText,
  summary: shortText,
  keyPoints: list,
  risks: list,
  recommendedNextSteps: list,
});
export type GenerateExecutiveSummaryOutput = z.infer<typeof generateExecutiveSummarySchema>;

export const OUTPUT_SCHEMAS = {
  enrichOpportunity: enrichOpportunitySchema,
  draftUseCase: draftUseCaseSchema,
  recommendCapabilities: recommendCapabilitiesSchema,
  explainScore: explainScoreSchema,
  findSimilarUseCases: findSimilarUseCasesSchema,
  generateExecutiveSummary: generateExecutiveSummarySchema,
} satisfies Record<AiTask, z.ZodTypeAny>;

/* ------------------------------------------------------------ tool schemas */

const strArray = { type: "array", items: { type: "string" } } as const;

function tool(name: string, description: string, properties: Record<string, unknown>) {
  return {
    type: "function",
    function: {
      name,
      description,
      parameters: {
        type: "object",
        properties,
        required: Object.keys(properties),
        additionalProperties: false,
      },
    },
  } as const;
}

export const TOOL_SCHEMAS: Record<AiTask, ReturnType<typeof tool>> = {
  enrichOpportunity: tool("enrich_opportunity", "Return enrichment suggestions for an AI opportunity.", {
    refinedProblemStatement: { type: "string" },
    refinedSolutionConcept: { type: "string" },
    suggestedCapabilities: strArray,
    suggestedDataRequirements: strArray,
    suggestedKpis: strArray,
    suggestedRisks: strArray,
    clarifyingQuestions: strArray,
  }),
  draftUseCase: tool("draft_ai_use_case", "Return a single, organization-specific AI use case draft.", {
    title: { type: "string" },
    summary: { type: "string" },
    problemStatement: { type: "string" },
    proposedSolution: { type: "string" },
    aiCapabilities: strArray,
    aiType: {
      type: "string",
      enum: [
        "Predictive",
        "Generative",
        "Agentic",
        "Decision Support",
        "Computer Vision",
        "NLP",
        "Other",
      ],
    },
    businessFunction: { type: "string" },
    targetUsers: strArray,
    dataRequirements: strArray,
    roiAreas: strArray,
    valuePotential: { type: "string", enum: ["Low", "Medium", "High", "Transformational"] },
    complexity: { type: "string", enum: ["Low", "Medium", "High"] },
    riskLevel: { type: "string", enum: ["Low", "Medium", "High", "Critical"] },
    timeToValue: {
      type: "string",
      enum: ["<3 months", "3-6 months", "6-12 months", ">12 months"],
    },
    governanceConsiderations: strArray,
    kpis: strArray,
    nextSteps: strArray,
  }),
  recommendCapabilities: tool(
    "recommend_capabilities",
    "Return the AI capabilities and data foundations a use case requires.",
    {
      capabilities: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            rationale: { type: "string" },
            confidence: { type: "string", enum: ["low", "medium", "high"] },
          },
          required: ["name", "rationale", "confidence"],
          additionalProperties: false,
        },
      },
      dataFoundations: strArray,
      gaps: strArray,
    },
  ),
  explainScore: tool("explain_score", "Explain a prioritisation score in executive language.", {
    headline: { type: "string" },
    narrative: { type: "string" },
    strengths: strArray,
    weaknesses: strArray,
    recommendedActions: strArray,
  }),
  findSimilarUseCases: tool(
    "find_similar_use_cases",
    "Select the most similar use cases from the supplied candidates.",
    {
      matches: {
        type: "array",
        items: {
          type: "object",
          properties: {
            slug: { type: "string" },
            reason: { type: "string" },
            similarity: { type: "string", enum: ["low", "medium", "high"] },
          },
          required: ["slug", "reason", "similarity"],
          additionalProperties: false,
        },
      },
    },
  ),
  generateExecutiveSummary: tool(
    "generate_executive_summary",
    "Write a board-ready executive summary of an AI portfolio.",
    {
      headline: { type: "string" },
      summary: { type: "string" },
      keyPoints: strArray,
      risks: strArray,
      recommendedNextSteps: strArray,
    },
  ),
};
