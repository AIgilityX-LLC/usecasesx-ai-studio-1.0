import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/portfoliox")({
  beforeLoad: () => {
    throw redirect({ to: "/studio/portfolio", replace: true });
  },
});
