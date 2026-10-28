/**
 * Analytics / product-events port — append-only telemetry without a SaaS lock-in.
 */

import type { AdapterMeta } from "./types";

export const ANALYTICS_PROVIDER_IDS = [
  "usecasesx_telemetry",
  "local_collector",
  "disabled",
] as const;
export type AnalyticsProviderId = (typeof ANALYTICS_PROVIDER_IDS)[number];

export type AnalyticsPort = {
  readonly meta: AdapterMeta & { port: "analytics"; id: AnalyticsProviderId };
  providerId(): AnalyticsProviderId;
};

export const ANALYTICS_ADAPTER_CATALOGUE: Record<
  AnalyticsProviderId,
  Omit<AdapterMeta, "port"> & { id: AnalyticsProviderId }
> = {
  usecasex_telemetry: {
    id: "usecasesx_telemetry",
    label: "UseCasesX Telemetry",
    status: "active",
    implementation: "src/lib/telemetry/* + module-analytics",
    notes: "Append-only audit/product events with tenant scope and redaction.",
  },
  local_collector: {
    id: "local_collector",
    label: "Local Collector",
    status: "planned",
    implementation: "src/lib/ports/adapters/analytics/planned.ts",
  },
  disabled: {
    id: "disabled",
    label: "Disabled (product events off)",
    status: "planned",
    implementation: "src/lib/ports/adapters/analytics/planned.ts",
    notes: "Audit retained; product analytics suppressed for private deploy.",
  },
};
