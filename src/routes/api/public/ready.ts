/**
 * Public readiness endpoint for load balancers / deploy gates.
 *
 * GET /api/public/ready — env + dependency (database) probes
 *
 * Returns 503 when not ready. Never exposes secret values.
 */

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/ready")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { buildReadyReport } = await import("@/lib/ops/control-plane/ready.server");
        const { report, status, headers } = await buildReadyReport(request);
        return Response.json(report, { status, headers });
      },
    },
  },
});
