import { createFileRoute, redirect } from "@tanstack/react-router";
import { privateHead } from "@/lib/seo";

export const Route = createFileRoute("/_app/data-readiness")({
  head: () => privateHead("Data readiness"),
  beforeLoad: () => {
    throw redirect({ to: "/studio", replace: true });
  },
});
