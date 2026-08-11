import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { RequirePlan } from "@/components/RequirePlan";
import { SampleDataDisclaimer } from "@/components/usecasex/SampleDataDisclaimer";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import * as studioRepo from "@/lib/domain/studio.repository";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Save, FileDown, FileText, Plus, Trash2 } from "lucide-react";
import {
  DELIVERABLE_META,
  DELIVERABLE_ORDER,
  type DeliverableType,
  type DeliverableStatus,
  type RiskRow,
  type CapabilityEntry,
  type ReferenceWorkflowStep,
} from "@/lib/deliverables";
import { loadDeliverable, saveDeliverable, loadDeliverables } from "@/lib/deliverables.data";
import {
  exportDeliverablePDF,
  exportDeliverableWord,
  type ExportDoc,
  type ExportSection,
} from "@/lib/deliverables.export";

const BUILT_IN: DeliverableType[] = [
  "analytical_logic_model",
  "reference_workflows",
  "capability_framework",
  "risk_assumption_register",
  "portfolio_roadmap",
  "integration_notes",
  "handover_package",
];

export const Route = createFileRoute("/_app/studio/use-case/$id/deliverable/$type")({
  beforeLoad: ({ params }) => {
    const type = params.type as DeliverableType;
    const meta = DELIVERABLE_META[type];
    if (!meta)
      throw redirect({ to: "/studio/use-case/$id/deliverables", params: { id: params.id } });
    if (meta.existingRoute) {
      throw redirect({
        to: meta.existingRoute as never,
        params: (meta.existingRoute.includes("$id") ? { id: params.id } : undefined) as never,
      });
    }
  },
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "Deliverable — AI Use Case Studio" },
    ],
  }),
  component: () => (
    <RequirePlan min="pro" feature="Enterprise Deliverables">
      <DeliverableEditor />
    </RequirePlan>
  ),
});

function newRiskRow(): RiskRow {
  return {
    id: crypto.randomUUID(),
    type: "risk",
    description: "",
    likelihood: 3,
    impact: 3,
    score: 9,
    owner: "",
    mitigationAction: "",
    residualRisk: "",
    reviewDate: "",
  };
}
function newCapability(): CapabilityEntry {
  return {
    domain: "",
    capability: "",
    currentLevel: 1,
    requiredLevel: 3,
    gap: "",
    buildBuyPartner: "",
  };
}
function newStep(n: number): ReferenceWorkflowStep {
  return { stepNumber: n, actor: "", action: "", aiIntegration: false, notes: "" };
}

function defaultContent(type: DeliverableType): Record<string, unknown> {
  switch (type) {
    case "analytical_logic_model":
      return {
        predictionTarget: "",
        inputs: "",
        outputFormat: "",
        thresholds: "",
        modelFamily: "",
        trainingApproach: "",
        validationApproach: "",
        feedbackLoop: "",
      };
    case "reference_workflows":
      return { beforeSteps: [newStep(1)], afterSteps: [newStep(1)], notes: "" };
    case "capability_framework":
      return { entries: [newCapability()], notes: "" };
    case "risk_assumption_register":
      return { rows: [newRiskRow()] };
    case "portfolio_roadmap":
      return {
        phases: [{ name: "", useCases: [], startDate: "", endDate: "", valueGate: "" }],
        notes: "",
      };
    case "integration_notes":
      return {
        sourceSystems: "",
        authMethod: "",
        dataFormats: "",
        latencySLA: "",
        errorHandling: "",
        middleware: "",
        notes: "",
      };
    case "handover_package":
      return {
        runbook: "",
        contacts: "",
        decisionLog: "",
        lessonsLearned: "",
        includedDeliverables: [],
      };
    default:
      return {};
  }
}

