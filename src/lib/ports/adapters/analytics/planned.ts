import {
  ANALYTICS_ADAPTER_CATALOGUE,
  type AnalyticsPort,
  type AnalyticsProviderId,
} from "@/lib/ports/analytics.port";

function planned(id: Exclude<AnalyticsProviderId, "usecasesx_telemetry">): AnalyticsPort {
  return {
    meta: { ...ANALYTICS_ADAPTER_CATALOGUE[id], port: "analytics" },
    providerId: () => id,
  };
}

export const localCollectorAdapter = planned("local_collector");
export const disabledAnalyticsAdapter = planned("disabled");
