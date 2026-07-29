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
import {
  Compass,
  Database,
  ShieldCheck,
  TrendingUp,
  Briefcase,
  Sparkles,
  Plus,
  Loader2,
  ScanSearch,
} from "lucide-react";

export const Route = createFileRoute("/_app/studio/use-case/$id/advisorx")({
  component: () => (
    <RequirePlan min="pro" feature="AdvisorX™">
      <AdvisorXPage />
    </RequirePlan>
  ),
});

type AdvisorKey = "strategy" | "data" | "governance" | "roi" | "boardroom";

const ADVISORS: {
  key: AdvisorKey;
  icon: any;
  title: string;
  description: string;
}[] = [
  {
    key: "strategy",
    icon: Compass,
    title: "Strategy Advisor",
    description: "Reviews strategic alignment and business value.",
  },
  {
    key: "data",
    icon: Database,
    title: "Data Advisor",
    description: "Reviews data readiness, quality, ownership, and risk.",
  },
  {
    key: "governance",
    icon: ShieldCheck,
    title: "Governance Advisor",
    description: "Reviews legal, ethical, compliance, privacy, and human oversight concerns.",
  },
  {
    key: "roi",
    icon: TrendingUp,
    title: "ROI Advisor",
    description: "Reviews value logic, KPIs, ROI assumptions, and benefits.",
  },
  {
    key: "boardroom",
    icon: Briefcase,
    title: "Boardroom Advisor",
    description: "Converts the use case into executive-ready language.",
  },
];

type Review = {
  observations: string[];
  recommendations: string[];
};

const arr = (v: any): any[] => (Array.isArray(v) ? v : []);
const has = (s?: string | null) => !!(s && s.trim().length > 10);

function buildReview(advisor: AdvisorKey, uc: any, feas: any, dr: any): Review {
  switch (advisor) {
    case "strategy":
      return {
        observations: [
          uc?.problem_statement
            ? `Problem framed as: "${String(uc.problem_statement).slice(0, 140)}…"`
            : "Problem statement is missing or too thin.",
          uc?.future_state ? "Future state is articulated." : "Future state is not yet defined.",
          feas?.viability_score
            ? `Viability pillar: ${feas.viability_score}/5.`
            : "Viability not yet scored.",
        ],
        recommendations: [
          "Tie this use case to one named strategic objective with an executive sponsor.",
          "Quantify the cost of inaction over 12–24 months.",
          has(uc?.beneficiaries)
            ? "Map beneficiaries to a specific value-chain stage."
            : "Identify primary and secondary beneficiaries explicitly.",
          "Define what success looks like in 90, 180, and 365 days.",
        ],
      };
    case "data":
      return {
        observations: [
          dr?.overall_data_readiness_score != null
            ? `Overall data readiness: ${dr.overall_data_readiness_score}/100.`
            : "No data readiness assessment on file.",
          arr(uc?.data_sources).length
            ? `${arr(uc.data_sources).length} data source(s) listed in canvas.`
            : "No data sources listed in canvas.",
          dr?.privacy_exposure_score != null && Number(dr.privacy_exposure_score) <= 3
            ? "Elevated privacy exposure detected."
            : "Privacy exposure looks manageable or not yet assessed.",
        ],
        recommendations: [
          "Confirm a named data owner and steward for every source.",
          "Run a quality profile (missingness, duplicates, drift) on top-3 sources.",
          "Document lineage and refresh cadence for each source.",
          "Decide on a privacy-preserving approach (masking, aggregation, synthetic) before pilot.",
        ],
      };
    case "governance":
      return {
        observations: [
          arr(uc?.risks).length
            ? `${arr(uc.risks).length} risk(s) captured.`
            : "No risks captured yet.",
          arr(uc?.controls).length
            ? `${arr(uc.controls).length} control(s) captured.`
            : "Controls register is empty.",
          feas?.governability_score
            ? `Governability pillar: ${feas.governability_score}/5.`
            : "Governability not scored.",
        ],
        recommendations: [
          "Classify the use case against your AI risk framework (e.g. EU AI Act / NIST AI RMF).",
          "Define human-in-the-loop checkpoints for high-impact predictions.",
          "Establish model cards, decision logs, and incident response paths.",
          "Schedule a privacy & cyber review before pilot exit.",
        ],
      };
    case "roi":
      return {
        observations: [
          arr(uc?.expected_benefits).length
            ? `${arr(uc.expected_benefits).length} expected benefit(s).`
            : "No expected benefits articulated.",
          arr(uc?.kpis).length ? `${arr(uc.kpis).length} KPI(s) defined.` : "KPIs are missing.",
          feas?.total_score != null
            ? `Overall feasibility score: ${feas.total_score}/100.`
            : "Feasibility not scored.",
        ],
        recommendations: [
          "Convert each benefit into a measurable KPI with a baseline and target.",
          "Separate hard ROI (cost, revenue) from soft ROI (risk, experience).",
          "Model a low/base/high ROI scenario over a 3-year horizon.",
          "Identify the single KPI that, if moved, justifies the investment alone.",
        ],
      };
    case "boardroom":
      return {
        observations: [
          uc?.title ? `Working title: "${uc.title}".` : "Use case has no title.",
          feas?.recommendation
            ? `Feasibility recommendation: ${feas.recommendation}.`
            : "No feasibility recommendation yet.",
        ],
        recommendations: [
          "Lead with the business outcome in one sentence — not the technology.",
          "Frame the ask as a decision: pilot funding, sponsor, and 90-day milestone.",
          "Show 3 risks and how they are controlled — board cares about downside.",
          "End with the ROI envelope and the cost of doing nothing.",
        ],
      };
  }
}

