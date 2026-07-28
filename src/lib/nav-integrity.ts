import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";

/**
 * Centralized list of primary navigation link targets. Both the top nav and the
 * dev integrity check read from here so they cannot drift apart.
 */
export const PRIMARY_NAV_TARGETS = [
  "/",
  "/repository",
  "/insights",
  "/patterns",
  "/ai-use-case-studio",
  "/resources",
  "/pricing",
  "/auth",
] as const;

/**
 * Sidebar (signed-in) navigation link targets. Kept in sync with AppSidebar's
 * NAV definition so the integrity check covers both navigation surfaces.
 */
export const SIDEBAR_NAV_TARGETS = [
  "/dashboard",
  "/repository",
  "/discover",
  "/quick-wins",
  "/roi-calculator",
  "/insights",
  "/studio",
  "/my-use-cases",
  "/boards",
  "/submit",
  "/patterns",
  "/feasibility",
  "/data-readiness",
  "/blueprint",
  "/roadmap",
  "/sarpi",
  "/advisorx",
  "/cyberx/c3g/intake",
  "/reports",
  "/administration",
  "/admin-submissions",
  "/admin-waitlist",
  "/account",
  "/account/security",
  "/entitlement",
  "/module-analytics",
] as const;


/**
 * Targets that intentionally redirect to another route. The integrity check
 * treats these as expected; any *other* redirect is flagged as drift.
 */
export const EXPECTED_REDIRECTS: Record<string, string> = {
  "/dashboard": "/profile",
  "/reports": "/profile",
  "/feasibility": "/studio",
  "/data-readiness": "/studio",
  "/blueprint": "/studio",
  "/portfoliox": "/studio/portfolio",
};

/**
 * Dev-only integrity check. Scans every primary nav target and asserts the
 * router can resolve it to a real route (no 404). Logs a console error listing
 * any targets that would render the not-found boundary so duplicate/mismatched
 * links surface immediately during development.
 */
export function useNavLinkIntegrityCheck(extraTargets: string[] = []) {
  const router = useRouter();

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const r = router as unknown as {
      flatRoutes?: { fullPath?: string }[];
      routesById?: Record<string, { fullPath?: string }>;
      matchRoutes?: (pathname: string) => { fullPath?: string; routeId?: string }[];
    };
    const routeList =
      r.flatRoutes ?? (r.routesById ? Object.values(r.routesById) : []);
    if (routeList.length === 0) return; // router not ready / API unavailable
    const knownPaths = new Set(
      routeList.map((route) => {
        const p = (route.fullPath ?? "").replace(/\/$/, "");
        return p === "" ? "/" : p;
      }),
    );

    // Scan BOTH the top nav and the sidebar so neither surface can drift.
    const targets = [
      ...new Set([
        ...PRIMARY_NAV_TARGETS,
        ...SIDEBAR_NAV_TARGETS,
        ...extraTargets,
      ]),
    ];
    const broken = targets.filter((t) => {
      const normalized = t.replace(/\/$/, "") || "/";
      return !knownPaths.has(normalized);
    });

    if (broken.length > 0) {
      console.error(
        "[nav-integrity] These navigation targets do not resolve to a route " +
          "and would render a 404:",
        broken,
      );
    }

    // Detect unexpected redirects: resolve each target against the live route
    // tree and flag any whose matched leaf path differs from the link target
    // unless that redirect is explicitly expected.
    if (typeof r.matchRoutes === "function") {
      const unexpected: { target: string; resolved: string }[] = [];
      for (const t of targets) {
        const normalized = t.replace(/\/$/, "") || "/";
        if (!knownPaths.has(normalized)) continue; // already reported as broken
        try {
          const matches = r.matchRoutes!(normalized) ?? [];
          const leaf = matches[matches.length - 1];
          const resolved = ((leaf?.fullPath ?? normalized).replace(/\/$/, "") || "/");
          if (resolved !== normalized && EXPECTED_REDIRECTS[normalized] !== resolved) {
            unexpected.push({ target: normalized, resolved });
          }
        } catch {
          /* matchRoutes may throw for params-only routes; ignore */
        }
      }
      if (unexpected.length > 0) {
        console.error(
          "[nav-integrity] These navigation targets resolve to an unexpected " +
            "route (possible redirect drift):",
          unexpected,
        );
      }
    }
  }, [router, extraTargets]);
}
