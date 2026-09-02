import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import { isCanonicalHost } from "@/lib/seo";
import { readCatalogStats } from "@/lib/public-catalog.server";

export interface LaunchPageContext {
  /** True only when this request was served from the canonical published host. */
  live: boolean;
  /** Live corpus counts; zeroed when the catalogue read fails. */
  stats: { useCases: number; industries: number };
  /** False when the catalogue read failed, so copy can omit figures. */
  statsAvailable: boolean;
}

/**
 * Server-derived context for the /launch page.
 *
 * Host detection must happen on the server: the announcement claim also lives
 * in head metadata and JSON-LD, which are rendered before hydration.
 */
export const getLaunchPageContext = createServerFn({ method: "GET" }).handler(
  async (): Promise<LaunchPageContext> => {
    let live = false;
    try {
      const host =
        getRequest().headers.get("x-forwarded-host") ?? new URL(getRequest().url).host ?? "";
      live = isCanonicalHost(host);
    } catch {
      live = false;
    }

    try {
      const stats = await readCatalogStats();
      return { live, stats, statsAvailable: true };
    } catch {
      return { live, stats: { useCases: 0, industries: 0 }, statsAvailable: false };
    }
  },
);
