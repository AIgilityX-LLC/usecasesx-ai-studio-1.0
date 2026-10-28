import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { withSecurityHeaders } from "./lib/security/hardening";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

async function normalizeCatastrophicSsrResponse(
  response: Response,
  correlationId: string,
): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  const { logCaughtError } = await import("@/lib/ops/control-plane/logging");
  logCaughtError(
    "ssr.unhandled",
    consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`),
    {},
    correlationId,
  );
  return new Response(renderErrorPage(), {
    status: 500,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "x-correlation-id": correlationId,
      "x-request-id": correlationId,
    },
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const { correlationFromRequest, correlationResponseHeaders } =
      await import("@/lib/ops/control-plane/correlation");
    const { correlationId } = correlationFromRequest(request);
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      const normalized = await normalizeCatastrophicSsrResponse(response, correlationId);
      const contentType = normalized.headers.get("content-type") ?? "";
      const withCorr = new Response(normalized.body, {
        status: normalized.status,
        statusText: normalized.statusText,
        headers: normalized.headers,
      });
      const corrHeaders = correlationResponseHeaders({ correlationId });
      for (const [k, v] of Object.entries(corrHeaders)) {
        if (!withCorr.headers.has(k)) withCorr.headers.set(k, String(v));
      }
      return withSecurityHeaders(withCorr, {
        html: contentType.includes("text/html"),
      });
    } catch (error) {
      const { handleUnexpectedError } = await import("@/lib/ops/control-plane/errors");
      const handled = handleUnexpectedError(error, {
        scope: "edge.fetch",
        correlationId,
      });
      return withSecurityHeaders(
        new Response(renderErrorPage(), {
          status: handled.status,
          headers: {
            "content-type": "text/html; charset=utf-8",
            "x-correlation-id": handled.correlationId,
            "x-request-id": handled.correlationId,
          },
        }),
        { html: true },
      );
    }
  },
};
