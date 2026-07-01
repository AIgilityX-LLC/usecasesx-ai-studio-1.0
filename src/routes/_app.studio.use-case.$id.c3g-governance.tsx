import { createFileRoute, Link } from "@tanstack/react-router";
import { SampleDataDisclaimer } from "@/components/usecasex/SampleDataDisclaimer";
import { RequirePlan } from "@/components/RequirePlan";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ShieldAlert,
  ShieldCheck,
  BookOpenCheck,
  ClipboardCheck,
  Plus,
  Loader2,
} from "lucide-react";

export const Route = createFileRoute("/_app/studio/use-case/$id/c3g-governance")({
  component: () => (<RequirePlan min="pro" feature="C3G™ governance"><C3GGovernancePage /></RequirePlan>),
});

const RISK_OPTIONS = [
  { key: "low", label: "Low risk" },
  { key: "medium", label: "Medium risk" },
  { key: "high", label: "High risk" },
  { key: "prohibited", label: "Prohibited / Restricted risk" },
] as const;

const CONTROL_OPTIONS = [
  { key: "privacy", label: "Privacy control" },
  { key: "cyber", label: "Cyber control" },
  { key: "human_oversight", label: "Human oversight control" },
  { key: "bias_mitigation", label: "Bias mitigation control" },
  { key: "audit_evidence", label: "Audit evidence control" },
  { key: "third_party", label: "Third-party / Vendor control" },
] as const;

const FRAMEWORK_OPTIONS = [
  "AIgilityX Sovereign AI Governance Framework",
  "SERT™",
  "NIST AI RMF",
  "ISO/IEC 42001",
  "EU AI Act",
  "OECD AI Principles",
  "Local / National AI policy",
] as const;

const APPROVAL_OPTIONS = [
  { key: "business_owner", label: "Business owner approval" },
  { key: "data_owner", label: "Data owner approval" },
  { key: "security_review", label: "Security review" },
  { key: "legal_review", label: "Legal review" },
  { key: "compliance_review", label: "Compliance review" },
  { key: "executive", label: "Executive approval" },
] as const;

type Governance = {
  risk: string | null;
  controls: Record<string, boolean>;
  frameworks: Record<string, boolean>;
  approvals: Record<string, boolean>;
  notes: string;
};

const empty: Governance = {
  risk: null,
  controls: {},
  frameworks: {},
  approvals: {},
  notes: "",
};

function C3GGovernancePage() {
  const { id: useCaseId } = Route.useParams();
  const [data, setData] = useState<Governance>(empty);
  const [existing, setExisting] = useState<any>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: rows } = await supabase
        .from("integration_links")
        .select("*")
        .eq("use_case_id", useCaseId)
        .eq("integration_type", "C3G")
        .order("created_at", { ascending: false })
        .limit(1);
      const row = rows?.[0];
      if (row) {
        setExisting(row);
        const meta = (row.metadata as any) ?? {};
        setData({
          risk: meta.risk ?? null,
          controls: meta.controls ?? {},
          frameworks: meta.frameworks ?? {},
          approvals: meta.approvals ?? {},
          notes: meta.notes ?? "",
        });
      }
    })();
  }, [useCaseId]);

  const toggle = (
    group: "controls" | "frameworks" | "approvals",
    key: string,
  ) =>
    setData((d) => ({
      ...d,
      [group]: { ...d[group], [key]: !d[group][key] },
    }));

  const createRecord = async () => {
    setCreating(true);
    const { data: row, error } = await supabase
      .from("integration_links")
      .insert({
        use_case_id: useCaseId,
        integration_type: "C3G",
        status: "draft",
        metadata: {
          ...data,
          created_at: new Date().toISOString(),
        },
      })
      .select()
      .single();
    setCreating(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setExisting(row);
    toast.success(
      "C3G governance record created. Full C3G integration can be enabled in Enterprise configuration.",
    );
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            C3G™ Governance
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Prepare this AI use case for governance, risk, compliance, approval,
            and audit through CyberX Sovereign AI C3G™.
          </p>
          {existing && (
            <Badge
              variant="secondary"
              className="mt-2 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
            >
              {existing.status} · saved
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link
              to="/studio/use-case/$id/advisorx"
              params={{ id: useCaseId }}
            >
              ← AdvisorX
            </Link>
          </Button>
          <Button onClick={createRecord} disabled={creating}>
            {creating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Create C3G Governance Record
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-start gap-3 space-y-0">
            <div className="rounded-md bg-primary/10 p-2 text-primary">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <CardTitle className="text-base">AI Risk Classification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {RISK_OPTIONS.map((r) => (
              <label
                key={r.key}
                className="flex cursor-pointer items-center gap-2 rounded-md border p-2 hover:bg-muted/50"
              >
                <input
                  type="radio"
                  name="risk"
                  checked={data.risk === r.key}
                  onChange={() => setData((d) => ({ ...d, risk: r.key }))}
                />
                <span className="text-sm">{r.label}</span>
              </label>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start gap-3 space-y-0">
            <div className="rounded-md bg-primary/10 p-2 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <CardTitle className="text-base">Governance Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {CONTROL_OPTIONS.map((c) => (
              <label
                key={c.key}
                className="flex cursor-pointer items-center gap-2 rounded-md border p-2 hover:bg-muted/50"
              >
                <Checkbox
                  checked={!!data.controls[c.key]}
                  onCheckedChange={() => toggle("controls", c.key)}
                />
                <span className="text-sm">{c.label}</span>
              </label>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start gap-3 space-y-0">
            <div className="rounded-md bg-primary/10 p-2 text-primary">
              <BookOpenCheck className="h-5 w-5" />
            </div>
            <CardTitle className="text-base">Regulatory Mapping</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {FRAMEWORK_OPTIONS.map((f) => (
              <label
                key={f}
                className="flex cursor-pointer items-center gap-2 rounded-md border p-2 hover:bg-muted/50"
              >
                <Checkbox
                  checked={!!data.frameworks[f]}
                  onCheckedChange={() => toggle("frameworks", f)}
                />
                <span className="text-sm">{f}</span>
              </label>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start gap-3 space-y-0">
            <div className="rounded-md bg-primary/10 p-2 text-primary">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <CardTitle className="text-base">
              Approval Workflow Readiness
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {APPROVAL_OPTIONS.map((a) => (
              <label
                key={a.key}
                className="flex cursor-pointer items-center gap-2 rounded-md border p-2 hover:bg-muted/50"
              >
                <Checkbox
                  checked={!!data.approvals[a.key]}
                  onCheckedChange={() => toggle("approvals", a.key)}
                />
                <span className="text-sm">{a.label}</span>
              </label>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Governance Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="notes" className="sr-only">
            Notes
          </Label>
          <Textarea
            id="notes"
            rows={4}
            value={data.notes}
            onChange={(e) =>
              setData((d) => ({ ...d, notes: e.target.value }))
            }
            placeholder="Context, residual risks, conditions, or approver comments…"
          />
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Full C3G integration (live policy sync, approval routing, audit log
          export) can be enabled in{" "}
          <span className="font-medium text-foreground">
            Enterprise configuration
          </span>
          .
        </CardContent>
      </Card>

      <SampleDataDisclaimer />
    </div>
  );
}
