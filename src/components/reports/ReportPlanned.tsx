import { Link } from "@tanstack/react-router";
import { PageHero } from "@/components/usecasex/PageHero";
import { StatusChip } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReportHubItem } from "@/lib/reports/reports-hub";

/** Planned report detail — mirrors Opportunity Map “Not live” pattern. */
export function ReportPlanned({ item }: { item: ReportHubItem }) {
  return (
    <>
      <PageHero
        tone="dark"
        eyebrow="Reports"
        title={item.label}
        description={item.summary}
        actions={
          <Button asChild variant="outline">
            <Link to="/reports">Back to hub</Link>
          </Button>
        }
      />
      <section className="border-b border-border bg-secondary/40">
        <div className="mx-auto max-w-2xl space-y-4 px-6 py-10">
          <div className="flex items-center gap-2">
            <StatusChip tone="neutral">Not live</StatusChip>
            <span className="text-sm text-muted-foreground">
              Designed into the reporting model; not shipped in this edition.
            </span>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">What exists today</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>{item.existingImplementation}</p>
              <div>
                <p className="font-medium text-foreground">Audience</p>
                <p>{item.audience}</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Required data (when built)</p>
                <ul className="list-disc space-y-1 pl-5">
                  {item.requiredData.map((row) => (
                    <li key={row}>{row}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-medium text-foreground">Missing implementation</p>
                <ul className="list-disc space-y-1 pl-5">
                  {item.missingImplementation.map((row) => (
                    <li key={row}>{row}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/reports/$slug" params={{ slug: "portfolio" }}>
                Open Portfolio Report
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/reviews">Review Inbox</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
