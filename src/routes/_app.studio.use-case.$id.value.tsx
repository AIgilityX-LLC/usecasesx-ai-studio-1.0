import { createFileRoute, Link } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BenefitsPanel } from "@/components/value/BenefitsPanel";
import { useBenefitAudit } from "@/hooks/useBenefits";
import { CLIENT_CAPABILITY_FLAGS, ENTERPRISE_VALUE_FEATURES } from "@/lib/feature-flags";

export const Route = createFileRoute("/_app/studio/use-case/$id/value")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "Value Realization — AI Use Case Studio" },
      {
        name: "description",
        content:
          "Track baseline, target and expected value per benefit, with owner, cadence and evidence for each AI use case.",
      },
      { property: "og:title", content: "Value Realization — AI Use Case Studio" },
      {
        property: "og:description",
        content: "Measurable benefits, owners and verification states for an AI use case.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ValuePage,
});

function ValuePage() {
  const { id } = Route.useParams();
  const { entries, isLoading } = useBenefitAudit(id);
  const erpVerification =
    ENTERPRISE_VALUE_FEATURES.erpBenefitVerification && CLIENT_CAPABILITY_FLAGS.integrations;

  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-[1200px] space-y-6 px-6 py-10">
        <header className="space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
            AI Use Case Studio
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Value realization</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Record the benefits this use case is expected to deliver, who owns each one and how it
            will be measured. Values only aggregate across matching units, currencies and periods.
          </p>
          <Link
            className="inline-flex text-xs font-medium text-primary underline-offset-4 hover:underline"
            to="/studio/use-case/$id"
            params={{ id }}
          >
            ← Back to use case
          </Link>
        </header>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <BenefitsPanel useCaseId={id} />
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
                <CardTitle className="text-base">Verification</CardTitle>
                <Badge variant={erpVerification ? "default" : "outline"}>
                  {erpVerification ? "ERP automated" : "Manual"}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-muted-foreground">
                <p>
                  Benefits are verified from the evidence source recorded against each benefit and
                  signed off by its owner.
                </p>
                {!erpVerification && (
                  <p>
                    Automated verification from ERP and finance systems is an Enterprise capability
                    and is not active in this workspace.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Value change history</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-xs text-muted-foreground">Loading history…</p>
                ) : entries.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No value changes recorded yet. Every add, edit and removal is logged here.
                  </p>
                ) : (
                  <ol className="space-y-3">
                    {entries.map((entry) => (
                      <li key={entry.id} className="border-l-2 border-border pl-3">
                        <p className="text-xs font-medium">{describeEvent(entry.eventType)}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(entry.at).toLocaleString()}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {summarise(entry.next ?? entry.previous)}
                        </p>
                      </li>
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}

function describeEvent(eventType: string): string {
  if (eventType.endsWith("added")) return "Benefit added";
  if (eventType.endsWith("updated")) return "Benefit updated";
  if (eventType.endsWith("removed")) return "Benefit removed";
  return eventType;
}

function summarise(payload: Record<string, unknown> | null): string {
  if (!payload) return "—";
  const name = typeof payload["name"] === "string" ? payload["name"] : "Benefit";
  const state = typeof payload["state"] === "string" ? payload["state"] : null;
  return state ? `${name} · ${state}` : name;
}
