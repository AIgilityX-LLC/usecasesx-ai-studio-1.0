import { createFileRoute, Link } from "@tanstack/react-router";
import { SampleDataDisclaimer } from "@/components/usecasex/SampleDataDisclaimer";
import { RequirePlan } from "@/components/RequirePlan";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import * as studioRepo from "@/lib/domain/studio.repository";
import { toUserMessage } from "@/lib/domain/errors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gauge, TrendingUp, Activity, Target, Plus, Loader2 } from "lucide-react";
import { privateHead } from "@/lib/seo";

export const Route = createFileRoute("/_app/studio/use-case/$id/sarpi")({
  head: () => privateHead("Use case SARPI"),
  component: () => (
    <RequirePlan min="pro" feature="SARPI™ assessment">
      <SarpiPage />
    </RequirePlan>
  ),
});

const CARDS = [
  {
    key: "readiness",
    icon: Gauge,
    title: "AI Readiness Score",
    description:
      "Assess strategy, data, process, people, technology, governance, and operational AI readiness.",
  },
  {
    key: "roi",
    icon: TrendingUp,
    title: "Agentic AI ROI Scorecard™",
    description:
      "Measure productivity ROI, financial ROI, operational ROI, decision ROI, risk ROI, and human-AI ROI.",
  },
  {
    key: "performance",
    icon: Activity,
    title: "AI Performance Index",
    description:
      "Track post-pilot performance, adoption, quality, cycle time, and service improvement.",
  },
  {
    key: "value",
    icon: Target,
    title: "Value Realization Dashboard",
    description: "Monitor actual benefits against planned business or public value outcomes.",
  },
] as const;

type CardKey = (typeof CARDS)[number]["key"];

function SarpiPage() {
  const { id: useCaseId } = Route.useParams();
  const [creating, setCreating] = useState<CardKey | "all" | null>(null);
  const [existing, setExisting] = useState<Record<string, any>>({});

  useEffect(() => {
    (async () => {
      const data = await studioRepo.listIntegrationLinks(useCaseId, "SARPI").catch(() => []);
      const map: Record<string, any> = {};
      data.forEach((row: any) => {
        const k = (row.metadata as any)?.assessment ?? "all";
        map[k] = row;
      });
      setExisting(map);
    })();
  }, [useCaseId]);

  const createAssessment = async (assessment: CardKey | "all", title: string) => {
    setCreating(assessment);
    let data: any;
    try {
      data = await studioRepo.createIntegrationLink({
        useCaseId,
        integrationType: "SARPI",
        status: "draft",
        metadata: { assessment, title, created_at: new Date().toISOString() },
      });
    } catch (e) {
      setCreating(null);
      toast.error(toUserMessage(e, "We could not start this assessment."));
      return;
    }
    setCreating(null);
    setExisting((prev) => ({ ...prev, [assessment]: data }));
    toast.success(
      "SARPI integration record created. Full SARPI API connection can be enabled in Enterprise configuration.",
    );
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">SARPI™ Integration</h1>
          <p className="max-w-2xl text-muted-foreground">
            Connect this AI use case to SARPI™ for deeper AI readiness, ROI, performance, and value
            assessment.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/studio/use-case/$id/blueprint" params={{ id: useCaseId }}>
              ← Blueprint
            </Link>
          </Button>
          <Button
            onClick={() => createAssessment("all", "Full SARPI Assessment")}
            disabled={creating === "all"}
          >
            {creating === "all" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Create SARPI Assessment
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {CARDS.map(({ key, icon: Icon, title, description }) => {
          const linked = existing[key];
          return (
            <Card key={key} className="flex flex-col">
              <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                <div className="rounded-md bg-primary/10 p-2 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base">{title}</CardTitle>
                  {linked && (
                    <Badge
                      variant="secondary"
                      className="mt-2 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                    >
                      {linked.status}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-between gap-4">
                <p className="text-sm text-muted-foreground">{description}</p>
                <Button
                  variant={linked ? "outline" : "secondary"}
                  size="sm"
                  onClick={() => createAssessment(key, title)}
                  disabled={creating === key}
                >
                  {creating === key ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  {linked ? "Create another" : "Connect to SARPI"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-dashed">
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Full SARPI API connection (live readiness scoring, ROI calculation, and value telemetry)
          can be enabled in{" "}
          <span className="font-medium text-foreground">Enterprise configuration</span>.
        </CardContent>
      </Card>

      <SampleDataDisclaimer />
    </div>
  );
}
