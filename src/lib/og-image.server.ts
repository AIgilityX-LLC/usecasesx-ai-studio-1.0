import { ImageResponse } from "workers-og";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/** Template-only fields used to compose a share image. */
interface OgTemplateData {
  title: string;
  industry: string | null;
  capability: string | null;
  maturity: string | null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Deterministic HTML for the share card. Exported for unit testing. */
export function ogTemplateMarkup(data: OgTemplateData): string {
  const tags = [data.industry, data.capability, data.maturity]
    .filter((v): v is string => Boolean(v))
    .slice(0, 3)
    .map(
      (tag) =>
        `<div style="display:flex;padding:8px 18px;border:1px solid #C8A24A;border-radius:999px;color:#E8D9AE;font-size:24px;margin-right:14px;">${escapeHtml(tag)}</div>`,
    )
    .join("");

  const title = escapeHtml(data.title).slice(0, 120);

  return `
    <div style="display:flex;flex-direction:column;justify-content:space-between;width:1200px;height:630px;background:#0B1220;padding:64px;font-family:sans-serif;">
      <div style="display:flex;align-items:center;color:#C8A24A;font-size:26px;letter-spacing:4px;">USECASESX™ · AI USE CASE STUDIO™</div>
      <div style="display:flex;color:#FFFFFF;font-size:62px;line-height:1.15;font-weight:700;">${title}</div>
      <div style="display:flex;flex-direction:column;">
        <div style="display:flex;margin-bottom:26px;">${tags}</div>
        <div style="display:flex;color:#93A3BA;font-size:26px;">Discover · Design · Prioritize · Manage — usecasesx.aigilityx.com</div>
      </div>
    </div>`;
}

function publicClient() {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false },
  });
}

/** Reads template-only fields for a published use case. */
export async function loadOgTemplateData(slug: string): Promise<OgTemplateData | null> {
  const sb = publicClient();
  const { data } = await sb
    .from("use_cases")
    .select(
      `title, maturity, status, visibility,
       use_case_industries ( industries ( name ) ),
       use_case_capabilities ( ai_capabilities ( name ) )`,
    )
    .eq("slug", slug)
    .eq("status", "published")
    .in("visibility", ["free_lite", "both"])
    .maybeSingle();

  if (!data) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = data as any;
  const industry = rows.use_case_industries?.[0]?.industries?.name ?? null;
  const capability = rows.use_case_capabilities?.[0]?.ai_capabilities?.name ?? null;

  return {
    title: rows.title as string,
    industry,
    capability,
    maturity: rows.maturity ? `${String(rows.maturity)} maturity` : null,
  };
}

/** Renders the PNG share card, or a generic branded card when the slug is unknown. */
export async function renderOgImage(slug: string): Promise<Response> {
  const data = (await loadOgTemplateData(slug)) ?? {
    title: "AI use case repository",
    industry: null,
    capability: null,
    maturity: null,
  };

  return new ImageResponse(ogTemplateMarkup(data), {
    width: 1200,
    height: 630,
    headers: {
      "Cache-Control": "public, max-age=86400",
    },
  }) as unknown as Response;
}
