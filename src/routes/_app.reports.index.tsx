import { createFileRoute } from "@tanstack/react-router";
import { ReportsHub } from "@/components/reports/ReportsHub";

export const Route = createFileRoute("/_app/reports/")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "Reports Hub — UseCasesX™" },
      {
        name: "description",
        content:
          "Choose an executive, portfolio, value or export report built only from workspace records you own.",
      },
    ],
  }),
  component: ReportsHub,
});
