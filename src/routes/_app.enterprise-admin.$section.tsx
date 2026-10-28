import { createFileRoute, redirect } from "@tanstack/react-router";
import { EnterpriseAdminSectionBody } from "@/components/enterprise-admin/EnterpriseAdminSectionBody";
import {
  ENTERPRISE_ADMIN_SECTIONS,
  isEnterpriseAdminSectionId,
} from "@/lib/enterprise-admin/sections";

export const Route = createFileRoute("/_app/enterprise-admin/$section")({
  beforeLoad: ({ params }) => {
    if (!isEnterpriseAdminSectionId(params.section) || params.section === "overview") {
      throw redirect({ to: "/enterprise-admin", replace: true });
    }
  },
  head: ({ params }) => {
    const section = isEnterpriseAdminSectionId(params.section)
      ? ENTERPRISE_ADMIN_SECTIONS[params.section]
      : null;
    const title = section
      ? `${section.label} — Enterprise Admin`
      : "Enterprise Administration";
    return {
      meta: [
        { title: title.slice(0, 59) },
        {
          name: "description",
          content: (section?.description ?? "Enterprise administration").slice(0, 159),
        },
        { name: "robots", content: "noindex, nofollow" },
      ],
    };
  },
  component: EnterpriseAdminSectionPage,
});

function EnterpriseAdminSectionPage() {
  const { section } = Route.useParams();
  if (!isEnterpriseAdminSectionId(section) || section === "overview") {
    return null;
  }
  return <EnterpriseAdminSectionBody sectionId={section} />;
}
