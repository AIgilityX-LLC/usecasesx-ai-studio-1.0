import { createFileRoute, Link } from "@tanstack/react-router";
import { SampleDataDisclaimer } from "@/components/usecasex/SampleDataDisclaimer";
import { RequirePlan } from "@/components/RequirePlan";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from "docx";
import { saveAs } from "file-saver";
import * as studioRepo from "@/lib/domain/studio.repository";
import { toUserMessage } from "@/lib/domain/errors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, FileDown, FileText, Send, ShieldCheck, Bot, Save } from "lucide-react";

export const Route = createFileRoute("/_app/studio/use-case/$id/blueprint")({
  component: () => (
    <RequirePlan min="pro" feature="Blueprint Builder">
      <BlueprintPage />
    </RequirePlan>
  ),
});

const SECTIONS = [
  { key: "executive_summary", label: "1. Executive Summary" },
  { key: "problem_statement", label: "2. Problem Statement" },
  { key: "strategic_alignment", label: "3. Strategic Alignment" },
  { key: "target_users", label: "4. Target Users and Beneficiaries" },
  { key: "current_state", label: "5. Current State" },
  { key: "future_state", label: "6. Future State" },
  { key: "ai_approach", label: "7. AI Approach" },
  { key: "data_sources", label: "8. Required Data Sources" },
  { key: "data_readiness_summary", label: "9. Data Readiness Summary" },
  { key: "feasibility_summary", label: "10. 5-Pillar Feasibility Summary" },
  { key: "expected_benefits", label: "11. Expected Benefits" },
  { key: "kpis", label: "12. KPIs and Success Metrics" },
  { key: "risks_governance", label: "13. Risks and Governance Controls" },
  { key: "oversight_plan", label: "14. Human Oversight Plan" },
  { key: "mvp_prediction", label: "15. Minimum Viable Prediction™" },
  { key: "pilot_scope", label: "16. Pilot Scope" },
  { key: "roadmap", label: "17. Implementation Roadmap" },
  { key: "budget", label: "18. Budget Assumptions" },
  { key: "recommendation", label: "19. Recommendation" },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];
type Blueprint = Record<SectionKey, string>;

const emptyBlueprint = (): Blueprint =>
  SECTIONS.reduce((acc, s) => ({ ...acc, [s.key]: "" }), {} as Blueprint);

// Map our 19 sections onto the blueprints table columns by packing related sections together.
const COLUMN_MAP: Record<string, SectionKey[]> = {
  executive_summary: ["executive_summary"],
  business_case: [
    "problem_statement",
    "strategic_alignment",
    "target_users",
    "current_state",
    "future_state",
  ],
  technical_scope: ["ai_approach", "pilot_scope"],
  data_requirements: ["data_sources", "data_readiness_summary"],
  model_approach: ["mvp_prediction", "feasibility_summary"],
  risk_summary: ["risks_governance"],
  governance_controls: ["oversight_plan"],
  implementation_roadmap: ["roadmap"],
  budget_assumptions: ["budget"],
  success_metrics: ["kpis", "expected_benefits", "recommendation"],
};

function packForDb(b: Blueprint) {
  const out: Record<string, string> = {};
  for (const [col, keys] of Object.entries(COLUMN_MAP)) {
    out[col] = keys
      .map((k) => `## ${SECTIONS.find((s) => s.key === k)!.label}\n\n${b[k] ?? ""}`)
      .join("\n\n");
  }
  return out;
}

