import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { requestIdFromHeaders, safeLogCaughtError, safeServerLog } from "./lib/ops/safe-log";
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

function withRequestId(response: Response, requestId: string): Response {
  const headers = new Headers(response.headers);
  if (!headers.has("x-request-id")) headers.set("x-request-id", requestId);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function normalizeCatastrophicSsrResponse(
  response: Response,
  requestId: string,
): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  const captured = consumeLastCapturedError();
  safeLogCaughtError(
    "ssr.unhandled",
    captured ?? new Error("h3 swallowed SSR error"),
    { status: response.status },
    requestId,
  );
  return new Response(renderErrorPage(requestId), {
    status: 500,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "x-request-id": requestId,
    },
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const requestId = requestIdFromHeaders(request.headers);
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      const normalized = await normalizeCatastrophicSsrResponse(response, requestId);
      const contentType = normalized.headers.get("content-type") ?? "";
      return withSecurityHeaders(withRequestId(normalized, requestId), {
        html: contentType.includes("text/html"),
      });
    } catch (error) {
      safeLogCaughtError("ssr.catastrophic", error, {}, requestId);
      safeServerLog("error", "ssr.catastrophic.served_generic_page", {}, requestId);
      return withSecurityHeaders(
        new Response(renderErrorPage(requestId), {
          status: 500,
          headers: {
            "content-type": "text/html; charset=utf-8",
            "x-request-id": requestId,
          },
        }),
        { html: true },
      );
    }
  },
};
