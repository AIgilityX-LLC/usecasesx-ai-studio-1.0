import { createFileRoute, notFound } from "@tanstack/react-router";
import { ReportPlanned } from "@/components/reports/ReportPlanned";
import { ReportsExportCenter } from "@/components/reports/ReportsExportCenter";
import { ReportsGenerator } from "@/components/reports/ReportsGenerator";
import { getReportHubItem } from "@/lib/reports/reports-hub";

export const Route = createFileRoute("/_app/reports/$slug")({
  head: ({ params }) => {
    const item = getReportHubItem(params.slug);
    const title = item ? `${item.label} — Reports` : "Report — UseCasesX™";
    return {
      meta: [
        { name: "robots", content: "noindex, nofollow" },
        { title },
        {
          name: "description",
          content: item?.summary ?? "Workspace report from UseCasesX™.",
        },
      ],
    };
  },
  component: ReportSlugPage,
});

function ReportSlugPage() {
  const { slug } = Route.useParams();
  const item = getReportHubItem(slug);
  if (!item) throw notFound();

  if (item.id === "export-center") {
    return <ReportsExportCenter />;
  }

  if (item.status === "planned") {
    return <ReportPlanned item={item} />;
  }

  if (!item.generatorType) {
    return <ReportPlanned item={item} />;
  }

  return (
    <ReportsGenerator
      initialType={item.generatorType}
      hubLabel={item.label}
      lockType
    />
  );
}