function unpackFromDb(row: any): Blueprint {
  const b = emptyBlueprint();
  for (const [col, keys] of Object.entries(COLUMN_MAP)) {
    const raw: string = row?.[col] ?? "";
    if (!raw) continue;
    // Split on "## " headings
    const parts = raw.split(/\n## /).map((p, i) => (i === 0 ? p.replace(/^## /, "") : p));
    parts.forEach((part) => {
      const [heading, ...rest] = part.split("\n");
      const key = keys.find((k) => heading?.includes(SECTIONS.find((s) => s.key === k)!.label));
      if (key) b[key] = rest.join("\n").trim();
    });
  }
  return b;
}

function BlueprintPage() {
  const { id: useCaseId } = Route.useParams();
  const [blueprint, setBlueprint] = useState<Blueprint>(emptyBlueprint());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(true);
  const [hasSaved, setHasSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const data = await studioRepo.getBlueprint(useCaseId, "*", true).catch(() => null);
      if (data) {
        setBlueprint(unpackFromDb(data));
        setHasSaved(true);
        setEditing(false);
      }
      setLoading(false);
    })();
  }, [useCaseId]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const [uc, feas, dr] = await Promise.all([
        studioRepo.getStudioUseCase(useCaseId),
        studioRepo.getLatestFeasibility(useCaseId, "*", "created_at"),
        studioRepo.getLatestDataReadiness(useCaseId),
      ]);

      const arr = (v: any): any[] => (Array.isArray(v) ? v : []);
      const bullets = (items: any[], fallback = "—") =>
        items.length
          ? items.map((i) => `• ${typeof i === "string" ? i : JSON.stringify(i)}`).join("\n")
          : fallback;

      const feasText = feas
        ? `Total Score: ${feas.total_score ?? "—"} / 100 — Recommendation: ${feas.recommendation ?? "—"}\n` +
          `• Desirability: ${feas.desirability_score ?? "—"}\n` +
          `• Viability: ${feas.viability_score ?? "—"}\n` +
          `• Feasibility: ${feas.feasibility_score ?? "—"}\n` +
          `• Governability: ${feas.governability_score ?? "—"}\n` +
          `• Sustainability: ${feas.sustainability_score ?? "—"}`
        : "Run the Feasibility module to populate this section.";

      const drText = dr
        ? `Overall Data Readiness: ${dr.overall_data_readiness_score ?? "—"} / 100\n` +
          `• Availability: ${dr.data_availability_score ?? "—"}\n` +
          `• Quality: ${dr.data_quality_score ?? "—"}\n` +
          `• Accessibility: ${dr.data_accessibility_score ?? "—"}\n` +
          `• Privacy Exposure: ${dr.privacy_exposure_score ?? "—"}\n` +
          `• Bias Risk: ${dr.bias_risk_score ?? "—"}\n` +
          `• Ownership Clarity: ${dr.ownership_clarity_score ?? "—"}\n\n` +
          `Recommendations:\n${bullets(arr(dr.mitigation_recommendations))}`
        : "Complete the Data Readiness module to populate this section.";

      const sources =
        arr(dr?.missing_data_gaps)
          .map(
            (s: any) =>
              `• ${s.name || "Unnamed"} — owner: ${s.owner || "TBD"} (${s.format || "format TBD"})`,
          )
          .join("\n") || bullets(arr(uc?.data_sources));

      const score = Number(feas?.total_score ?? 0);
      const recommendation =
        score >= 80
          ? "Pursue — proceed to pilot with full governance."
          : score >= 60
            ? "Refine — strengthen weakest pillar before pilot."
            : score >= 40
              ? "Hold — re-scope or re-assess data and value."
              : feas
                ? "Reject — fundamentals not in place."
                : "Complete feasibility and data readiness assessments to receive a recommendation.";

      setBlueprint({
        executive_summary: `${uc?.title ?? "AI Use Case"} — ${uc?.problem_statement ?? ""}\n\nProposed AI approach: ${uc?.ai_type ?? "TBD"}. Feasibility ${feas?.total_score ?? "—"}/100, Data Readiness ${dr?.overall_data_readiness_score ?? "—"}/100.`,
        problem_statement: uc?.problem_statement ?? "",
        strategic_alignment:
          "Aligns with organizational AI strategy and priority outcomes. Replace with specific strategy references.",
        target_users: uc?.beneficiaries ?? bullets(arr(uc?.stakeholders)),
        current_state: uc?.current_state ?? "",
        future_state: uc?.future_state ?? "",
        ai_approach: uc?.ai_type
          ? `AI Type: ${uc.ai_type}. Approach combines data preparation, model selection, validation, and continuous monitoring.`
          : "Define model family, training approach, evaluation, and deployment pattern.",
        data_sources: sources,
        data_readiness_summary: drText,
        feasibility_summary: feasText,
        expected_benefits: bullets(arr(uc?.expected_benefits)),
        kpis: bullets(arr(uc?.kpis)),
        risks_governance: `Risks:\n${bullets(arr(uc?.risks))}\n\nControls:\n${bullets(arr(uc?.controls))}`,
        oversight_plan:
          "Human-in-the-loop review for high-impact predictions; clear escalation, override, and audit logging.",
        mvp_prediction:
          uc?.minimum_viable_prediction ??
          "Define the single most valuable prediction to validate first.",
        pilot_scope:
          uc?.mvp_scope ?? "Define scope, users, duration, success criteria, and exit conditions.",
        roadmap:
          "Phase 1: Discovery (4 wks)\nPhase 2: Data & Prototype (6 wks)\nPhase 3: Pilot (8 wks)\nPhase 4: Scale & Govern (ongoing).",
        budget:
          "Estimate covering data engineering, modeling, MLOps, governance, change management, and contingency.",
        recommendation,
      });
      setEditing(true);
      toast.success("Blueprint generated from your canvas, feasibility, and data readiness.");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to generate blueprint.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const packed = packForDb(blueprint);
    try {
      await studioRepo.saveBlueprint(useCaseId, packed as Record<string, unknown>);
    } catch (e) {
      setSaving(false);
      toast.error(toUserMessage(e, "We could not save the blueprint."));
      return;
    }
    setSaving(false);
    setHasSaved(true);
    toast.success("Blueprint saved.");
  };

  const exportPDF = () => {
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 48;
    const width = pdf.internal.pageSize.getWidth() - margin * 2;
    let y = margin;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.text("AI Use Case Blueprint", margin, y);
    y += 28;
    SECTIONS.forEach(({ key, label }) => {
      const body = blueprint[key]?.trim() || "—";
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      if (y > pdf.internal.pageSize.getHeight() - margin - 40) {
        pdf.addPage();
        y = margin;
      }
      pdf.text(label, margin, y);
      y += 16;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      const lines = pdf.splitTextToSize(body, width);
      lines.forEach((line: string) => {
        if (y > pdf.internal.pageSize.getHeight() - margin) {
          pdf.addPage();
          y = margin;
        }
        pdf.text(line, margin, y);
        y += 13;
      });
      y += 10;
    });
    pdf.save("ai-use-case-blueprint.pdf");
  };

  const exportWord = async () => {
    const children = [
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("AI Use Case Blueprint")],
      }),
      ...SECTIONS.flatMap(({ key, label }) => [
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(label)] }),
        ...(blueprint[key] || "—")
          .split("\n")
          .map((line) => new Paragraph({ children: [new TextRun(line)] })),
      ]),
    ];
    const doc = new Document({ sections: [{ children }] });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, "ai-use-case-blueprint.docx");
  };

  const sendIntegration = async (type: "SARPI" | "AdvisorX" | "C3G") => {
    if (!hasSaved) {
      toast.error("Save the blueprint before sending.");
      return;
    }
    try {
      await studioRepo.sendToIntegration(useCaseId, type, {
        source: "blueprint",
        sent_at: new Date().toISOString(),
      });
    } catch (e) {
      toast.error(toUserMessage(e, `We could not send this to ${type}.`));
      return;
    }
    toast.success(`Sent to ${type}.`);
  };

  const wordCount = useMemo(
    () =>
      Object.values(blueprint).reduce(
        (n, t) => n + (t?.trim() ? t.trim().split(/\s+/).length : 0),
        0,
      ),
    [blueprint],
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Use Case Blueprint</h1>
          <p className="text-muted-foreground">
            A structured, fundable, governable specification — generated from your canvas,
            feasibility, and data readiness.
          </p>
          <div className="mt-2 flex gap-2 text-xs">
            <Badge variant="secondary">{SECTIONS.length} sections</Badge>
            <Badge variant="secondary">{wordCount} words</Badge>
            {hasSaved && (
              <Badge
                className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                variant="secondary"
              >
                Saved
              </Badge>
            )}
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" asChild>
            <Link to="/studio/use-case/$id/deliverables" params={{ id: useCaseId }}>
              All Deliverables
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/studio/use-case/$id/data-readiness" params={{ id: useCaseId }}>
              ← Data Readiness
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-wrap gap-2 pt-6">
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Generate Blueprint
          </Button>
          <Button variant="outline" onClick={() => setEditing((v) => !v)}>
            {editing ? "Preview Blueprint" : "Edit Blueprint"}
          </Button>
          <Button variant="outline" onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save
          </Button>
          <Button variant="outline" onClick={exportPDF}>
            <FileDown className="mr-2 h-4 w-4" /> Export PDF
          </Button>
          <Button variant="outline" onClick={exportWord}>
            <FileText className="mr-2 h-4 w-4" /> Export Word
          </Button>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => sendIntegration("SARPI")}>
              <Send className="mr-2 h-4 w-4" /> Send to SARPI
            </Button>
            <Button variant="secondary" onClick={() => sendIntegration("C3G")}>
              <ShieldCheck className="mr-2 h-4 w-4" /> Send to C3G
            </Button>
            <Button variant="secondary" onClick={() => sendIntegration("AdvisorX")}>
              <Bot className="mr-2 h-4 w-4" /> Ask AdvisorX to Review
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {SECTIONS.map(({ key, label }) => (
          <Card key={key}>
            <CardHeader>
              <CardTitle className="text-base">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <Textarea
                  value={blueprint[key]}
                  onChange={(e) => setBlueprint((prev) => ({ ...prev, [key]: e.target.value }))}
                  placeholder="Click 'Generate Blueprint' to auto-populate, or write directly."
                  className="min-h-[120px] font-mono text-sm"
                />
              ) : (
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/90">
                  {blueprint[key]?.trim() || "—"}
                </pre>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <SampleDataDisclaimer />
    </div>
  );
}