function DeliverableEditor() {
  const { id, type } = Route.useParams();
  const dType = type as DeliverableType;
  const meta = DELIVERABLE_META[dType];
  const [content, setContent] = useState<Record<string, unknown>>(defaultContent(dType));
  const [status, setStatus] = useState<DeliverableStatus>("draft");
  const [ucTitle, setUcTitle] = useState<string>("");
  const [readyTypes, setReadyTypes] = useState<DeliverableType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [uc, existing, all] = await Promise.all([
        studioRepo.getStudioUseCase<{ title: string }>(id, "title").catch(() => null),
        loadDeliverable(id, dType),
        dType === "handover_package" ? loadDeliverables(id) : Promise.resolve([]),
      ]);
      setUcTitle(uc?.title ?? "");
      if (existing) {
        setContent({ ...defaultContent(dType), ...(existing.content as object) });
        setStatus(existing.status);
      } else {
        setContent(defaultContent(dType));
        setStatus("draft");
      }
      setReadyTypes(all.filter((r) => r.status === "ready").map((r) => r.deliverable_type));
      setLoading(false);
    })();
  }, [id, dType]);

  const set = (key: string, value: unknown) => setContent((c) => ({ ...c, [key]: value }));

  const save = async (nextStatus: DeliverableStatus) => {
    setSaving(true);
    try {
      await saveDeliverable(id, dType, content, nextStatus);
      setStatus(nextStatus);
      toast.success(nextStatus === "ready" ? "Marked ready." : "Saved.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const exportDoc = useMemo<ExportDoc>(
    () => ({
      title: meta.label,
      subtitle: `Use case: ${ucTitle} · AIgilityX AI Use Case Studio`,
      sections: buildSections(dType, content),
    }),
    [dType, content, meta.label, ucTitle],
  );

  const fileBase = `${slug(ucTitle || "use-case")}-${dType}`;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
            Deliverable {meta.order} · {ucTitle}
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">{meta.label}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{meta.description}</p>
          <Badge variant="secondary" className="mt-2">
            {status}
          </Badge>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" asChild>
            <Link to="/studio/use-case/$id/deliverables" params={{ id }}>
              ← All deliverables
            </Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => exportDeliverablePDF(exportDoc, `${fileBase}.pdf`)}
          >
            <FileDown className="mr-2 h-4 w-4" /> PDF
          </Button>
          <Button
            variant="outline"
            onClick={() => exportDeliverableWord(exportDoc, `${fileBase}.docx`)}
          >
            <FileText className="mr-2 h-4 w-4" /> Word
          </Button>
          <Button variant="outline" onClick={() => save("draft")} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}{" "}
            Save
          </Button>
          <Button onClick={() => save("ready")} disabled={saving}>
            Mark ready
          </Button>
        </div>
      </div>

      <EditorBody
        dType={dType}
        content={content}
        set={set}
        setContent={setContent}
        readyTypes={readyTypes}
      />

      <SampleDataDisclaimer />
    </div>
  );
}

/* ----------------------------- form bodies ----------------------------- */

