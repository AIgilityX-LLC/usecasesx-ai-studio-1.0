import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import * as studioRepo from "@/lib/domain/studio.repository";
import { SolutionDesignPanel } from "@/components/solution-design/SolutionDesignPanel";

export const Route = createFileRoute("/_app/studio/use-case/$id/solution-design")({
  head: () => ({
    meta: [
      { title: "Solution Design — AI Use Case Studio" },
      {
        name: "description",
        content:
          "Classify AI/ML/GenAI/agentic patterns, capture autonomy controls and preview an AI System / Agent Card from confirmed fields.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: UseCaseSolutionDesignPage,
});

type UC = {
  id: string;
  title: string;
  workspace_id: string | null;
};

function UseCaseSolutionDesignPage() {
  const { id } = Route.useParams();
  const [uc, setUc] = useState<UC | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const data = await studioRepo
        .getStudioUseCase<UC>(id, "id,title,workspace_id")
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

  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-[1200px] space-y-6 px-6 py-10">
        <header className="space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
            Agentic & AI System Designer
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {loading ? "Loading…" : (uc?.title ?? "Use case")}
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Capture solution type, autonomy and agentic controls. The Agent Card preview uses only
            confirmed fields and marks missing or AI-drafted content. OWASP GenAI prompts are
            readiness aids — not legal conclusions.
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
            This use case has no workspace — solution design cannot be saved.
          </p>
        )}

        {uc?.workspace_id && (
          <SolutionDesignPanel useCaseId={uc.id} useCaseTitle={uc.title} />
        )}
      </div>
    </section>
  );
}
