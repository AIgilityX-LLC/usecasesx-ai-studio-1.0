import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

import { PUBLIC_INDEXABLE_PATHS, SITE_URL } from "@/lib/seo";

const BASE_URL = SITE_URL;

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

/** Hand-tuned weights for the marketing and hub pages. */
const PRIORITY: Record<string, { changefreq: SitemapEntry["changefreq"]; priority: string }> = {
  "/": { changefreq: "weekly", priority: "1.0" },
  "/repository": { changefreq: "daily", priority: "0.9" },
  "/how-it-works": { changefreq: "monthly", priority: "0.9" },
  "/editions": { changefreq: "monthly", priority: "0.9" },
  "/pricing": { changefreq: "weekly", priority: "0.9" },
  "/enterprise": { changefreq: "monthly", priority: "0.8" },
  "/advisory": { changefreq: "monthly", priority: "0.8" },
  "/contact": { changefreq: "monthly", priority: "0.8" },
  "/about": { changefreq: "monthly", priority: "0.7" },
  "/discover": { changefreq: "weekly", priority: "0.7" },
  "/insights": { changefreq: "weekly", priority: "0.7" },
};

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = PUBLIC_INDEXABLE_PATHS.map((path) => ({
          path,
          changefreq: PRIORITY[path]?.changefreq ?? "monthly",
          priority: PRIORITY[path]?.priority ?? "0.6",
        }));

        // Published repository records are the bulk of the indexable surface.
        try {
          const { createPublishableServerClient } = await import("@/lib/sitemap-sources.server");
          const slugs = await createPublishableServerClient();
          for (const slug of slugs) {
            entries.push({ path: `/use-cases/${slug}`, changefreq: "monthly", priority: "0.7" });
          }
        } catch (error) {
          console.warn("[sitemap] dynamic use-case entries unavailable", error);
        }

        // Category and public-collection hubs are indexable landing pages.
        try {
          const { readCategories, readPublicCollections } =
            await import("@/lib/public-catalog.server");
          const [industries, capabilities, collections] = await Promise.all([
            readCategories("industry"),
            readCategories("capability"),
            readPublicCollections(),
          ]);
          for (const item of industries) {
            entries.push({
              path: `/categories/industry/${item.slug}`,
              changefreq: "weekly",
              priority: "0.7",
            });
          }
          for (const item of capabilities) {
            entries.push({
              path: `/categories/capability/${item.slug}`,
              changefreq: "weekly",
              priority: "0.7",
            });
          }
          for (const item of collections) {
            entries.push({
              path: `/collections/${item.slug}`,
              changefreq: "weekly",
              priority: "0.6",
            });
          }
        } catch (error) {
          console.warn("[sitemap] category/collection entries unavailable", error);
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
