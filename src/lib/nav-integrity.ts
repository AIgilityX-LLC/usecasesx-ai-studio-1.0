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
 * Dev-only integrity check. Scans every primary nav target and asserts the
 * router can resolve it to a real route (no 404). Logs a console error listing
 * any targets that would render the not-found boundary so duplicate/mismatched
 * links surface immediately during development.
 */
export function useNavLinkIntegrityCheck(extraTargets: string[] = []) {
  const router = useRouter();

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const flatRoutes = (router as unknown as { flatRoutes: { fullPath?: string }[] })
      .flatRoutes;
    const knownPaths = new Set(
      flatRoutes
        .map((r) => r.fullPath?.replace(/\/$/, "") || "/")
        .map((p) => (p === "" ? "/" : p)),
    );

    const targets = [...PRIMARY_NAV_TARGETS, ...extraTargets];
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
  }, [router, extraTargets]);
}
