import { createFileRoute } from "@tanstack/react-router";
import { EnterpriseAdminSectionBody } from "@/components/enterprise-admin/EnterpriseAdminSectionBody";

export const Route = createFileRoute("/_app/enterprise-admin/")({
  head: () => ({
    meta: [
      { title: "Enterprise Administration Overview — UseCasesX™" },
      {
        name: "description",
        content: "Overview of organization administration sections and integration status.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => <EnterpriseAdminSectionBody sectionId="overview" />,
});
