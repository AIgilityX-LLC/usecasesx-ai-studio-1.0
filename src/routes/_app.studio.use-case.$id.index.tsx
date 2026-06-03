import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DecisionHistory } from "@/components/DecisionHistory";

export const Route = createFileRoute("/_app/studio/use-case/$id/")({
  head: () => ({ meta: [{ title: "Use Case Detail — AI Use Case Studio" }] }),
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("ai_use_cases")
        .select("id,title,status,ai_type,risk_level,problem_statement,current_state,future_state,created_at,updated_at")
        .eq("id", id)
        .maybeSingle();
      if (active) { setUc(data as UC | null); setLoading(false); }
    })();
    return () => { active = false; };
  }, [id]);

  const links: { to: any; label: string }[] = [
    { to: "/studio/use-case/$id/feasibility", label: "Feasibility" },
    { to: "/studio/use-case/$id/data-readiness", label: "Data Readiness" },
    { to: "/studio/use-case/$id/blueprint", label: "Blueprint" },
    { to: "/studio/use-case/$id/sarpi", label: "SARPI" },
    { to: "/studio/use-case/$id/advisorx", label: "AdvisorX" },
    { to: "/studio/use-case/$id/c3g-governance", label: "C3G Governance" },
  ];

  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-[1200px] px-6 py-10 space-y-6">
        <header className="space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
            AI Use Case Studio
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {loading ? "Loading…" : uc?.title ?? "Use case not found"}
          </h1>
          {uc && (
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline">{uc.status}</Badge>
              {uc.ai_type && <Badge variant="secondary">{uc.ai_type}</Badge>}
              {uc.risk_level && <Badge variant="secondary">Risk: {uc.risk_level}</Badge>}
            </div>
          )}
        </header>

        {uc && (
          <>
            <div className="flex flex-wrap gap-2">
              {links.map((l) => (
                <Button key={l.label} asChild variant="outline" size="sm">
                  <Link to={l.to} params={{ id }}>{l.label}</Link>
                </Button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2">
                <CardHeader><CardTitle className="text-base">Canvas Summary</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <Field label="Problem statement" value={uc.problem_statement} />
                  <Field label="Current state" value={uc.current_state} />
                  <Field label="Future state" value={uc.future_state} />
                </CardContent>
              </Card>

              <DecisionHistory useCaseId={id} />
            </div>
          </>
        )}
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
