import { createFileRoute, Link } from "@tanstack/react-router";
import { RequirePlan } from "@/components/RequirePlan";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Loader2, Plus, Trash2, Save, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_app/studio/use-case/$id/data-readiness")({
  component: () => (<RequirePlan min="pro" feature="Data Readiness"><DataReadinessPage /></RequirePlan>),
});

type DimensionKey =
  | "availability"
  | "quality"
  | "accessibility"
  | "privacy_exposure"
  | "bias_risk"
  | "ownership_clarity";

const DIMENSIONS: { key: DimensionKey; label: string; hint: string; inverse?: boolean }[] = [
  { key: "availability", label: "Availability", hint: "Is the data accessible today?" },
  { key: "quality", label: "Quality", hint: "Is it clean, accurate, current?" },
  { key: "accessibility", label: "Accessibility", hint: "Can the team get to it easily?" },
  { key: "privacy_exposure", label: "Privacy Exposure", hint: "Lower is better — invert score", inverse: true },
  { key: "bias_risk", label: "Bias Risk", hint: "Lower is better — invert score", inverse: true },
  { key: "ownership_clarity", label: "Ownership Clarity", hint: "Is the data owner known and accountable?" },
];

type DataSource = {
  id: string;
  name: string;
  owner: string;
  format: string;
  location: string;
  availability: number;
  accessibility: number;
  quality: number;
  completeness: number;
  privacy_sensitivity: number;
  bias_risk: number;
  integration_readiness: number;
  approval_required: boolean;
  notes: string;
};

const emptySource = (): DataSource => ({
  id: crypto.randomUUID(),
  name: "",
  owner: "",
  format: "",
  location: "",
  availability: 3,
  accessibility: 3,
  quality: 3,
  completeness: 3,
  privacy_sensitivity: 3,
  bias_risk: 3,
  integration_readiness: 3,
  approval_required: false,
  notes: "",
});

