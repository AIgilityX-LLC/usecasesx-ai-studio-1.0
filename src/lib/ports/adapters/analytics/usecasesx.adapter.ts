import { ANALYTICS_ADAPTER_CATALOGUE, type AnalyticsPort } from "@/lib/ports/analytics.port";

export const usecasexTelemetryAdapter: AnalyticsPort = {
  meta: { ...ANALYTICS_ADAPTER_CATALOGUE.usecasesx_telemetry, port: "analytics" },
  providerId: () => "usecasesx_telemetry",
};
