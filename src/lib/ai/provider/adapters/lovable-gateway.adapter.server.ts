/**
 * Active adapter — Lovable / UseCasesX AI Gateway.
 * Delegates to existing gateway.server transport (behavior unchanged).
 */

import { callGateway } from "@/lib/ai/gateway.server";
import { AI_PROVIDER_CATALOGUE } from "../catalogue";
import type {
  ExtractStructuredDataRequest,
  ExtractStructuredDataResult,
  GenerateTextRequest,
  GenerateTextResult,
  SummarizeRequest,
  SummarizeResult,
  ClassifyRequest,
  ClassifyResult,
  MatchUseCasesRequest,
  MatchUseCasesResult,
  AIProvider,
} from "../types";
import { emptyUsage, withUnimplementedCapabilities } from "./base";

async function extractStructuredData(
  req: ExtractStructuredDataRequest,
): Promise<ExtractStructuredDataResult> {
  const result = await callGateway({
    model: req.model,
    system: req.system,
    user: req.user,
    tool: req.tool,
    toolName: req.toolName,
    timeoutMs: req.timeoutMs,
    retries: req.retries,
    endpoint: req.endpoint,
    apiKey: req.apiKey,
  });
  if (!result.ok) return { ok: false, kind: result.kind };
  return { ok: true, args: result.args, usage: result.usage };
}

/** Text-ish capabilities reuse structured extraction with a minimal tool. */
function textTool(name: string) {
  return {
    type: "function",
    function: {
      name,
      description: "Return the response.",
      parameters: {
        type: "object",
        properties: { text: { type: "string" } },
        required: ["text"],
        additionalProperties: false,
      },
    },
  };
}

async function viaTextTool(
  req: { model: string; system?: string; user: string; maxTokens?: number },
  toolName: string,
): Promise<GenerateTextResult> {
  const result = await extractStructuredData({
    model: req.model,
    system: req.system ?? "Return JSON via the tool.",
    user: req.user,
    tool: textTool(toolName),
    toolName,
    timeoutMs: 45_000,
    retries: 1,
  });
  if (!result.ok) return result;
  const text =
    typeof (result.args as { text?: unknown })?.text === "string"
      ? (result.args as { text: string }).text
      : JSON.stringify(result.args);
  return { ok: true, text, usage: result.usage };
}

export const lovableGatewayProvider: AIProvider = withUnimplementedCapabilities({
  meta: AI_PROVIDER_CATALOGUE.lovable_gateway,
  extractStructuredData,
  generateText: (req: GenerateTextRequest) => viaTextTool(req, "generate_text"),
  summarize: (req: SummarizeRequest) => viaTextTool(req, "summarize_text"),
  async classify(req: ClassifyRequest): Promise<ClassifyResult> {
    const result = await extractStructuredData({
      model: req.model,
      system: req.system ?? "Classify the user text into exactly one label.",
      user: `${req.user}\n\nLabels: ${req.labels.join(", ")}`,
      tool: {
        type: "function",
        function: {
          name: "classify",
          description: "Pick one label.",
          parameters: {
            type: "object",
            properties: {
              label: { type: "string", enum: req.labels },
              confidence: { type: "number" },
            },
            required: ["label"],
            additionalProperties: false,
          },
        },
      },
      toolName: "classify",
      timeoutMs: 30_000,
      retries: 1,
    });
    if (!result.ok) return result;
    const args = result.args as { label?: string; confidence?: number };
    if (!args.label) return { ok: false, kind: "invalid_output" };
    return {
      ok: true,
      label: args.label,
      confidence: args.confidence,
      usage: result.usage,
    };
  },
  async matchUseCases(req: MatchUseCasesRequest): Promise<MatchUseCasesResult> {
    const result = await extractStructuredData({
      model: req.model,
      system: req.system ?? "Rank the closest use-case candidates for the query.",
      user: JSON.stringify({ query: req.query, candidates: req.candidates }),
      tool: {
        type: "function",
        function: {
          name: "match_use_cases",
          description: "Return ranked matches.",
          parameters: {
            type: "object",
            properties: {
              matches: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    score: { type: "number" },
                    rationale: { type: "string" },
                  },
                  required: ["id", "score"],
                },
              },
            },
            required: ["matches"],
            additionalProperties: false,
          },
        },
      },
      toolName: "match_use_cases",
      timeoutMs: 45_000,
      retries: 1,
    });
    if (!result.ok) return result;
    const args = result.args as {
      matches?: Array<{ id: string; score: number; rationale?: string }>;
    };
    if (!Array.isArray(args.matches)) return { ok: false, kind: "invalid_output" };
    return { ok: true, matches: args.matches, usage: result.usage ?? emptyUsage };
  },
});
