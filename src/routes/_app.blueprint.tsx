import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/blueprint")({
  beforeLoad: () => {
    throw redirect({ to: "/studio", replace: true });
  },
});
