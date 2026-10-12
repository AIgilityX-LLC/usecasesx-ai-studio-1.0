import { createFileRoute, Navigate, Outlet, useChildMatches } from "@tanstack/react-router";

/**
 * Legacy /administration parent.
 * Exact hits redirect to /platform-admin; child compatibility redirects still need an Outlet.
 */
export const Route = createFileRoute("/_app/administration")({
  head: () => ({
    meta: [
      { title: "Redirecting…" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdministrationCompat,
});

function AdministrationCompat() {
  const childMatches = useChildMatches();
  if (childMatches.length > 0) return <Outlet />;
  return <Navigate to="/platform-admin" replace />;
}
