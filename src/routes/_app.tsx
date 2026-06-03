import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SiteShell } from "@/components/SiteShell";

export const Route = createFileRoute("/_app")({
  component: () => (
    <SiteShell>
      <Outlet />
    </SiteShell>
  ),
});
