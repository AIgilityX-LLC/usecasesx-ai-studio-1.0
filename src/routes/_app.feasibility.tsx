import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/feasibility")({
  beforeLoad: () => {
    throw redirect({ to: "/studio", replace: true });
  },
});
