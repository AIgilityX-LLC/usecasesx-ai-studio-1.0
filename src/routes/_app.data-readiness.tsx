import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/data-readiness")({
  beforeLoad: () => {
    throw redirect({ to: "/studio", replace: true });
  },
});
