import { Link } from "@tanstack/react-router";
import {
  Briefcase,
  FileBarChart,
  FileDown,
  FileText,
  Landmark,
  LineChart,
  Scale,
  Shield,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHero } from "@/components/usecasex/PageHero";
import { StatusChip } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavCapabilities } from "@/hooks/useNavCapabilities";
import { EXPORT_FORMAT_LABELS, type ExportFormat } from "@/lib/reports/report-access";
import { REPORTS_HUB_ITEMS, type ReportHubItem } from "@/lib/reports/reports-hub";

const ICONS: Record<string, LucideIcon> = {
  "executive-summary": Landmark,
  "board-pack": Briefcase,
  portfolio: FileBarChart,
  "ai-investment": LineChart,
  "roi-value": LineChart,
  "governance-summary": Shield,
  "use-case-business-case": FileText,
  "export-center": FileDown,
};

function formatList(formats: readonly ExportFormat[]): string {
  if (formats.length === 0) return "None live yet";
  return formats.map((f) => EXPORT_FORMAT_LABELS[f]).join(" · ");
}

function HubCard({ item }: { item: ReportHubItem }) {
  const Icon = ICONS[item.id] ?? FileBarChart;
  const planned = item.status === "planned";

  const body = (
    <Card
      className={
        planned
          ? "h-full opacity-95"
          : "h-full transition-colors hover:border-primary/40 hover:bg-accent/30"
      }
    >
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <Icon className="h-5 w-5 text-primary" aria-hidden />
          <StatusChip tone={planned ? "neutral" : "success"}>
            {planned ? "Not live" : "Available"}
          </StatusChip>
        </div>
        <CardTitle className="text-base">{item.label}</CardTitle>
        <CardDescription>{item.summary}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-xs text-muted-foreground">
        <p>
          <span className="font-medium text-foreground">Audience:</span> {item.audience}
        </p>
        <p>
          <span className="font-medium text-foreground">Formats:</span>{" "}
          {formatList(item.liveFormats)}
        </p>
        {planned ? (
          <p className="pt-1 text-muted-foreground">
            Planned capability — no generator or export backend for this report yet.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );

  return (
    <Link
      to="/reports/$slug"
      params={{ slug: item.slug }}
      className="block h-full rounded-lg outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={planned ? `${item.label} (not live)` : item.label}
    >
      {body}
    </Link>
  );
}

/** Landing surface for `/reports` — one global nav entry, many recipes. */
export function ReportsHub() {
  const nav = useNavCapabilities();
  const items = nav.loading
    ? REPORTS_HUB_ITEMS
    : REPORTS_HUB_ITEMS.filter((item) => nav.has(item.capability));

  return (
    <>
      <PageHero
        tone="dark"
        eyebrow="Reports"
        title="Reports Hub"
        description="Generate executive and portfolio reports from workspace records you already own. Only Available recipes open a generator; planned items stay visible without implying they ship today."
        actions={
          <Button asChild variant="outline">
            <Link to="/reports/$slug" params={{ slug: "export-center" }}>
              Export Center
            </Link>
          </Button>
        }
      />

      <section className="border-b border-border bg-background">
        <div className="mx-auto max-w-[1100px] px-6 py-10">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <HubCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
