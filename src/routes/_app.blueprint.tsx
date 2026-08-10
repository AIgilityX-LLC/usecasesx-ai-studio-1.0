import { createFileRoute, redirect } from "@tanstack/react-router";
import { privateHead } from "@/lib/seo";

export const Route = createFileRoute("/_app/blueprint")({
  head: () => privateHead("Blueprint"),
  beforeLoad: () => {
    throw redirect({ to: "/studio", replace: true });
  },
});
