/**
 * Gateway transport — the ONLY place the app talks to an AI provider.
 *
 * Server-only (`.server.ts` is blocked from client bundles). Owns the API key,
 * timeout, bounded retry for transient failures, and normalisation of every
 * upstream condition into an `AiErrorKind`. No provider text ever escapes.
 */

import type { AiErrorKind } from "./types";

export type GatewayRequest = {
  model: string;
  system: string;
  user: string;
  tool: unknown;
  toolName: string;
  timeoutMs: number;
  retries: number;
  /** OpenAI-compatible endpoint base URL for a bring-your-own-key engine. */
  endpoint?: string | null;
  /** Provider key for that engine. Omitted for built-in gateway calls. */
  apiKey?: string | null;
};

export type GatewayResponse =
  | {
      ok: true;
      args: unknown;
      usage: { prompt: number | null; completion: number | null; total: number | null };
    }
  | { ok: false; kind: AiErrorKind };

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const RETRYABLE: ReadonlySet<AiErrorKind> = new Set<AiErrorKind>([
  "rate_limited",
  "upstream",
  "network",
  "timeout",
]);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function once(req: GatewayRequest, apiKey: string): Promise<GatewayResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), req.timeoutMs);
  try {
    const url = req.endpoint ? `${req.endpoint.replace(/\/$/, "")}/chat/completions` : GATEWAY_URL;
    const res = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: req.model,
        messages: [
          { role: "system", content: req.system },
          { role: "user", content: req.user },
        ],
        tools: [req.tool],
        tool_choice: { type: "function", function: { name: req.toolName } },
      }),
    });

    if (res.status === 429) return { ok: false, kind: "rate_limited" };
    if (res.status === 402) return { ok: false, kind: "credits_exhausted" };
    if (res.status >= 500) return { ok: false, kind: "upstream" };
    if (!res.ok) {
      // 4xx other than the above means our request shape is wrong — terminal.
      console.error("[ai] gateway rejected request", { status: res.status, model: req.model });
      return { ok: false, kind: "upstream" };
    }

    const json = (await res.json()) as any;
    const call = json?.choices?.[0]?.message?.tool_calls?.[0];
    const raw = call?.function?.arguments;
    if (!raw) return { ok: false, kind: "invalid_output" };

    let args: unknown;
    try {
      args = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      return { ok: false, kind: "invalid_output" };
    }

    return {
      ok: true,
      args,
      usage: {
        prompt: json?.usage?.prompt_tokens ?? null,
        completion: json?.usage?.completion_tokens ?? null,
        total: json?.usage?.total_tokens ?? null,
      },
    };
  } catch (error) {
    if ((error as { name?: string })?.name === "AbortError") {
      return { ok: false, kind: "timeout" };
    }
    console.error("[ai] gateway transport failure", { model: req.model });
    return { ok: false, kind: "network" };
  } finally {
    clearTimeout(timer);
  }
}

/** Execute a gateway call with bounded retry on transient failures only. */
export async function callGateway(req: GatewayRequest): Promise<GatewayResponse> {
  const apiKey = req.apiKey || process.env.LOVABLE_API_KEY;
  if (!apiKey) return { ok: false, kind: "not_configured" };

  let last: GatewayResponse = { ok: false, kind: "upstream" };
  for (let attempt = 0; attempt <= req.retries; attempt += 1) {
    last = await once(req, apiKey);
    if (last.ok || !RETRYABLE.has(last.kind)) return last;
    if (attempt < req.retries) await sleep(600 * (attempt + 1));
  }
  return last;
}
