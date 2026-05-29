import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/ai-hub")({
  component: () => <Outlet />,
});