function formatReview(advisor: AdvisorKey, review: Review): string {
  const title = ADVISORS.find((a) => a.key === advisor)!.title;
  return (
    `### ${title}\n\n` +
    `**Observations**\n${review.observations.map((o) => `• ${o}`).join("\n")}\n\n` +
    `**Recommendations**\n${review.recommendations.map((r) => `• ${r}`).join("\n")}`
  );
}

function AdvisorXPage() {
  const { id: useCaseId } = Route.useParams();
  const [busy, setBusy] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Partial<Record<AdvisorKey, Review>>>({});
  const [context, setContext] = useState<{ uc: any; feas: any; dr: any }>({
    uc: null,
    feas: null,
    dr: null,
  });

  useEffect(() => {
    (async () => {
      const [uc, feas, dr, links] = await Promise.all([
        studioRepo.getStudioUseCase(useCaseId).catch(() => null),
        studioRepo.getLatestFeasibility(useCaseId, "*", "created_at").catch(() => null),
        studioRepo.getLatestDataReadiness(useCaseId).catch(() => null),
        studioRepo.listIntegrationLinks<any>(useCaseId, "AdvisorX").catch(() => []),
      ]);
      setContext({ uc, feas, dr });
      const map: Partial<Record<AdvisorKey, Review>> = {};
      links.forEach((row: any) => {
        const meta = row.metadata as any;
        if (meta?.advisor && meta?.review) map[meta.advisor as AdvisorKey] = meta.review as Review;
      });
      setReviews(map);
    })();
  }, [useCaseId]);

  const runReview = async (advisor: AdvisorKey, action: "review" | "recommend") => {
    setBusy(`${advisor}-${action}`);
    const review = buildReview(advisor, context.uc, context.feas, context.dr);
    setReviews((prev) => ({ ...prev, [advisor]: review }));
    try {
      await studioRepo.createIntegrationLink({
        useCaseId,
        integrationType: "AdvisorX",
        status: action === "review" ? "reviewed" : "recommended",
        metadata: { advisor, action, review, generated_at: new Date().toISOString() },
      });
    } catch (e) {
      setBusy(null);
      toast.error(toUserMessage(e, "We could not save this review."));
      return;
    }
    setBusy(null);
    toast.success(
      action === "review" ? "AdvisorX review generated." : "Recommendations generated.",
    );
  };

  const addToBlueprint = async (advisor: AdvisorKey) => {
    const review = reviews[advisor];
    if (!review) {
      toast.error("Generate recommendations first.");
      return;
    }
    setBusy(`${advisor}-blueprint`);
    const block = `\n\n---\n\n${formatReview(advisor, review)}`;
    const { data: existing } = await supabase
      .from("blueprints")
      .select("id, executive_summary")
      .eq("use_case_id", useCaseId)
      .maybeSingle();
    const merged = (existing?.executive_summary ?? "") + block;
    const { error } = existing
      ? await supabase
          .from("blueprints")
          .update({ executive_summary: merged } as any)
          .eq("id", existing.id)
      : await supabase
          .from("blueprints")
          .insert({ use_case_id: useCaseId, executive_summary: merged } as any);
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Recommendations added to Blueprint.");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AdvisorX™ Guidance</h1>
          <p className="max-w-2xl text-muted-foreground">
            Use AdvisorX™ as an executive AI advisor to review, challenge, and improve this use
            case.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/studio/use-case/$id/blueprint" params={{ id: useCaseId }}>
            ← Blueprint
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {ADVISORS.map(({ key, icon: Icon, title, description }) => {
          const review = reviews[key];
          return (
            <Card key={key} className="flex flex-col">
              <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                <div className="rounded-md bg-primary/10 p-2 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base">{title}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                </div>
                {review && (
                  <Badge
                    variant="secondary"
                    className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                  >
                    Reviewed
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                {review && (
                  <div className="space-y-3 rounded-md border bg-muted/30 p-3 text-sm">
                    <div>
                      <p className="mb-1 font-medium">Observations</p>
                      <ul className="space-y-1 text-muted-foreground">
                        {review.observations.map((o, i) => (
                          <li key={i}>• {o}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="mb-1 font-medium">Recommendations</p>
                      <ul className="space-y-1 text-muted-foreground">
                        {review.recommendations.map((r, i) => (
                          <li key={i}>• {r}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                <div className="mt-auto flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => runReview(key, "review")}
                    disabled={busy?.startsWith(key)}
                  >
                    {busy === `${key}-review` ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ScanSearch className="mr-2 h-4 w-4" />
                    )}
                    Review Use Case
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => runReview(key, "recommend")}
                    disabled={busy?.startsWith(key)}
                  >
                    {busy === `${key}-recommend` ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    Generate Recommendations
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => addToBlueprint(key)}
                    disabled={!review || busy?.startsWith(key)}
                  >
                    {busy === `${key}-blueprint` ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}
                    Add to Blueprint
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-dashed">
        <CardContent className="pt-6 text-sm text-muted-foreground">
          AdvisorX recommendations shown here are structured drafts based on your canvas,
          feasibility, and data readiness. Live AdvisorX™ AI review can be enabled in{" "}
          <span className="font-medium text-foreground">Enterprise configuration</span>.
        </CardContent>
      </Card>

      <SampleDataDisclaimer />
    </div>
  );
}
