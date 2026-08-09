/**
 * Streaming roadmap export.
 *
 * Lives under `/api/public/*` so external site auth does not intercept it, and
 * verifies the caller's bearer token itself. Every read runs through an
 * RLS-scoped client, so a caller can only export portfolios they can already
 * see. The response is streamed row-by-row: large filtered sets download
 * reliably without buffering the whole payload.
 */

import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { loadRoadmapExportData } from "@/lib/roadmap-export.server";
import { toRoadmapRows } from "@/lib/roadmap";
import {
  ROADMAP_EXPORT_COLUMNS,
  normalizeColumns,
  roadmapExportFileName,
  toCsvCell,
} from "@/lib/roadmap-export";

const bodySchema = z.object({
  portfolioId: z.string().uuid(),
  format: z.string(),
  period: z.string().optional(),
  columns: z.array(z.string()).optional(),
});

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function serverClient(accessToken: string) {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"]!;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        headers.set("apikey", key);
        headers.set("Authorization", `Bearer ${accessToken}`);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

export const Route = createFileRoute("/api/public/usecasex/roadmap/export")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7) : "";
        if (!token) return new Response("Unauthorized", { status: 401, headers: CORS });

        let parsed: z.infer<typeof bodySchema>;
        try {
          parsed = bodySchema.parse(await request.json());
        } catch {
          return new Response("Invalid request", { status: 400, headers: CORS });
        }

        const client = serverClient(token);
        const { data: userData, error: userError } = await client.auth.getUser(token);
        if (userError || !userData.user) {
          return new Response("Unauthorized", { status: 401, headers: CORS });
        }

        const format = parsed.format === "json" ? "json" : "csv";
        const columns = normalizeColumns(parsed.columns);
        const labels = new Map(ROADMAP_EXPORT_COLUMNS.map((c) => [c.key, c.label] as const));

        let data: Awaited<ReturnType<typeof loadRoadmapExportData>>;
        try {
          data = await loadRoadmapExportData(
            client as never,
            parsed.portfolioId,
            parsed.period?.trim() || undefined,
          );
        } catch {
          return new Response("Export failed", { status: 500, headers: CORS });
        }

        const rows = toRoadmapRows(data.items);
        const encoder = new TextEncoder();

        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            const push = (text: string) => controller.enqueue(encoder.encode(text));

            if (format === "csv") {
              push(columns.map((key) => toCsvCell(labels.get(key) ?? key)).join(",") + "\r\n");
              rows.forEach((row, index) => {
                push(
                  columns.map((key) => toCsvCell(row[key])).join(",") +
                    (index === rows.length - 1 ? "" : "\r\n"),
                );
              });
            } else {
              push(
                `{\n  "exportedAt": ${JSON.stringify(new Date().toISOString())},\n` +
                  `  "portfolio": ${JSON.stringify(data.portfolioName)},\n` +
                  `  "periodFilter": ${JSON.stringify(parsed.period ?? null)},\n` +
                  `  "itemCount": ${rows.length},\n` +
                  `  "columns": ${JSON.stringify(columns)},\n  "items": [`,
              );
              rows.forEach((row, index) => {
                const record = Object.fromEntries(columns.map((key) => [key, row[key]]));
                push(`${index === 0 ? "\n    " : ",\n    "}${JSON.stringify(record)}`);
              });
              push(rows.length > 0 ? "\n  ]\n}\n" : "]\n}\n");
            }
            controller.close();
          },
        });

        return new Response(stream, {
          status: 200,
          headers: {
            ...CORS,
            "Content-Type":
              format === "csv" ? "text/csv;charset=utf-8" : "application/json;charset=utf-8",
            "Content-Disposition": `attachment; filename="${roadmapExportFileName(format, parsed.period)}"`,
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
