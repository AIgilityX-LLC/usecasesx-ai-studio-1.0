import satori from "satori";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/** Template-only fields used to compose a share image. */
export interface OgTemplateData {
  title: string;
  industry: string | null;
  capability: string | null;
  maturity: string | null;
}

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630;

/**
 * Deterministic layout tree for the share card. Only template-only fields are
 * rendered — never workspace, customer or benefit data.
 */
export function ogTemplateTree(data: OgTemplateData) {
  const tags = [data.industry, data.capability, data.maturity]
    .filter((value): value is string => Boolean(value))
    .slice(0, 3);

  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        backgroundColor: "#0B1220",
        padding: 64,
        fontFamily: "OgSans",
      },
      children: [
        {
          type: "div",
          props: {
            style: { display: "flex", color: "#C8A24A", fontSize: 26, letterSpacing: 4 },
            children: "USECASESX™ · AI USE CASE STUDIO™",
          },
        },
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              color: "#FFFFFF",
              fontSize: 60,
              fontWeight: 700,
              lineHeight: 1.15,
            },
            children: data.title.slice(0, 110),
          },
        },
        {
          type: "div",
          props: {
            style: { display: "flex", flexDirection: "column" },
            children: [
              {
                type: "div",
                props: {
                  style: { display: "flex", marginBottom: 26 },
                  children: tags.map((tag) => ({
                    type: "div",
                    props: {
                      style: {
                        display: "flex",
                        padding: "8px 18px",
                        marginRight: 14,
                        border: "1px solid #C8A24A",
                        borderRadius: 999,
                        color: "#E8D9AE",
                        fontSize: 24,
                      },
                      children: tag,
                    },
                  })),
                },
              },
              {
                type: "div",
                props: {
                  style: { display: "flex", color: "#93A3BA", fontSize: 26 },
                  children: "Discover · Design · Prioritize · Manage — usecasesx.aigilityx.com",
                },
              },
            ],
          },
        },
      ],
    },
  };
}

function publicClient() {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false },
  });
}

/** Reads template-only fields for a published, publicly visible use case. */
export async function loadOgTemplateData(slug: string): Promise<OgTemplateData | null> {
  const sb = publicClient();
  const { data } = await sb
    .from("use_cases")
    .select(
      `title, maturity,
       use_case_industries ( industries ( name ) ),
       use_case_capabilities ( ai_capabilities ( name ) )`,
    )
    .eq("slug", slug)
    .eq("status", "published")
    .in("visibility", ["free_lite", "both"])
    .maybeSingle();

  if (!data) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any;
  return {
    title: String(row.title),
    industry: row.use_case_industries?.[0]?.industries?.name ?? null,
    capability: row.use_case_capabilities?.[0]?.ai_capabilities?.name ?? null,
    maturity: row.maturity ? `${String(row.maturity)} maturity` : null,
  };
}

let fontCache: { regular: ArrayBuffer; bold: ArrayBuffer } | null = null;
let resvgReady: Promise<typeof import("@resvg/resvg-wasm")> | null = null;

async function loadFonts(origin: string) {
  if (fontCache) return fontCache;
  const [regular, bold] = await Promise.all([
    fetch(`${origin}/fonts/og-sans-400.ttf`).then((r) => r.arrayBuffer()),
    fetch(`${origin}/fonts/og-sans-700.ttf`).then((r) => r.arrayBuffer()),
  ]);
  fontCache = { regular, bold };
  return fontCache;
}

async function loadResvg(origin: string) {
  if (!resvgReady) {
    resvgReady = (async () => {
      const mod = await import("@resvg/resvg-wasm");
      // Served as a static asset from public/wasm — never imported into the bundle.
      await mod.initWasm(fetch(`${origin}/wasm/resvg.wasm`));
      return mod;
    })();
  }
  return resvgReady;
}

/** Renders the PNG share card; unknown slugs get the generic branded card. */
export async function renderOgImage(slug: string, origin: string): Promise<Response> {
  const data = (await loadOgTemplateData(slug)) ?? {
    title: "Provenance-labelled AI use case repository",
    industry: null,
    capability: null,
    maturity: null,
  };

  const fonts = await loadFonts(origin);
  const svg = await satori(ogTemplateTree(data) as unknown as Parameters<typeof satori>[0], {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    fonts: [
      { name: "OgSans", data: fonts.regular, weight: 400, style: "normal" },
      { name: "OgSans", data: fonts.bold, weight: 700, style: "normal" },
    ],
  });

  const { Resvg } = await loadResvg(origin);
  const png = new Resvg(svg, { fitTo: { mode: "width", value: CARD_WIDTH } }).render().asPng();

  return new Response(png as unknown as BodyInit, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
