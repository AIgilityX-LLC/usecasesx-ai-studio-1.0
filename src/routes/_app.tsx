import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SiteShell } from "@/components/SiteShell";
import { RequireAuth } from "@/components/RequireAuth";

export const Route = createFileRoute("/_app")({
  component: () => (
    <RequireAuth>
      <SiteShell>
        <Outlet />
      </SiteShell>
    </RequireAuth>
  ),
});