function TextBlock({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <Textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function EditorBody({
  dType,
  content,
  set,
  setContent,
  readyTypes,
}: {
  dType: DeliverableType;
  content: Record<string, unknown>;
  set: (k: string, v: unknown) => void;
  setContent: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
  readyTypes: DeliverableType[];
}) {
  const str = (k: string) => (content[k] as string) ?? "";

  if (dType === "analytical_logic_model") {
    const fields: [string, string, string][] = [
      [
        "predictionTarget",
        "Prediction target",
        "What single decision or value is being predicted?",
      ],
      ["inputs", "Inputs / features", "Key input variables and features the model consumes."],
      ["outputFormat", "Output format", "Score, class, ranked list, probability, recommendation…"],
      ["thresholds", "Decision thresholds", "Action thresholds, confidence cut-offs, guardrails."],
      ["modelFamily", "Model family", "e.g. gradient boosting, transformer, rules + ML hybrid."],
      ["trainingApproach", "Training approach", "Data used, labelling, retraining cadence."],
      ["validationApproach", "Validation approach", "Metrics, backtesting, holdout, human review."],
      ["feedbackLoop", "Feedback loop", "How outcomes feed back to improve the model."],
    ];
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Analytical Logic Model</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {fields.map(([k, l, p]) => (
            <TextBlock
              key={k}
              label={l}
              value={str(k)}
              placeholder={p}
              onChange={(v) => set(k, v)}
            />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (dType === "integration_notes") {
    const fields: [string, string, string][] = [
      ["sourceSystems", "Source & target systems", "ERP, CRM, data warehouse, APIs to connect."],
      ["authMethod", "Authentication", "OAuth2, API keys, mTLS, service accounts."],
      ["dataFormats", "Data formats & contracts", "JSON, CSV, events, schema versioning."],
      ["latencySLA", "Latency & SLA", "Batch vs real-time, throughput, availability targets."],
      ["errorHandling", "Error handling & retries", "Idempotency, dead-letter queues, alerting."],
      ["middleware", "Middleware / integration pattern", "iPaaS, message bus, direct API, ETL."],
    ];
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Integration Consideration Notes</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {fields.map(([k, l, p]) => (
            <TextBlock
              key={k}
              label={l}
              value={str(k)}
              placeholder={p}
              onChange={(v) => set(k, v)}
            />
          ))}
          <div className="md:col-span-2">
            <TextBlock
              label="Additional notes"
              value={str("notes")}
              onChange={(v) => set("notes", v)}
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (dType === "capability_framework") {
    const entries = (content.entries as CapabilityEntry[]) ?? [];
    const update = (i: number, patch: Partial<CapabilityEntry>) =>
      setContent((c) => {
        const arr = [...((c.entries as CapabilityEntry[]) ?? [])];
        arr[i] = { ...arr[i], ...patch };
        return { ...c, entries: arr };
      });
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Capability Requirement Framework</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setContent((c) => ({
                ...c,
                entries: [...((c.entries as CapabilityEntry[]) ?? []), newCapability()],
              }))
            }
          >
            <Plus className="mr-1 h-3 w-3" /> Row
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {entries.map((e, i) => (
            <div key={i} className="grid gap-2 rounded-lg border p-3 md:grid-cols-6">
              <Input
                className="md:col-span-1"
                placeholder="Domain (Data…)"
                value={e.domain}
                onChange={(ev) => update(i, { domain: ev.target.value })}
              />
              <Input
                className="md:col-span-2"
                placeholder="Capability"
                value={e.capability}
                onChange={(ev) => update(i, { capability: ev.target.value })}
              />
              <Input
                type="number"
                min={1}
                max={5}
                placeholder="Now"
                value={e.currentLevel}
                onChange={(ev) => update(i, { currentLevel: Number(ev.target.value) })}
              />
              <Input
                type="number"
                min={1}
                max={5}
                placeholder="Req"
                value={e.requiredLevel}
                onChange={(ev) => update(i, { requiredLevel: Number(ev.target.value) })}
              />
              <select
                className="rounded-md border bg-background px-2 text-sm"
                value={e.buildBuyPartner}
                onChange={(ev) =>
                  update(i, {
                    buildBuyPartner: ev.target.value as CapabilityEntry["buildBuyPartner"],
                  })
                }
              >
                <option value="">—</option>
                <option value="build">Build</option>
                <option value="buy">Buy</option>
                <option value="partner">Partner</option>
              </select>
              <Input
                className="md:col-span-5"
                placeholder="Gap / action"
                value={e.gap}
                onChange={(ev) => update(i, { gap: ev.target.value })}
              />
              <Button
                size="icon"
                aria-label="Remove capability gap"
                variant="ghost"
                onClick={() =>
                  setContent((c) => ({
                    ...c,
                    entries: (c.entries as CapabilityEntry[]).filter((_, j) => j !== i),
                  }))
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <TextBlock label="Notes" value={str("notes")} onChange={(v) => set("notes", v)} />
        </CardContent>
      </Card>
    );
  }

  if (dType === "risk_assumption_register") {
    const rows = (content.rows as RiskRow[]) ?? [];
    const update = (i: number, patch: Partial<RiskRow>) =>
      setContent((c) => {
        const arr = [...((c.rows as RiskRow[]) ?? [])];
        const merged = { ...arr[i], ...patch };
        merged.score = merged.likelihood * merged.impact;
        arr[i] = merged;
        return { ...c, rows: arr };
      });
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Risk & Assumption Register</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setContent((c) => ({ ...c, rows: [...((c.rows as RiskRow[]) ?? []), newRiskRow()] }))
            }
          >
            <Plus className="mr-1 h-3 w-3" /> Entry
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {rows.map((r, i) => (
            <div key={r.id} className="grid gap-2 rounded-lg border p-3 md:grid-cols-6">
              <select
                className="rounded-md border bg-background px-2 text-sm"
                value={r.type}
                onChange={(ev) => update(i, { type: ev.target.value as RiskRow["type"] })}
              >
                <option value="risk">Risk</option>
                <option value="assumption">Assumption</option>
              </select>
              <Input
                className="md:col-span-4"
                placeholder="Description"
                value={r.description}
                onChange={(ev) => update(i, { description: ev.target.value })}
              />
              <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                Score {r.score}
              </div>
              <div className="flex items-center gap-1">
                <Label className="text-xs">L</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={r.likelihood}
                  onChange={(ev) => update(i, { likelihood: Number(ev.target.value) })}
                />
              </div>
              <div className="flex items-center gap-1">
                <Label className="text-xs">I</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={r.impact}
                  onChange={(ev) => update(i, { impact: Number(ev.target.value) })}
                />
              </div>
              <Input
                placeholder="Owner"
                value={r.owner}
                onChange={(ev) => update(i, { owner: ev.target.value })}
              />
              <Input
                type="date"
                value={r.reviewDate}
                onChange={(ev) => update(i, { reviewDate: ev.target.value })}
              />
              <Input
                className="md:col-span-5"
                placeholder="Mitigation action"
                value={r.mitigationAction}
                onChange={(ev) => update(i, { mitigationAction: ev.target.value })}
              />
              <Button
                size="icon"
                aria-label="Remove risk"
                variant="ghost"
                onClick={() =>
                  setContent((c) => ({
                    ...c,
                    rows: (c.rows as RiskRow[]).filter((_, j) => j !== i),
                  }))
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Input
                className="md:col-span-6"
                placeholder="Residual risk"
                value={r.residualRisk}
                onChange={(ev) => update(i, { residualRisk: ev.target.value })}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (dType === "reference_workflows") {
    const renderSteps = (key: "beforeSteps" | "afterSteps", label: string) => {
      const steps = (content[key] as ReferenceWorkflowStep[]) ?? [];
      const update = (i: number, patch: Partial<ReferenceWorkflowStep>) =>
        setContent((c) => {
          const arr = [...((c[key] as ReferenceWorkflowStep[]) ?? [])];
          arr[i] = { ...arr[i], ...patch };
          return { ...c, [key]: arr };
        });
      return (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">{label}</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setContent((c) => {
                  const arr = (c[key] as ReferenceWorkflowStep[]) ?? [];
                  return { ...c, [key]: [...arr, newStep(arr.length + 1)] };
                })
              }
            >
              <Plus className="mr-1 h-3 w-3" /> Step
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {steps.map((s, i) => (
              <div
                key={i}
                className="grid items-center gap-2 rounded-lg border p-2 md:grid-cols-12"
              >
                <span className="text-center text-sm font-semibold text-muted-foreground md:col-span-1">
                  {i + 1}
                </span>
                <Input
                  className="md:col-span-3"
                  placeholder="Actor / role"
                  value={s.actor}
                  onChange={(ev) => update(i, { actor: ev.target.value })}
                />
                <Input
                  className="md:col-span-5"
                  placeholder="Action / step"
                  value={s.action}
                  onChange={(ev) => update(i, { action: ev.target.value })}
                />
                <label className="flex items-center gap-1 text-xs md:col-span-2">
                  <Checkbox
                    checked={s.aiIntegration}
                    onCheckedChange={(v) => update(i, { aiIntegration: !!v })}
                  />{" "}
                  AI step
                </label>
                <Button
                  size="icon"
                  aria-label="Remove workflow step"
                  variant="ghost"
                  className="md:col-span-1"
                  onClick={() =>
                    setContent((c) => ({
                      ...c,
                      [key]: (c[key] as ReferenceWorkflowStep[]).filter((_, j) => j !== i),
                    }))
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      );
    };
    return (
      <div className="space-y-4">
        {renderSteps("beforeSteps", "Current workflow (before AI)")}
        {renderSteps("afterSteps", "Future workflow (with AI)")}
        <Card>
          <CardContent className="pt-6">
            <TextBlock
              label="Process notes"
              value={str("notes")}
              onChange={(v) => set("notes", v)}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (dType === "portfolio_roadmap") {
    const phases =
      (content.phases as {
        name: string;
        useCases: string[];
        startDate: string;
        endDate: string;
        valueGate: string;
      }[]) ?? [];
    const update = (i: number, patch: Partial<(typeof phases)[number]>) =>
      setContent((c) => {
        const arr = [...((c.phases as typeof phases) ?? [])];
        arr[i] = { ...arr[i], ...patch };
        return { ...c, phases: arr };
      });
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Portfolio Roadmap</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setContent((c) => ({
                ...c,
                phases: [
                  ...((c.phases as typeof phases) ?? []),
                  { name: "", useCases: [], startDate: "", endDate: "", valueGate: "" },
                ],
              }))
            }
          >
            <Plus className="mr-1 h-3 w-3" /> Phase
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {phases.map((p, i) => (
            <div key={i} className="grid gap-2 rounded-lg border p-3 md:grid-cols-6">
              <Input
                className="md:col-span-2"
                placeholder="Phase name"
                value={p.name}
                onChange={(ev) => update(i, { name: ev.target.value })}
              />
              <Input
                type="date"
                value={p.startDate}
                onChange={(ev) => update(i, { startDate: ev.target.value })}
              />
              <Input
                type="date"
                value={p.endDate}
                onChange={(ev) => update(i, { endDate: ev.target.value })}
              />
              <Input
                className="md:col-span-2"
                placeholder="Value gate / milestone"
                value={p.valueGate}
                onChange={(ev) => update(i, { valueGate: ev.target.value })}
              />
              <Input
                className="md:col-span-5"
                placeholder="Use cases (comma separated)"
                value={p.useCases.join(", ")}
                onChange={(ev) =>
                  update(i, {
                    useCases: ev.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
              <Button
                size="icon"
                aria-label="Remove phase"
                variant="ghost"
                onClick={() =>
                  setContent((c) => ({
                    ...c,
                    phases: (c.phases as typeof phases).filter((_, j) => j !== i),
                  }))
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <TextBlock
            label="Dependencies & sequencing notes"
            value={str("notes")}
            onChange={(v) => set("notes", v)}
          />
        </CardContent>
      </Card>
    );
  }

  if (dType === "handover_package") {
    const included = (content.includedDeliverables as DeliverableType[]) ?? [];
    const toggle = (t: DeliverableType) =>
      setContent((c) => {
        const cur = (c.includedDeliverables as DeliverableType[]) ?? [];
        return {
          ...c,
          includedDeliverables: cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t],
        };
      });
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Included Deliverables</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 md:grid-cols-2">
            {DELIVERABLE_ORDER.filter((t) => t !== "handover_package").map((t) => (
              <label key={t} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                <Checkbox checked={included.includes(t)} onCheckedChange={() => toggle(t)} />
                <span className="flex-1">
                  {DELIVERABLE_META[t].order}. {DELIVERABLE_META[t].label}
                </span>
                {readyTypes.includes(t) && (
                  <Badge
                    variant="secondary"
                    className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                  >
                    ready
                  </Badge>
                )}
              </label>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="grid gap-4 pt-6 md:grid-cols-2">
            <TextBlock
              label="Operating runbook"
              value={str("runbook")}
              onChange={(v) => set("runbook", v)}
              placeholder="How to operate, monitor, and maintain the solution."
            />
            <TextBlock
              label="Key contacts"
              value={str("contacts")}
              onChange={(v) => set("contacts", v)}
              placeholder="Owners, vendors, escalation paths."
            />
            <TextBlock
              label="Decision log"
              value={str("decisionLog")}
              onChange={(v) => set("decisionLog", v)}
              placeholder="Key decisions and rationale."
            />
            <TextBlock
              label="Lessons learned"
              value={str("lessonsLearned")}
              onChange={(v) => set("lessonsLearned", v)}
              placeholder="What worked, what to improve."
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return <p className="text-sm text-muted-foreground">Unknown deliverable.</p>;
}

/* ----------------------------- export builder ----------------------------- */

function buildSections(dType: DeliverableType, content: Record<string, unknown>): ExportSection[] {
  const txt = (k: string) => (content[k] as string) ?? "";
  switch (dType) {
    case "analytical_logic_model":
      return [
        ["Prediction target", "predictionTarget"],
        ["Inputs / features", "inputs"],
        ["Output format", "outputFormat"],
        ["Decision thresholds", "thresholds"],
        ["Model family", "modelFamily"],
        ["Training approach", "trainingApproach"],
        ["Validation approach", "validationApproach"],
        ["Feedback loop", "feedbackLoop"],
      ].map(([h, k]) => ({ heading: h, kind: "text", body: txt(k) }));
    case "integration_notes":
      return [
        ["Source & target systems", "sourceSystems"],
        ["Authentication", "authMethod"],
        ["Data formats & contracts", "dataFormats"],
        ["Latency & SLA", "latencySLA"],
        ["Error handling & retries", "errorHandling"],
        ["Middleware / pattern", "middleware"],
        ["Additional notes", "notes"],
      ].map(([h, k]) => ({ heading: h, kind: "text", body: txt(k) }));
    case "capability_framework": {
      const entries = (content.entries as CapabilityEntry[]) ?? [];
      return [
        {
          heading: "Capability inventory",
          kind: "table",
          columns: ["Domain", "Capability", "Now", "Required", "Build/Buy/Partner", "Gap / action"],
          rows: entries.map((e) => [
            e.domain,
            e.capability,
            String(e.currentLevel),
            String(e.requiredLevel),
            e.buildBuyPartner,
            e.gap,
          ]),
        },
        { heading: "Notes", kind: "text", body: txt("notes") },
      ];
    }
    case "risk_assumption_register": {
      const rows = (content.rows as RiskRow[]) ?? [];
      return [
        {
          heading: "Register",
          kind: "table",
          columns: [
            "Type",
            "Description",
            "L",
            "I",
            "Score",
            "Owner",
            "Mitigation",
            "Residual",
            "Review",
          ],
          rows: rows.map((r) => [
            r.type,
            r.description,
            String(r.likelihood),
            String(r.impact),
            String(r.score),
            r.owner,
            r.mitigationAction,
            r.residualRisk,
            r.reviewDate,
          ]),
        },
      ];
    }
    case "reference_workflows": {
      const mk = (key: "beforeSteps" | "afterSteps") =>
        ((content[key] as ReferenceWorkflowStep[]) ?? []).map((s, i) => [
          String(i + 1),
          s.actor,
          s.action,
          s.aiIntegration ? "AI" : "",
        ]);
      return [
        {
          heading: "Current workflow (before AI)",
          kind: "table",
          columns: ["#", "Actor", "Action", "AI"],
          rows: mk("beforeSteps"),
        },
        {
          heading: "Future workflow (with AI)",
          kind: "table",
          columns: ["#", "Actor", "Action", "AI"],
          rows: mk("afterSteps"),
        },
        { heading: "Process notes", kind: "text", body: txt("notes") },
      ];
    }
    case "portfolio_roadmap": {
      const phases =
        (content.phases as {
          name: string;
          useCases: string[];
          startDate: string;
          endDate: string;
          valueGate: string;
        }[]) ?? [];
      return [
        {
          heading: "Roadmap phases",
          kind: "table",
          columns: ["Phase", "Start", "End", "Value gate", "Use cases"],
          rows: phases.map((p) => [
            p.name,
            p.startDate,
            p.endDate,
            p.valueGate,
            p.useCases.join(", "),
          ]),
        },
        { heading: "Dependencies & sequencing", kind: "text", body: txt("notes") },
      ];
    }
    case "handover_package": {
      const included = (content.includedDeliverables as DeliverableType[]) ?? [];
      return [
        {
          heading: "Included deliverables",
          kind: "text",
          body:
            included
              .map((t) => `• ${DELIVERABLE_META[t].order}. ${DELIVERABLE_META[t].label}`)
              .join("\n") || "—",
        },
        { heading: "Operating runbook", kind: "text", body: txt("runbook") },
        { heading: "Key contacts", kind: "text", body: txt("contacts") },
        { heading: "Decision log", kind: "text", body: txt("decisionLog") },
        { heading: "Lessons learned", kind: "text", body: txt("lessonsLearned") },
      ];
    }
    default:
      return [];
  }
}

function slug(s: string) {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40) || "use-case"
  );
}
