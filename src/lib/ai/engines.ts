/**
 * Research engine catalog — client-safe types and options.
 *
 * The Studio and the administration panel share these shapes. No secret, key
 * or vendor endpoint value ever appears in this module; credentials live in
 * `engines.server.ts` behind the server boundary.
 */

import { z } from "zod";

export const ENGINE_ROUTES = ["gateway", "openai-compatible"] as const;
export type EngineRoute = (typeof ENGINE_ROUTES)[number];

export const ENGINE_EDITIONS = ["free_lite", "pro", "enterprise"] as const;
export type EngineEdition = (typeof ENGINE_EDITIONS)[number];

/** Engine as shown to a signed-in user (never includes key material). */
export type EngineSummary = {
  slug: string;
  label: string;
  provider: string;
  tagline: string | null;
  route: EngineRoute;
  modelId: string;
  baseUrl: string | null;
  tier: string;
  enabled: boolean;
  isDefault: boolean;
  allowWorkspaceKeys: boolean;
  fallbackToDefault: boolean;
  editions: string[];
  sortOrder: number;
  /** True when a platform-level key is stored for this engine. */
  hasPlatformKey: boolean;
  platformKeyHint: string | null;
  /** True when the caller's workspace has its own key for this engine. */
  hasWorkspaceKey: boolean;
  workspaceKeyHint: string | null;
};

export const engineUpsertSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(48)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and hyphens only."),
  label: z.string().trim().min(2).max(80),
  provider: z.string().trim().min(2).max(48),
  tagline: z.string().trim().max(160).optional().nullable(),
  route: z.enum(ENGINE_ROUTES),
  modelId: z.string().trim().min(1).max(160),
  baseUrl: z
    .string()
    .trim()
    .url()
    .max(300)
    .optional()
    .nullable()
    .superRefine((value, ctx) => {
      if (value == null || value === "") return;
      // Lazy import avoided — pure SSRF check inlined via dynamic require pattern
      // is awkward in zod; validate in save handler too. This catches obvious cases.
      try {
        const u = new URL(value);
        if (u.protocol !== "https:") {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Engine base URL must use HTTPS." });
        }
        const host = u.hostname.toLowerCase();
        if (
          host === "localhost" ||
          host.endsWith(".localhost") ||
          host.endsWith(".local") ||
          host.endsWith(".internal") ||
          host === "metadata.google.internal" ||
          /^127\./.test(host) ||
          /^10\./.test(host) ||
          /^192\.168\./.test(host) ||
          /^169\.254\./.test(host) ||
          /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Engine base URL must not target private or metadata hosts.",
          });
        }
      } catch {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Engine base URL is invalid." });
      }
    }),
  tier: z.enum(["fast", "balanced", "deep"]),
  enabled: z.boolean(),
  allowWorkspaceKeys: z.boolean(),
  fallbackToDefault: z.boolean(),
  editions: z.array(z.enum(ENGINE_EDITIONS)).min(1),
  sortOrder: z.number().int().min(0).max(999).optional(),
});
export type EngineUpsertInput = z.infer<typeof engineUpsertSchema>;

/* --------------------------------------------------------- studio brief */

export const RESEARCH_DEPTHS = [
  { value: "fast", label: "Fast scan", hint: "Quick shape of the opportunity" },
  { value: "balanced", label: "Balanced", hint: "Default depth for most briefs" },
  { value: "deep", label: "Deep analysis", hint: "Slower, most thorough reasoning" },
] as const;

export const OUTPUT_DETAILS = [
  { value: "executive", label: "Executive brief" },
  { value: "standard", label: "Standard" },
  { value: "blueprint", label: "Full blueprint" },
] as const;

export const AUDIENCES = [
  { value: "board", label: "Board" },
  { value: "sponsor", label: "Executive sponsor" },
  { value: "technical", label: "Technical team" },
  { value: "regulator", label: "Regulator" },
] as const;

export const HORIZONS = [
  { value: "now", label: "Now (0-6 months)" },
  { value: "next", label: "Next (6-18 months)" },
  { value: "later", label: "Later (18 months+)" },
] as const;

export const DATA_SENSITIVITIES = [
  { value: "public", label: "Public" },
  { value: "internal", label: "Internal" },
  { value: "confidential", label: "Confidential" },
  { value: "regulated", label: "Regulated / special category" },
] as const;

