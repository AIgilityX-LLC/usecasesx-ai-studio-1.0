import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SiteShell } from "@/components/SiteShell";
import { ConsentBanner } from "@/components/legal/ConsentBanner";

export const Route = createFileRoute("/_app")({
  component: () => (
    <SiteShell>
      <Outlet />
      <ConsentBanner />
    </SiteShell>
  ),
});
