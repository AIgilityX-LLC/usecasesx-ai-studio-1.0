import { Link } from "@tanstack/react-router";
import { FileBarChart, FileDown, Printer, Table2 } from "lucide-react";
import { PageHero } from "@/components/usecasex/PageHero";
import { StatusChip } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWorkspaceContext } from "@/hooks/useWorkspaceContext";
import {
  EXPORT_FORMAT_LABELS,
  canExportReport,
  type ExportFormat,
} from "@/lib/reports/report-access";
import { FUTURE_OUTPUT_FORMATS, REPORTS_HUB_ITEMS } from "@/lib/reports/reports-hub";

const LIVE_FORMATS: ExportFormat[] = ["pdf", "csv", "csv_benefits"];

/** Role-aware export guidance — does not invent new download backends. */
export function ReportsExportCenter() {
  const workspace = useWorkspaceContext();
  const role = workspace.data?.workspaceRole ?? null;

  const openable = REPORTS_HUB_ITEMS.filter(
    (item) => item.status === "available" && item.generatorType && item.id !== "export-center",
  );

  return (
    <>
      <PageHero
        tone="dark"
        eyebrow="Reports"
        title="Export Center"
        description="Export formats that leave the product as files. Permission follows your workspace role; the server re-checks every download."
        actions={
          <Button asChild variant="outline">
            <Link to="/reports">Back to hub</Link>
          </Button>
        }
      />

      <section className="border-b border-border bg-secondary/40">
        <div className="mx-auto max-w-[1100px] space-y-6 px-6 py-10">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Live formats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                Workspace role:{" "}
                <span className="font-medium text-foreground">{role ?? "not a member"}</span>
              </p>
              <ul className="space-y-2">
                {LIVE_FORMATS.map((format) => {
                  const decision = canExportReport(role, format);
                  const Icon = format === "pdf" ? Printer : format === "csv" ? Table2 : FileDown;
                  return (
                    <li
                      key={format}
                      className="flex flex-wrap items-center gap-2 rounded-md border border-border px-3 py-2"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
                      <span className="font-medium">{EXPORT_FORMAT_LABELS[format]}</span>
                      <StatusChip tone={decision.allowed ? "success" : "danger"}>
                        {decision.allowed ? "Allowed" : "Denied"}
                      </StatusChip>
                      {!decision.allowed ? (
                        <span className="text-xs text-muted-foreground">{decision.reason}</span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
              <p className="text-xs text-muted-foreground">
                Open a live report below, generate it, then use Print / CSV on that page. Exports are
                not fabricated here without a generated report.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Open a live report to export</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {openable.map((item) => (
                <Button key={item.id} asChild variant="outline" className="justify-start h-auto py-3">
                  <Link to="/reports/$slug" params={{ slug: item.slug }}>
                    <FileBarChart className="mr-2 h-4 w-4 shrink-0" aria-hidden />
                    <span className="text-left">
                      <span className="block font-medium">{item.label}</span>
                      <span className="block text-xs font-normal text-muted-foreground">
                        {item.generatorType}
                      </span>
                    </span>
                  </Link>
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Planned adapters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Future file adapters are reserved in the modular export layer. They are not live in
                this edition.
              </p>
              <ul className="space-y-1">
                {FUTURE_OUTPUT_FORMATS.map((format) => (
                  <li key={format} className="flex items-center gap-2">
                    <StatusChip tone="neutral">Not live</StatusChip>
                    <span className="font-medium text-foreground uppercase">{format}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
}
