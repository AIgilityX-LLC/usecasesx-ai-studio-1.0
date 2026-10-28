/**
 * Active AI adapter — delegates to the existing Lovable gateway transport.
 * Server-only: do not import from client bundles.
 */

import { callGateway } from "@/lib/ai/gateway.server";
import {
  AI_ADAPTER_CATALOGUE,
  type AiPortRequest,
  type AiPortResponse,
  type AiProviderPort,
} from "@/lib/ports/ai.port";

export const lovableGatewayAdapter: AiProviderPort = {
  meta: { ...AI_ADAPTER_CATALOGUE.lovable_gateway, port: "ai_provider" },
  async complete(req: AiPortRequest): Promise<AiPortResponse> {
    const result = await callGateway(req);
    return result;
  },
};
