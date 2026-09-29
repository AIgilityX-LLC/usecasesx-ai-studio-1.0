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

export const suggestScoreEvidenceSchema = z.object({
  items: z.array(
    z.object({
      criterionId: shortText,
      /** Artefacts or facts the reviewer should gather before answering. */
      evidenceToGather: list,
      /** Editable draft justification. Never contains a score. */
      draftJustification: shortText,
      confidence: z.enum(["low", "medium", "high"]),
    }),
  ),
  openQuestions: list,
});
export type SuggestScoreEvidenceOutput = z.infer<typeof suggestScoreEvidenceSchema>;

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

export const rewriteTextSchema = z.object({
  rewritten: shortText,
  changeSummary: shortText,
  openQuestions: list,
});
export type RewriteTextOutput = z.infer<typeof rewriteTextSchema>;

export const classifyContentSchema = z.object({
  label: shortText,
  confidence: z.enum(["low", "medium", "high"]),
  rationale: shortText,
  alternativeLabels: list,
});
export type ClassifyContentOutput = z.infer<typeof classifyContentSchema>;

export const compareOptionsSchema = z.object({
  comparisons: z.array(
    z.object({
      optionId: shortText,
      strengths: list,
      weaknesses: list,
      notes: shortText,
    }),
  ),
  tradeOffs: list,
  openQuestions: list,
});
export type CompareOptionsOutput = z.infer<typeof compareOptionsSchema>;

export const findGapsSchema = z.object({
  gaps: z.array(
    z.object({
      area: shortText,
      detail: shortText,
      severity: z.enum(["low", "medium", "high"]),
    }),
  ),
  suggestedNextSteps: list,
});
export type FindGapsOutput = z.infer<typeof findGapsSchema>;

export const generateQuestionsSchema = z.object({
  questions: z.array(
    z.object({
      question: shortText,
      whyItMatters: shortText,
      audience: shortText,
    }),
  ),
});
export type GenerateQuestionsOutput = z.infer<typeof generateQuestionsSchema>;

export const summarizeEvidenceSchema = z.object({
  summary: shortText,
  claims: z.array(
    z.object({
      claim: shortText,
      sourceIds: list,
      confidence: z.enum(["low", "medium", "high"]),
    }),
  ),
  conflicts: list,
});
export type SummarizeEvidenceOutput = z.infer<typeof summarizeEvidenceSchema>;

export const draftBriefSchema = z.object({
  title: shortText,
  outcomes: shortText,
  scope: shortText,
  assumptions: shortText,
  architecture: shortText,
  dataNeeds: shortText,
  humanControls: shortText,
  measures: shortText,
  acceptanceCriteria: shortText,
  gaps: list,
});
export type DraftBriefOutput = z.infer<typeof draftBriefSchema>;

export const OUTPUT_SCHEMAS = {
  enrichOpportunity: enrichOpportunitySchema,
  draftUseCase: draftUseCaseSchema,
  recommendCapabilities: recommendCapabilitiesSchema,
  explainScore: explainScoreSchema,
  suggestScoreEvidence: suggestScoreEvidenceSchema,
  findSimilarUseCases: findSimilarUseCasesSchema,
  generateExecutiveSummary: generateExecutiveSummarySchema,
  rewriteText: rewriteTextSchema,
  classifyContent: classifyContentSchema,
  compareOptions: compareOptionsSchema,
  findGaps: findGapsSchema,
  generateQuestions: generateQuestionsSchema,
  summarizeEvidence: summarizeEvidenceSchema,
  draftBrief: draftBriefSchema,
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
  enrichOpportunity: tool(
    "enrich_opportunity",
    "Return enrichment suggestions for an AI opportunity.",
    {
      refinedProblemStatement: { type: "string" },
      refinedSolutionConcept: { type: "string" },
      suggestedCapabilities: strArray,
      suggestedDataRequirements: strArray,
      suggestedKpis: strArray,
      suggestedRisks: strArray,
      clarifyingQuestions: strArray,
    },
  ),
  draftUseCase: tool(
    "draft_ai_use_case",
    "Return a single, organization-specific AI use case draft.",
    {
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
    },
  ),
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
  suggestScoreEvidence: tool(
    "suggest_score_evidence",
    "Propose the evidence needed to answer scoring criteria. Never returns a score.",
    {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            criterionId: { type: "string" },
            evidenceToGather: strArray,
            draftJustification: { type: "string" },
            confidence: { type: "string", enum: ["low", "medium", "high"] },
          },
          required: ["criterionId", "evidenceToGather", "draftJustification", "confidence"],
          additionalProperties: false,
        },
      },
      openQuestions: strArray,
    },
  ),
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
  rewriteText: tool("rewrite_text", "Rewrite text for clarity without inventing facts.", {
    rewritten: { type: "string" },
    changeSummary: { type: "string" },
    openQuestions: strArray,
  }),
  classifyContent: tool("classify_content", "Classify content into allowed labels.", {
    label: { type: "string" },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
    rationale: { type: "string" },
    alternativeLabels: strArray,
  }),
  compareOptions: tool("compare_options", "Compare supplied options on stated criteria.", {
    comparisons: {
      type: "array",
      items: {
        type: "object",
        properties: {
          optionId: { type: "string" },
          strengths: strArray,
          weaknesses: strArray,
          notes: { type: "string" },
        },
        required: ["optionId", "strengths", "weaknesses", "notes"],
        additionalProperties: false,
      },
    },
    tradeOffs: strArray,
    openQuestions: strArray,
  }),
  findGaps: tool("find_gaps", "Identify missing information or controls.", {
    gaps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          area: { type: "string" },
          detail: { type: "string" },
          severity: { type: "string", enum: ["low", "medium", "high"] },
        },
        required: ["area", "detail", "severity"],
        additionalProperties: false,
      },
    },
    suggestedNextSteps: strArray,
  }),
  generateQuestions: tool("generate_questions", "Generate clarifying review questions.", {
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          whyItMatters: { type: "string" },
          audience: { type: "string" },
        },
        required: ["question", "whyItMatters", "audience"],
        additionalProperties: false,
      },
    },
  }),
  summarizeEvidence: tool("summarize_evidence", "Summarise evidence with citations.", {
    summary: { type: "string" },
    claims: {
      type: "array",
      items: {
        type: "object",
        properties: {
          claim: { type: "string" },
          sourceIds: strArray,
          confidence: { type: "string", enum: ["low", "medium", "high"] },
        },
        required: ["claim", "sourceIds", "confidence"],
        additionalProperties: false,
      },
    },
    conflicts: strArray,
  }),
  draftBrief: tool("draft_brief", "Draft an implementation brief from confirmed fields.", {
    title: { type: "string" },
    outcomes: { type: "string" },
    scope: { type: "string" },
    assumptions: { type: "string" },
    architecture: { type: "string" },
    dataNeeds: { type: "string" },
    humanControls: { type: "string" },
    measures: { type: "string" },
    acceptanceCriteria: { type: "string" },
    gaps: strArray,
  }),
};
