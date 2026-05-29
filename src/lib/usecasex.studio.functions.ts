import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Supported "providers". OpenAI + Gemini route through the Lovable AI
// Gateway. "ConversX" is an internal brand alias powered by Gemini.
export const STUDIO_PROVIDERS = ["openai", "gemini", "conversx"] as const;
export type StudioProvider = (typeof STUDIO_PROVIDERS)[number];

export interface StudioDraft {
  title: string;
  summary: string;
  problemStatement: string;
  proposedSolution: string;
  aiCapabilities: string[];
  aiType: string;
  businessFunction: string;
  targetUsers: string[];
  dataRequirements: string[];
  roiAreas: string[];
  valuePotential: string;
  complexity: string;
  riskLevel: string;
  timeToValue: string;
  governanceConsiderations: string[];
  kpis: string[];
  nextSteps: string[];
}

const PROVIDER_MODEL: Record<StudioProvider, string> = {
  openai: "openai/gpt-5-mini",
  gemini: "google/gemini-3-flash-preview",
  conversx: "google/gemini-2.5-pro",
};

const Input = z.object({
  provider: z.enum(STUDIO_PROVIDERS).default("gemini"),
  organization: z.string().trim().min(1).max(200),
  industry: z.string().trim().max(120).optional().default(""),
  objective: z.string().trim().min(1).max(2000),
  context: z.string().trim().max(4000).optional().default(""),
});

// Structured-output schema for tool-calling.
const TOOL = {
  type: "function",
  function: {
    name: "draft_ai_use_case",
    description: "Return a single, organization-specific AI use case draft.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        summary: { type: "string" },
        problemStatement: { type: "string" },
        proposedSolution: { type: "string" },
        aiCapabilities: { type: "array", items: { type: "string" } },
        aiType: {
          type: "string",
          enum: ["Predictive", "Generative", "Agentic", "Decision Support", "Computer Vision", "NLP", "Other"],
        },
        businessFunction: { type: "string" },
        targetUsers: { type: "array", items: { type: "string" } },
        dataRequirements: { type: "array", items: { type: "string" } },
        roiAreas: { type: "array", items: { type: "string" } },
        valuePotential: { type: "string", enum: ["Low", "Medium", "High", "Transformational"] },
        complexity: { type: "string", enum: ["Low", "Medium", "High"] },
        riskLevel: { type: "string", enum: ["Low", "Medium", "High", "Critical"] },
        timeToValue: { type: "string", enum: ["<3 months", "3-6 months", "6-12 months", ">12 months"] },
        governanceConsiderations: { type: "array", items: { type: "string" } },
        kpis: { type: "array", items: { type: "string" } },
        nextSteps: { type: "array", items: { type: "string" } },
      },
      required: [
        "title", "summary", "problemStatement", "proposedSolution",
        "aiCapabilities", "aiType", "businessFunction", "targetUsers",
        "dataRequirements", "roiAreas", "valuePotential", "complexity",
        "riskLevel", "timeToValue", "governanceConsiderations", "kpis", "nextSteps",
      ],
      additionalProperties: false,
    },
  },
} as const;

export const draftUseCase = createServerFn({ method: "POST" })
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "AI gateway is not configured.", draft: null };
    }

    const model = PROVIDER_MODEL[data.provider];

    const system = [
      "You are AIgilityX UseCaseX Studio — an AI use case research assistant.",
      "Given an organization context and objective, produce ONE concrete, organization-specific AI use case draft.",
      "Be specific to the organization and industry. Avoid generic platitudes. Use realistic KPIs.",
      "Always call the draft_ai_use_case tool with the structured fields. Do not return free-form text.",
    ].join(" ");

    const user = [
      `Organization: ${data.organization}`,
      data.industry ? `Industry: ${data.industry}` : "",
      `Objective / Question: ${data.objective}`,
      data.context ? `Additional context:\n${data.context}` : "",
    ].filter(Boolean).join("\n");

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          tools: [TOOL],
          tool_choice: { type: "function", function: { name: "draft_ai_use_case" } },
        }),
      });

      if (res.status === 429) {
        return { ok: false as const, error: "Rate limit reached. Please try again in a moment.", draft: null };
      }
      if (res.status === 402) {
        return { ok: false as const, error: "AI credits exhausted. Add funds in Settings → Workspace → Usage.", draft: null };
      }
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        console.error("AI gateway error", res.status, t);
        return { ok: false as const, error: `AI gateway error (${res.status}).`, draft: null };
      }

      const json = await res.json();
      const call = json?.choices?.[0]?.message?.tool_calls?.[0];
      const argsRaw = call?.function?.arguments;
      if (!argsRaw) {
        return { ok: false as const, error: "No structured response returned.", draft: null };
      }
      let draft: Record<string, unknown>;
      try {
        draft = typeof argsRaw === "string" ? JSON.parse(argsRaw) : argsRaw;
      } catch {
        return { ok: false as const, error: "Could not parse AI response.", draft: null };
      }

      return {
        ok: true as const,
        error: null,
        draft,
        meta: { provider: data.provider, model },
      };
    } catch (e) {
      console.error("draftUseCase failed", e);
      return { ok: false as const, error: "Network error contacting AI gateway.", draft: null };
    }
  });
