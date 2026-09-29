import { CollaborationPanel } from "@/components/collab/CollaborationPanel";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SampleDataDisclaimer } from "@/components/usecasex/SampleDataDisclaimer";
import { useEffect, useState } from "react";
import * as studioRepo from "@/lib/domain/studio.repository";
import { toUserMessage } from "@/lib/domain/errors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DecisionHistory } from "@/components/DecisionHistory";
import { PriorityScore } from "@/components/scoring/PriorityScore";
import { useLatestScores } from "@/hooks/useLatestScores";

export const Route = createFileRoute("/_app/studio/use-case/$id/")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "Use Case Detail — AI Use Case Studio" },
    ],
  }),
  component: UseCaseDetailPage,
});

type UC = {
  id: string;
  title: string;
  status: string;
  ai_type: string | null;
  risk_level: string | null;
  problem_statement: string | null;
  current_state: string | null;
  future_state: string | null;
  created_at: string;
  updated_at: string;
};

function UseCaseDetailPage() {
  const { id } = Route.useParams();
  const [uc, setUc] = useState<UC | null>(null);
  const { scoreFor } = useLatestScores([id]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const data = await studioRepo
        .getStudioUseCase<UC>(
          id,
          "id,title,status,ai_type,risk_level,problem_statement,current_state,future_state,created_at,updated_at",
        )
        .catch(() => null);
      if (active) {
        setUc(data);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const linkClass =
    "inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-secondary";

  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-[1200px] px-6 py-10 space-y-6">
        <header className="space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
            AI Use Case Studio
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {loading ? "Loading…" : (uc?.title ?? "Use case not found")}
          </h1>
          {uc && (
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline">{uc.status}</Badge>
              {uc.ai_type && <Badge variant="secondary">{uc.ai_type}</Badge>}
              {uc.risk_level && <Badge variant="secondary">Risk: {uc.risk_level}</Badge>}
              <PriorityScore score={scoreFor(id)} />
            </div>
          )}
        </header>

        {uc && (
          <>
            <div className="flex flex-wrap gap-2">
              <Link className={linkClass} to="/studio/use-case/$id/scorecard" params={{ id }}>
                Scorecard
              </Link>
              <Link className={linkClass} to="/studio/use-case/$id/feasibility" params={{ id }}>
                Feasibility
              </Link>

              <Link
                className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                to="/studio/use-case/$id/wizard"
                params={{ id }}
              >
                Guided design
              </Link>
              <Link className={linkClass} to="/studio/use-case/$id/data-readiness" params={{ id }}>
                Data Readiness
              </Link>
              <Link className={linkClass} to="/studio/use-case/$id/blueprint" params={{ id }}>
                Blueprint
              </Link>
              <Link className={linkClass} to="/studio/use-case/$id/value" params={{ id }}>
                Value
              </Link>
              <Link className={linkClass} to="/studio/use-case/$id/evidence" params={{ id }}>
                Evidence
              </Link>
              <Link
                className={linkClass}
                to="/studio/use-case/$id/solution-design"
                params={{ id }}
              >
                Solution Design
              </Link>
              <Link className={linkClass} to="/studio/use-case/$id/gates" params={{ id }}>
                Decision Gates
              </Link>
              <Link className={linkClass} to="/studio/use-case/$id/brief" params={{ id }}>
                Implementation brief
              </Link>
              <Link className={linkClass} to="/studio/use-case/$id/deliverables" params={{ id }}>
                Deliverables
              </Link>
              <Link className={linkClass} to="/studio/use-case/$id/sarpi" params={{ id }}>
                SARPI
              </Link>
              <Link className={linkClass} to="/studio/use-case/$id/advisorx" params={{ id }}>
                AdvisorX
              </Link>
              <Link className={linkClass} to="/studio/use-case/$id/c3g-governance" params={{ id }}>
                Governance preview
              </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Canvas Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <Field label="Problem statement" value={uc.problem_statement} />
                  <Field label="Current state" value={uc.current_state} />
                  <Field label="Future state" value={uc.future_state} />
                  <div className="rounded-md border border-border bg-muted/30 p-3">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Governance readiness
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Informational applicability preview (not legal advice). Capture purpose, role,
                      geography and risk signals, then hand off to CyberX C3G/SARN with consent.
                    </p>
                    <Link
                      className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
                      to="/studio/use-case/$id/c3g-governance"
                      params={{ id }}
                    >
                      Open governance preview →
                    </Link>
                  </div>
                </CardContent>
              </Card>

              <DecisionHistory useCaseId={id} />
            </div>

            <CollaborationPanel entityType="use_case" entityId={id} />
          </>
        )}

        <SampleDataDisclaimer />
      </div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 whitespace-pre-wrap">{value || "—"}</p>
    </div>
  );
}
