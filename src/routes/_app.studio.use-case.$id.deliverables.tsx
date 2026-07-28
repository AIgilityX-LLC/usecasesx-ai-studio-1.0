import { createFileRoute, Link } from "@tanstack/react-router";
import { RequirePlan } from "@/components/RequirePlan";
import { SampleDataDisclaimer } from "@/components/usecasex/SampleDataDisclaimer";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DELIVERABLE_ORDER,
  DELIVERABLE_META,
  type DeliverableType,
  type DeliverableStatus,
} from "@/lib/deliverables";
import { loadDeliverables } from "@/lib/deliverables.data";
import { ArrowRight, ExternalLink, Loader2, FileStack } from "lucide-react";

export const Route = createFileRoute("/_app/studio/use-case/$id/deliverables")({
  head: () => ({ meta: [{ title: "Deliverables — AI Use Case Studio" }] }),
  component: () => (
    <RequirePlan min="pro" feature="Enterprise Deliverables">
      <DeliverablesHub />
    </RequirePlan>
  ),
});

const STATUS_STYLE: Record<DeliverableStatus, string> = {
  not_started: "bg-muted text-muted-foreground",
  draft: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  ready: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
};

const STATUS_LABEL: Record<DeliverableStatus, string> = {
  not_started: "Not started",
  draft: "Draft",
  ready: "Ready",
};

function DeliverablesHub() {
  const { id } = Route.useParams();
  const [title, setTitle] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<string, DeliverableStatus>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: uc }, rows] = await Promise.all([
        supabase.from("ai_use_cases").select("title").eq("id", id).maybeSingle(),
        loadDeliverables(id),
      ]);
      setTitle(uc?.title ?? null);
      const map: Record<string, DeliverableStatus> = {};
      rows.forEach((r) => (map[r.deliverable_type] = r.status));
      setStatuses(map);
      setLoading(false);
    })();
  }, [id]);

  const readyCount = DELIVERABLE_ORDER.filter((t) => statuses[t] === "ready").length;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
            AI Use Case Studio
          </div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Enterprise Deliverables</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            The 12 advisory deliverables for{" "}
            <span className="font-medium text-foreground">{title ?? "this use case"}</span>. Each is
            generated from what you have captured and exported as a client-ready document.
          </p>
          <div className="mt-2 flex gap-2 text-xs">
            <Badge variant="secondary">
              <FileStack className="mr-1 h-3 w-3" /> {readyCount} / 12 ready
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/studio/use-case/$id" params={{ id }}>
              ← Use Case
            </Link>
          </Button>
          <Button asChild>
            <Link
              to="/studio/use-case/$id/deliverable/$type"
              params={{ id, type: "handover_package" }}
            >
              Build Handover Package
            </Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {DELIVERABLE_ORDER.map((type) => {
            const meta = DELIVERABLE_META[type];
            const status = statuses[type] ?? "not_started";
            const isExternal = !!meta.existingRoute;
            return (
              <Card key={type} className="flex flex-col">
                <CardHeader className="space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm leading-snug">
                      <span className="text-muted-foreground">{meta.order}. </span>
                      {meta.label}
                    </CardTitle>
                    {!isExternal && (
                      <Badge variant="secondary" className={STATUS_STYLE[status]}>
                        {STATUS_LABEL[status]}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-between gap-3">
                  <p className="text-xs text-muted-foreground">{meta.description}</p>
                  {isExternal ? (
                    <Button variant="outline" size="sm" className="self-start" asChild>
                      <Link
                        to={meta.existingRoute as never}
                        params={(meta.existingRoute!.includes("$id") ? { id } : undefined) as never}
                      >
                        Open module <ExternalLink className="ml-1 h-3 w-3" />
                      </Link>
                    </Button>
                  ) : (
                    <Button size="sm" className="self-start" asChild>
                      <Link to="/studio/use-case/$id/deliverable/$type" params={{ id, type }}>
                        {status === "not_started" ? "Build" : "Edit"}{" "}
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <SampleDataDisclaimer />
    </div>
  );
}