function readinessLevel(score: number) {
  if (score >= 80) return { label: "High Readiness", tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" };
  if (score >= 60) return { label: "Medium Readiness", tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300" };
  if (score >= 40) return { label: "Low Readiness", tone: "bg-orange-500/15 text-orange-700 dark:text-orange-300" };
  return { label: "Not Ready", tone: "bg-red-500/15 text-red-700 dark:text-red-300" };
}

function ScoreInput({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`h-8 w-8 rounded-md border text-sm font-medium transition ${
              value === n
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:bg-accent"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

function DataReadinessPage() {
  const { id: useCaseId } = Route.useParams();
  const [sources, setSources] = useState<DataSource[]>([emptySource()]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("data_readiness_assessments")
        .select("*")
        .eq("use_case_id", useCaseId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!error && data) {
        const gaps = (data.missing_data_gaps as any) ?? [];
        if (Array.isArray(gaps) && gaps.length > 0 && gaps[0]?.name !== undefined) {
          setSources(gaps as DataSource[]);
        }
      }
      setLoading(false);
    })();
  }, [useCaseId]);

  const dimensionAverages = useMemo(() => {
    if (sources.length === 0) {
      return DIMENSIONS.reduce((acc, d) => ({ ...acc, [d.key]: 0 }), {} as Record<DimensionKey, number>);
    }
    const map = (k: keyof DataSource) =>
      sources.reduce((s, src) => s + (src[k] as number), 0) / sources.length;
    return {
      availability: map("availability"),
      quality: map("quality"),
      accessibility: map("accessibility"),
      privacy_exposure: 6 - map("privacy_sensitivity"),
      bias_risk: 6 - map("bias_risk"),
      ownership_clarity: sources.reduce((s, src) => s + (src.owner.trim() ? 5 : 2), 0) / sources.length,
    } as Record<DimensionKey, number>;
  }, [sources]);

  const overallScore = useMemo(() => {
    const vals = Object.values(dimensionAverages);
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return Math.round((avg / 5) * 100);
  }, [dimensionAverages]);

  const level = readinessLevel(overallScore);

  const recommendations = useMemo(() => {
    const recs: string[] = [];
    if (dimensionAverages.quality < 3.5) recs.push("Improve data quality — clean, validate, and refresh source data.");
    if (sources.some((s) => !s.owner.trim())) recs.push("Assign a data owner to every source.");
    if (sources.some((s) => s.privacy_sensitivity >= 4)) recs.push("Complete a privacy impact review for sensitive data.");
    if (sources.some((s) => s.bias_risk >= 4)) recs.push("Conduct a bias audit on high-risk data sources.");
    if (dimensionAverages.accessibility < 3.5) recs.push("Define integration access patterns and approval workflows.");
    if (sources.some((s) => s.approval_required)) recs.push("Secure required data-use approvals before MVP build.");
    if (recs.length === 0) recs.push("Data foundation looks healthy — proceed to blueprint and MVP scoping.");
    return recs;
  }, [dimensionAverages, sources]);

  const updateSource = (id: string, patch: Partial<DataSource>) =>
    setSources((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const addSource = () => setSources((prev) => [...prev, emptySource()]);
  const removeSource = (id: string) =>
    setSources((prev) => (prev.length > 1 ? prev.filter((s) => s.id !== id) : prev));

  const handleSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in to save.");
      setSaving(false);
      return;
    }
    const { error } = await supabase.from("data_readiness_assessments").insert({
      use_case_id: useCaseId,
      data_availability_score: dimensionAverages.availability,
      data_quality_score: dimensionAverages.quality,
      data_accessibility_score: dimensionAverages.accessibility,
      privacy_exposure_score: dimensionAverages.privacy_exposure,
      bias_risk_score: dimensionAverages.bias_risk,
      ownership_clarity_score: dimensionAverages.ownership_clarity,
      overall_data_readiness_score: overallScore,
      missing_data_gaps: sources as any,
      mitigation_recommendations: recommendations as any,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Data readiness assessment saved.");
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Readiness</h1>
          <p className="text-muted-foreground">
            Assess each data source across availability, quality, privacy, and bias.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/studio/use-case/$id/feasibility" params={{ id: useCaseId }}>
              Back to Feasibility
            </Link>
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Assessment
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {sources.map((src, idx) => (
            <Card key={src.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">Data Source #{idx + 1}</CardTitle>
                </div>
                {sources.length > 1 && (
                  <Button variant="ghost" size="icon" onClick={() => removeSource(src.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Name</Label>
                    <Input value={src.name} onChange={(e) => updateSource(src.id, { name: e.target.value })} placeholder="e.g. Customer transactions" />
                  </div>
                  <div className="space-y-1">
                    <Label>Owner</Label>
                    <Input value={src.owner} onChange={(e) => updateSource(src.id, { owner: e.target.value })} placeholder="e.g. CDO / Data Steward" />
                  </div>
                  <div className="space-y-1">
                    <Label>Format</Label>
                    <Input value={src.format} onChange={(e) => updateSource(src.id, { format: e.target.value })} placeholder="CSV, API, DB, document…" />
                  </div>
                  <div className="space-y-1">
                    <Label>System / Location</Label>
                    <Input value={src.location} onChange={(e) => updateSource(src.id, { location: e.target.value })} placeholder="System or path" />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <ScoreInput label="Availability" value={src.availability} onChange={(v) => updateSource(src.id, { availability: v })} />
                  <ScoreInput label="Accessibility" value={src.accessibility} onChange={(v) => updateSource(src.id, { accessibility: v })} />
                  <ScoreInput label="Quality" value={src.quality} onChange={(v) => updateSource(src.id, { quality: v })} />
                  <ScoreInput label="Completeness" value={src.completeness} onChange={(v) => updateSource(src.id, { completeness: v })} />
                  <ScoreInput label="Privacy Sensitivity" value={src.privacy_sensitivity} onChange={(v) => updateSource(src.id, { privacy_sensitivity: v })} />
                  <ScoreInput label="Bias Risk" value={src.bias_risk} onChange={(v) => updateSource(src.id, { bias_risk: v })} />
                  <ScoreInput label="Integration Readiness" value={src.integration_readiness} onChange={(v) => updateSource(src.id, { integration_readiness: v })} />
                </div>

                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <Label className="text-sm">Approval required</Label>
                    <p className="text-xs text-muted-foreground">Legal, privacy, or data-owner sign-off needed</p>
                  </div>
                  <Switch checked={src.approval_required} onCheckedChange={(v) => updateSource(src.id, { approval_required: v })} />
                </div>

                <div className="space-y-1">
                  <Label>Notes</Label>
                  <Textarea value={src.notes} onChange={(e) => updateSource(src.id, { notes: e.target.value })} placeholder="Constraints, assumptions, dependencies…" />
                </div>
              </CardContent>
            </Card>
          ))}

          <Button variant="outline" onClick={addSource} className="w-full">
            <Plus className="mr-2 h-4 w-4" /> Add Data Source
          </Button>
        </div>

        <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Overall Data Readiness</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-5xl font-bold">{overallScore}</div>
                <Badge className={`mt-2 ${level.tone}`} variant="secondary">{level.label}</Badge>
              </div>
              <div className="space-y-2">
                {DIMENSIONS.map((d) => {
                  const v = dimensionAverages[d.key];
                  return (
                    <div key={d.key} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{d.label}</span>
                        <span className="font-medium">{v.toFixed(1)} / 5</span>
                      </div>
                      <Progress value={(v / 5) * 100} className="h-1.5" />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {recommendations.map((r, i) => (
                  <li key={i} className="flex gap-2">
                    <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