export const DEPLOYMENT_MODELS = [
  { value: "saas", label: "SaaS / public cloud" },
  { value: "private_cloud", label: "Private cloud" },
  { value: "on_prem", label: "On-premises" },
  { value: "air_gapped", label: "Air-gapped / sovereign" },
] as const;

export const BUDGET_BANDS = [
  { value: "under_50k", label: "Under 50k" },
  { value: "50k_250k", label: "50k - 250k" },
  { value: "250k_1m", label: "250k - 1M" },
  { value: "over_1m", label: "Over 1M" },
] as const;

export const studioBriefSchema = z.object({
  depth: z.enum(["fast", "balanced", "deep"]).default("balanced"),
  detail: z.enum(["executive", "standard", "blueprint"]).default("standard"),
  audience: z.enum(["board", "sponsor", "technical", "regulator"]).default("sponsor"),
  businessFunction: z.string().trim().max(120).optional(),
  horizon: z.enum(["now", "next", "later"]).optional(),
  budgetBand: z.enum(["under_50k", "50k_250k", "250k_1m", "over_1m"]).optional(),
  targetKpis: z.string().trim().max(600).optional(),
  existingSystems: z.string().trim().max(600).optional(),
  regulatoryRegime: z.string().trim().max(240).optional(),
  dataSensitivity: z.enum(["public", "internal", "confidential", "regulated"]).optional(),
  deploymentModel: z.enum(["saas", "private_cloud", "on_prem", "air_gapped"]).optional(),
  dataResidency: z.string().trim().max(160).optional(),
  kpiCount: z.number().int().min(2).max(8).optional(),
  riskCount: z.number().int().min(2).max(8).optional(),
  compareAlternatives: z.boolean().optional(),
});
export type StudioBrief = z.infer<typeof studioBriefSchema>;

function labelOf(
  options: ReadonlyArray<{ value: string; label: string }>,
  value?: string,
): string | undefined {
  return options.find((o) => o.value === value)?.label;
}

/** Render the brief as prompt lines. Server and UI summaries share this. */
export function briefToLines(brief: StudioBrief): string[] {
  const out: string[] = [];
  out.push(`Research depth: ${labelOf(RESEARCH_DEPTHS, brief.depth) ?? brief.depth}`);
  out.push(`Output detail: ${labelOf(OUTPUT_DETAILS, brief.detail) ?? brief.detail}`);
  out.push(`Primary audience: ${labelOf(AUDIENCES, brief.audience) ?? brief.audience}`);
  if (brief.businessFunction) out.push(`Business function: ${brief.businessFunction}`);
  if (brief.horizon) out.push(`Delivery horizon: ${labelOf(HORIZONS, brief.horizon)}`);
  if (brief.budgetBand) out.push(`Budget band: ${labelOf(BUDGET_BANDS, brief.budgetBand)}`);
  if (brief.targetKpis) out.push(`Target KPIs the sponsor cares about: ${brief.targetKpis}`);
  if (brief.existingSystems) out.push(`Existing systems and platforms: ${brief.existingSystems}`);
  if (brief.regulatoryRegime) out.push(`Regulatory regime: ${brief.regulatoryRegime}`);
  if (brief.dataSensitivity)
    out.push(`Data sensitivity: ${labelOf(DATA_SENSITIVITIES, brief.dataSensitivity)}`);
  if (brief.deploymentModel)
    out.push(`Deployment model: ${labelOf(DEPLOYMENT_MODELS, brief.deploymentModel)}`);
  if (brief.dataResidency) out.push(`Data residency constraint: ${brief.dataResidency}`);
  if (brief.kpiCount) out.push(`Produce ${brief.kpiCount} KPIs.`);
  if (brief.riskCount) out.push(`Produce ${brief.riskCount} risks.`);
  if (brief.compareAlternatives)
    out.push("Where useful, contrast two or three alternative delivery approaches.");
  return out;
}

/** Short chips for the UI summary row. */
export function briefChips(brief: StudioBrief): string[] {
  return [
    labelOf(RESEARCH_DEPTHS, brief.depth),
    labelOf(OUTPUT_DETAILS, brief.detail),
    labelOf(AUDIENCES, brief.audience),
    brief.horizon ? labelOf(HORIZONS, brief.horizon) : undefined,
    brief.regulatoryRegime,
    brief.deploymentModel ? labelOf(DEPLOYMENT_MODELS, brief.deploymentModel) : undefined,
  ].filter((v): v is string => Boolean(v));
}

export const DEFAULT_BRIEF: StudioBrief = studioBriefSchema.parse({});
