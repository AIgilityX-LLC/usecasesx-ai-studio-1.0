import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { UseCaseXSubNav } from "@/components/UseCaseXSubNav";

export const Route = createFileRoute("/_app")({
  component: () => (
    <AppShell subNav={<UseCaseXSubNav />}>
      <Outlet />
    </AppShell>
  ),
});
