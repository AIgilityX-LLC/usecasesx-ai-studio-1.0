/**
 * Public health / liveness endpoint for uptime monitors.
 *
 * GET /api/public/health
 * GET /api/public/health?mode=live  — same cheap checks (no DB round-trip)
 *
 * Returns correlation id headers. Never exposes secret values.
 */

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { buildHealthReport } = await import("@/lib/ops/control-plane/health.server");
        const { report, status, headers } = buildHealthReport(request);
        const url = new URL(request.url);
        const mode = url.searchParams.get("mode");
        const body =
          mode === "live"
            ? {
                status: report.status,
                checkedAt: report.checkedAt,
                correlationId: report.correlationId,
              }
            : report;
        return Response.json(body, { status, headers });
      },
    },
  },
});
