/**
 * Shared stubs for capabilities an adapter has not implemented yet.
 */

import type {
  AIProvider,
  ClassifyRequest,
  ClassifyResult,
  EmbedRequest,
  EmbedResult,
  GenerateTextRequest,
  GenerateTextResult,
  MatchUseCasesRequest,
  MatchUseCasesResult,
  SummarizeRequest,
  SummarizeResult,
} from "../types";

const emptyUsage = { prompt: null, completion: null, total: null };

export function notImplemented(kind: "not_implemented" | "not_configured" = "not_implemented") {
  return { ok: false as const, kind };
}

/** Mix-in defaults — override extractStructuredData (and others) in real adapters. */
export function withUnimplementedCapabilities(
  partial: Pick<AIProvider, "meta" | "extractStructuredData"> &
    Partial<
      Pick<AIProvider, "generateText" | "classify" | "embed" | "matchUseCases" | "summarize">
    >,
): AIProvider {
  return {
    meta: partial.meta,
    extractStructuredData: partial.extractStructuredData,
    generateText:
      partial.generateText ??
      (async (_req: GenerateTextRequest): Promise<GenerateTextResult> => notImplemented()),
    classify:
      partial.classify ??
      (async (_req: ClassifyRequest): Promise<ClassifyResult> => notImplemented()),
    embed: partial.embed ?? (async (_req: EmbedRequest): Promise<EmbedResult> => notImplemented()),
    matchUseCases:
      partial.matchUseCases ??
      (async (_req: MatchUseCasesRequest): Promise<MatchUseCasesResult> => notImplemented()),
    summarize:
      partial.summarize ??
      (async (_req: SummarizeRequest): Promise<SummarizeResult> => notImplemented()),
  };
}

export { emptyUsage };
