import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePlan } from "@/hooks/usePlan";
import {
  CheckCircle2,
  FileText,
  ShieldCheck,
  Database,
  Sparkles,
  Send,
  Bot,
  ClipboardList,
  RefreshCcw,
  PlusCircle,
  Flag,
} from "lucide-react";

type Event = {
  id: string;
  at: string;
  kind: string;
  title: string;
  detail?: string;
  icon: React.ReactNode;
};

export function DecisionHistory({ useCaseId }: { useCaseId: string }) {
  const plan = usePlan();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const isEnterprise = plan.isEnterprise || plan.features.decisionProvenance;
  const heading = isEnterprise ? "Decision Provenance Report™" : "Activity History";
  const subtitle = isEnterprise
    ? "Immutable record of every decision, score, review, and governance action taken on this use case."
    : "Timeline of changes and milestones for this use case.";

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const items: Event[] = [];

      const [uc, feas, dr, bp, links, audit] = await Promise.all([
        supabase
          .from("ai_use_cases")
          .select("id,title,status,pattern_id,created_at,updated_at")
          .eq("id", useCaseId)
          .maybeSingle(),
        supabase
          .from("feasibility_scores")
          .select("id,total_score,created_at,updated_at")
          .eq("use_case_id", useCaseId)
          .order("created_at"),
        supabase
          .from("data_readiness_assessments")
          .select("id,overall_data_readiness_score,created_at,updated_at")
          .eq("use_case_id", useCaseId)
          .order("created_at"),
        supabase
          .from("blueprints")
          .select("id,created_at,updated_at")
          .eq("use_case_id", useCaseId)
          .order("created_at"),
        supabase
          .from("integration_links")
          .select("id,integration_type,status,created_at,metadata")
          .eq("use_case_id", useCaseId)
          .order("created_at"),
        supabase
          .from("audit_events")
          .select("id,event_type,new_value,previous_value,created_at")
          .eq("entity_type", "ai_use_case")
          .eq("entity_id", useCaseId)
          .order("created_at"),
      ]);

      if (uc.data) {
        items.push({
          id: `uc-created-${uc.data.id}`,
          at: uc.data.created_at,
          kind: "created",
          title: "Use case created",
          detail: uc.data.title,
          icon: <PlusCircle className="h-4 w-4" />,
        });
        if (uc.data.pattern_id) {
          items.push({
            id: `uc-pattern-${uc.data.id}`,
            at: uc.data.created_at,
            kind: "pattern",
            title: "Pattern added",
            detail: "Linked to a UseCaseX pattern",
            icon: <Sparkles className="h-4 w-4" />,
          });
        }
        if (uc.data.updated_at && uc.data.updated_at !== uc.data.created_at) {
          items.push({
            id: `uc-updated-${uc.data.id}`,
            at: uc.data.updated_at,
            kind: "canvas",
            title: "Canvas updated",
            icon: <RefreshCcw className="h-4 w-4" />,
          });
        }
        if (uc.data.status && uc.data.status !== "idea") {
          items.push({
            id: `uc-status-${uc.data.id}`,
            at: uc.data.updated_at ?? uc.data.created_at,
            kind: "status",
            title: `Status: ${uc.data.status}`,
            icon:
              uc.data.status === "approved" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Flag className="h-4 w-4" />
              ),
          });
        }
      }

      (feas.data ?? []).forEach((f) =>
        items.push({
          id: `feas-${f.id}`,
          at: f.created_at,
          kind: "feasibility",
          title: "Feasibility score completed",
          detail: f.total_score != null ? `Total: ${f.total_score}/100` : undefined,
          icon: <ClipboardList className="h-4 w-4" />,
        }),
      );

      (dr.data ?? []).forEach((d) =>
        items.push({
          id: `dr-${d.id}`,
          at: d.created_at,
          kind: "data_readiness",
          title: "Data readiness completed",
          detail:
            d.overall_data_readiness_score != null
              ? `Score: ${d.overall_data_readiness_score}/5`
              : undefined,
          icon: <Database className="h-4 w-4" />,
        }),
      );

      (bp.data ?? []).forEach((b) =>
        items.push({
          id: `bp-${b.id}`,
          at: b.created_at,
          kind: "blueprint",
          title: "Blueprint generated",
          icon: <FileText className="h-4 w-4" />,
        }),
      );

      (links.data ?? []).forEach((l) => {
        const map: Record<string, { title: string; icon: React.ReactNode }> = {
          SARPI: { title: "Sent to SARPI™", icon: <Send className="h-4 w-4" /> },
          AdvisorX: { title: "AdvisorX™ reviewed", icon: <Bot className="h-4 w-4" /> },
          C3G: {
            title: "C3G governance record created",
            icon: <ShieldCheck className="h-4 w-4" />,
          },
        };
        const cfg = map[l.integration_type] ?? {
          title: `${l.integration_type} linked`,
          icon: <ShieldCheck className="h-4 w-4" />,
        };
        items.push({
          id: `il-${l.id}`,
          at: l.created_at,
          kind: l.integration_type.toLowerCase(),
          title: cfg.title,
          detail: l.status ? `Status: ${l.status}` : undefined,
          icon: cfg.icon,
        });
      });

      (audit.data ?? []).forEach((a) =>
        items.push({
          id: `au-${a.id}`,
          at: a.created_at,
          kind: a.event_type,
          title: a.event_type.replace(/_/g, " "),
          icon: <Flag className="h-4 w-4" />,
        }),
      );

      items.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

      if (active) {
        setEvents(items);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [useCaseId]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base">{heading}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          </div>
          {isEnterprise && <Badge variant="secondary">Enterprise · Immutable</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading timeline…</p>
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
        ) : (
          <ol className="relative border-l border-border ml-2 space-y-4">
            {events.map((e) => (
              <li key={e.id} className="ml-4">
                <span className="absolute -left-2 mt-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <span className="block h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                </span>
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 text-muted-foreground">{e.icon}</span>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <p className="text-sm font-medium text-foreground capitalize">{e.title}</p>
                      <time className="text-xs text-muted-foreground">
                        {new Date(e.at).toLocaleString()}
                      </time>
                    </div>
                    {e.detail && <p className="text-xs text-muted-foreground">{e.detail}</p>}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
