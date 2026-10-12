import { Outlet, createFileRoute } from "@tanstack/react-router";
import { RequireCapability } from "@/components/RequireCapability";

export const Route = createFileRoute("/_app/reports")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "Reports Hub — UseCasesX™" },
      {
        name: "description",
        content:
          "Generate executive, portfolio and value reports from your workspace records — print, PDF or CSV.",
      },
    ],
  }),
  component: () => (
    <RequireCapability capability="report.read" action="open Reports Hub">
      <Outlet />
    </RequireCapability>
  ),
});
