import { createFileRoute, redirect } from "@tanstack/react-router";
import { privateHead } from "@/lib/seo";

export const Route = createFileRoute("/_app/feasibility")({
  head: () => privateHead("Feasibility"),
  beforeLoad: () => {
    throw redirect({ to: "/studio", replace: true });
  },
});
