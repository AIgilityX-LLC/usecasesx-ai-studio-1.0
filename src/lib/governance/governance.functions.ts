/**
 * Governance preview server functions — thin wrappers only.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { governanceFactsSchema } from "./model";

export const getGovernancePreviewFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ useCaseId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { getGovernancePreview } = await import("./governance.server");
    const { emptyGovernanceFacts, mapFactsToThemes, GOVERNANCE_DISCLAIMER, FRAMEWORK_META, GOVERNANCE_CONTENT_PACK_VERSION, GOVERNANCE_CONTENT_PACK_DATE, GOVERNANCE_CONTENT_PACK_SOURCE } =
      await import("./model");
    const row = await getGovernancePreview(context.supabase, data.useCaseId);
    if (row) return row;
    const facts = emptyGovernanceFacts();
    return {
      id: null,
      useCaseId: data.useCaseId,
      facts,
      mappings: mapFactsToThemes(facts),
      contentPackVersion: GOVERNANCE_CONTENT_PACK_VERSION,
      contentPackDate: GOVERNANCE_CONTENT_PACK_DATE,
      contentPackSource: GOVERNANCE_CONTENT_PACK_SOURCE,
      handoffDeliveryStatus: "not_attempted" as const,
      handoffRequestId: null,
      packageIntegrityHash: null,
      packageGeneratedAt: null,
      packageJson: null,
      consent: null,
      disclaimer: GOVERNANCE_DISCLAIMER,
      frameworkMeta: FRAMEWORK_META,
    };
  });

export const saveGovernancePreviewFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        useCaseId: z.string().uuid(),
        facts: governanceFactsSchema,
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { saveGovernancePreview } = await import("./governance.server");
    return saveGovernancePreview(context.supabase, context.userId, data.useCaseId, data.facts);
  });

export const handoffGovernanceToCyberXFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        useCaseId: z.string().uuid(),
        consentConfirmed: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { handoffToCyberX } = await import("./governance.server");
    return handoffToCyberX(context.supabase, context.userId, data);
  });
