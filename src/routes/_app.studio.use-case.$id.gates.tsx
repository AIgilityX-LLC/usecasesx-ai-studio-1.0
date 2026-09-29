import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import * as studioRepo from "@/lib/domain/studio.repository";
import { DecisionGatesPanel } from "@/components/gates/DecisionGatesPanel";

export const Route = createFileRoute("/_app/studio/use-case/$id/gates")({
  head: () => ({
    meta: [
      { title: "Decision gates — AI Use Case Studio" },
      {
        name: "description",
        content:
          "Submit use cases to Intake, Discovery, Investment, Pilot, Scale and Retirement gates with SLA and conditions.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: UseCaseGatesPage,
});

type UC = {
  id: string;
  title: string;
  workspace_id: string | null;
  problem_statement: string | null;
  future_state: string | null;
  owner_user_id: string | null;
};

function UseCaseGatesPage() {
  const { id } = Route.useParams();
  const [uc, setUc] = useState<UC | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const data = await studioRepo
        .getStudioUseCase<UC>(
          id,
          "id,title,workspace_id,problem_statement,future_state,owner_user_id",
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

  const fields = useMemo(
    () => ({
      title: uc?.title ?? null,
      problem: uc?.problem_statement ?? null,
      desiredOutcome: uc?.future_state ?? null,
      owner: uc?.owner_user_id ?? null,
    }),
    [uc],
  );

  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-[960px] space-y-6 px-6 py-10">
        <header className="space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
            Decision gates
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {loading ? "Loading…" : (uc?.title ?? "Use case")}
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Human-decided gates with immutable decision events, SLA indicators and visible
            unresolved conditions. AI may flag missing inputs only.
          </p>
          <Link
            to="/studio/use-case/$id"
            params={{ id }}
            className="text-xs font-medium text-primary hover:underline"
          >
            ← Back to use case
          </Link>
        </header>

        {!loading && !uc?.workspace_id && (
          <p className="text-sm text-destructive">
            This use case has no workspace — gates cannot be submitted.
          </p>
        )}

        {uc?.workspace_id && <DecisionGatesPanel useCaseId={uc.id} fields={fields} />}
      </div>
    </section>
  );
}
