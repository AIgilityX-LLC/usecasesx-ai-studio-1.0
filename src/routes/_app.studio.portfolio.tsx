import { createFileRoute, Link } from "@tanstack/react-router";
import { SampleDataDisclaimer } from "@/components/usecasex/SampleDataDisclaimer";
import { RequirePlan } from "@/components/RequirePlan";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePlan } from "@/hooks/usePlan";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import { PageHero } from "@/components/usecasex/PageHero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  FileDown, FileText, BarChart3, Loader2,
} from "lucide-react";
import jsPDF from "jspdf";

export const Route = createFileRoute("/_app/studio/portfolio")({
  component: () => (<RequirePlan min="pro" feature="Portfolio Roadmap"><PortfolioRoadmapPage /></RequirePlan>),
});

type UseCase = {
  id: string;
  title: string;
  status: string;
  ai_type: string | null;
  risk_level: string | null;
  priority_score: number | null;
  created_by: string;
  board_id: string;
  problem_statement: string | null;
  mvp_scope: string | null;
  created_at: string;
  source_use_case_id: string | null;
};

type ExecMeta = {
  value_potential: string | null;
  cost_range: string | null;
  time_to_value: string | null;
  security_classification: string | null;
  risk_level: string | null;
};

type Score = {
  use_case_id: string;
  feasibility_score: number | null;
  viability_score: number | null;
  desirability_score: number | null;
  total_score: number | null;
  recommendation: string | null;
};

type IntegrationLinkRow = {
  use_case_id: string;
  integration_type: string;
  status: string | null;
};

const HORIZONS = [
  { key: "30", label: "30-day validation", days: 30 },
  { key: "90", label: "90-day pilot", days: 90 },
  { key: "365", label: "12-month roadmap", days: 365 },
  { key: "1095", label: "3-year roadmap", days: 1095 },
] as const;

function PortfolioRoadmapPage() {
  const { features, tier, loading: planLoading } = usePlan();
  const [useCases, setUseCases] = useState<UseCase[]>([]);
  const [scores, setScores] = useState<Record<string, Score>>({});
  const [links, setLinks] = useState<IntegrationLinkRow[]>([]);
  const [execMeta, setExecMeta] = useState<Record<string, ExecMeta>>({});
  const [loading, setLoading] = useState(true);

  const [fDept, setFDept] = useState("all");
  const [fAi, setFAi] = useState("all");
  const [fStatus, setFStatus] = useState("all");
  const [fRisk, setFRisk] = useState("all");
  const [fPriority, setFPriority] = useState("all");
  const [fOwner, setFOwner] = useState("all");
  const [fIntegration, setFIntegration] = useState("all");

  useEffect(() => {
    if (planLoading || !features.portfolioRoadmap) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      const { data: ucs } = await supabase.from("ai_use_cases").select("*");
      const ids = (ucs ?? []).map((u: any) => u.id);
      const [{ data: sc }, { data: lk }] = await Promise.all([
        ids.length
          ? supabase.from("feasibility_scores").select("*").in("use_case_id", ids)
          : Promise.resolve({ data: [] as any[] }),
        ids.length
          ? supabase.from("integration_links").select("use_case_id, integration_type, status").in("use_case_id", ids)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      setUseCases((ucs ?? []) as UseCase[]);
      const scMap: Record<string, Score> = {};
      (sc ?? []).forEach((s: any) => { scMap[s.use_case_id] = s; });
      setScores(scMap);
      setLinks((lk ?? []) as IntegrationLinkRow[]);
      const srcIds = Array.from(
        new Set((ucs ?? []).map((u: any) => u.source_use_case_id).filter(Boolean)),
      ) as string[];
      if (srcIds.length) {
        const { data: srcRows } = await supabase
          .from("use_cases")
          .select("id, value_potential, cost_range, time_to_value, security_classification, risk_level")
          .in("id", srcIds);
        const em: Record<string, ExecMeta> = {};
        (srcRows ?? []).forEach((r: any) => { em[r.id] = r as ExecMeta; });
        setExecMeta(em);
      }
      setLoading(false);
    })();
  }, [planLoading, features.portfolioRoadmap]);

  const linkMap = useMemo(() => {
    const m: Record<string, Set<string>> = {};
    links.forEach((l) => {
      (m[l.use_case_id] = m[l.use_case_id] ?? new Set()).add(l.integration_type);
    });
    return m;
  }, [links]);

  const owners = useMemo(
    () => Array.from(new Set(useCases.map((u) => u.created_by).filter(Boolean))),
    [useCases],
  );
  const aiTypes = useMemo(
    () => Array.from(new Set(useCases.map((u) => u.ai_type).filter(Boolean))) as string[],
    [useCases],
  );
  const statuses = useMemo(
    () => Array.from(new Set(useCases.map((u) => u.status).filter(Boolean))),
    [useCases],
  );

  const filtered = useMemo(() => {
    return useCases.filter((u) => {
      if (fAi !== "all" && u.ai_type !== fAi) return false;
      if (fStatus !== "all" && u.status !== fStatus) return false;
      if (fRisk !== "all" && (u.risk_level ?? "") !== fRisk) return false;
      if (fOwner !== "all" && u.created_by !== fOwner) return false;
      const ps = u.priority_score ?? 0;
      if (fPriority === "high" && ps < 70) return false;
      if (fPriority === "medium" && (ps < 40 || ps >= 70)) return false;
      if (fPriority === "low" && ps >= 40) return false;
      if (fIntegration !== "all") {
        const has = linkMap[u.id];
        if (!has || !has.has(fIntegration)) return false;
      }
      if (fDept !== "all") {
        // department maps to board_id for now
        if (u.board_id !== fDept) return false;
      }
      return true;
    });
  }, [useCases, fAi, fStatus, fRisk, fOwner, fPriority, fIntegration, fDept, linkMap]);

  const stats = useMemo(() => {
    const has = (uc: UseCase, t: string) => linkMap[uc.id]?.has(t);
    return {
      total: filtered.length,
      ideas: filtered.filter((u) => u.status === "idea").length,
      scored: filtered.filter((u) => scores[u.id]?.total_score != null).length,
      approved: filtered.filter((u) => u.status === "approved" || scores[u.id]?.recommendation === "Pursue").length,
      highPriority: filtered.filter((u) => (u.priority_score ?? 0) >= 70).length,
      highRisk: filtered.filter((u) => u.risk_level === "high").length,
      readyForPilot: filtered.filter((u) => u.status === "ready_for_pilot" || u.status === "pilot").length,
      sarpi: filtered.filter((u) => has(u, "SARPI")).length,
      c3g: filtered.filter((u) => has(u, "C3G")).length,
    };
  }, [filtered, scores, linkMap]);

  const matrixData = useMemo(() => {
    return filtered.map((u) => {
      const s = scores[u.id];
      const x = (s?.feasibility_score ?? 50);
      const y = ((s?.viability_score ?? 0) + (s?.desirability_score ?? 0)) / 2 || 50;
      return { uc: u, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
    });
  }, [filtered, scores]);

  const exportCSV = (filename: string, rows: any[]) => {
    if (!rows.length) { toast.info("Nothing to export."); return; }
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(","),
      ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const exportPortfolio = () => exportCSV(
    "portfolio.csv",
    filtered.map((u) => ({
      title: u.title, status: u.status, ai_type: u.ai_type, risk: u.risk_level,
      priority: u.priority_score,
      feasibility: scores[u.id]?.feasibility_score ?? "",
      viability: scores[u.id]?.viability_score ?? "",
      total: scores[u.id]?.total_score ?? "",
      recommendation: scores[u.id]?.recommendation ?? "",
    })),
  );

  const exportExecutiveSummary = () => {
    // Plain-text executive summary retained for quick copy/paste.
    const text = [
      "Executive Summary",
      "==================",
      `Total use cases: ${stats.total}`,
      `Approved / Pursue: ${stats.approved}`,
      `High priority: ${stats.highPriority}`,
      `High risk: ${stats.highRisk}`,
      `Ready for pilot: ${stats.readyForPilot}`,
      `Sent to SARPI: ${stats.sarpi}`,
      `Sent to C3G: ${stats.c3g}`,
      "",
      "Top priorities:",
      ...filtered
        .slice()
        .sort((a, b) => (b.priority_score ?? 0) - (a.priority_score ?? 0))
        .slice(0, 10)
        .map((u, i) => `${i + 1}. ${u.title} — priority ${u.priority_score ?? "—"}, status ${u.status}`),
    ].join("\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "executive-summary.txt"; a.click();
    URL.revokeObjectURL(url);
  };

  const exportPortfolioPDF = () => {
    if (!filtered.length) { toast.info("Nothing to export."); return; }
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 40;
    let y = margin;

    pdf.setFontSize(20);
    pdf.setTextColor(20, 20, 30);
    pdf.text("AI Use Case Portfolio Summary", margin, y);
    y += 22;
    pdf.setFontSize(10);
    pdf.setTextColor(110, 110, 120);
    pdf.text(`Generated ${new Date().toLocaleDateString()} · UseCasesX™ by AIgilityX`, margin, y);
    y += 24;

    // Portfolio meta
    pdf.setFontSize(11);
    pdf.setTextColor(40, 40, 50);
    const metaLines = [
      `Total use cases: ${stats.total}    Approved / Pursue: ${stats.approved}    High priority: ${stats.highPriority}`,
      `High risk: ${stats.highRisk}    Ready for pilot: ${stats.readyForPilot}    Sent to SARPI: ${stats.sarpi}    Sent to C3G: ${stats.c3g}`,
    ];
    metaLines.forEach((line) => { pdf.text(line, margin, y); y += 16; });
    y += 8;

    const missionMode = filtered.some((u) => {
      const em = u.source_use_case_id ? execMeta[u.source_use_case_id] : undefined;
      return (em?.security_classification ?? "").toLowerCase().match(/secret|confidential|official/);
    });
    pdf.text(
      `Ranked by priority score · ${filtered.length} selected use case${filtered.length === 1 ? "" : "s"}`,
      margin,
      y,
    );
    y += 20;

    // Table header
    const cols = [
      { label: "#", w: 22 },
      { label: "Use case", w: 150 },
      { label: missionMode ? "Mission value" : "ROI potential", w: 78 },
      { label: "Cost range", w: 72 },
      { label: "Timeline", w: 62 },
      { label: "Risk", w: 48 },
      { label: "Security", w: 82 },
    ];
    const drawHeader = () => {
      pdf.setFillColor(24, 26, 40);
      pdf.rect(margin, y - 12, pageW - margin * 2, 20, "F");
      pdf.setTextColor(230, 200, 120);
      pdf.setFontSize(9);
      let x = margin + 4;
      cols.forEach((c) => { pdf.text(c.label, x, y + 2); x += c.w; });
      y += 16;
      pdf.setTextColor(40, 40, 50);
    };
    drawHeader();

    const roiLabel = (u: UseCase, em?: ExecMeta) => {
      const vp = em?.value_potential;
      if (vp) return vp;
      const ps = u.priority_score ?? 0;
      return ps >= 70 ? "High" : ps >= 40 ? "Medium" : "Low";
    };
    const ranked = filtered.slice().sort((a, b) => (b.priority_score ?? 0) - (a.priority_score ?? 0));
    pdf.setFontSize(9);
    ranked.forEach((u, i) => {
      if (y > pageH - margin) { pdf.addPage(); y = margin; drawHeader(); }
      if (i % 2 === 0) {
        pdf.setFillColor(245, 246, 250);
        pdf.rect(margin, y - 10, pageW - margin * 2, 18, "F");
      }
      const em = u.source_use_case_id ? execMeta[u.source_use_case_id] : undefined;
      const row = [
        String(i + 1),
        (u.title ?? "").slice(0, 36),
        roiLabel(u, em),
        (em?.cost_range ?? "—").slice(0, 14),
        (em?.time_to_value ?? "—").slice(0, 12),
        (u.risk_level ?? em?.risk_level ?? "—").slice(0, 10),
        (em?.security_classification ?? "—").slice(0, 16),
      ];
      let x = margin + 4;
      row.forEach((cell, ci) => { pdf.text(String(cell), x, y + 2); x += cols[ci].w; });
      y += 18;
    });

    pdf.save("portfolio-summary.pdf");
    toast.success("Portfolio summary exported as PDF.");
  };

  if (!planLoading && !features.portfolioRoadmap) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Portfolio Roadmap</h1>
          <p className="text-muted-foreground">
            Prioritize, sequence, and govern your full AI use case portfolio.
          </p>
        </div>
        <UpgradePrompt
          feature="Portfolio Roadmap"
          tier="Pro"
          description="Unlock the full portfolio dashboard, prioritization matrix, roadmap views, and executive exports."
        />
      </div>
    );
  }

  return (
    <>
      <PageHero
        tone="dark"
        eyebrow="Portfolio"
        title="Portfolio Roadmap"
        description="Your full AI use case portfolio, prioritization matrix, and execution roadmap."
        actions={
          <>
            <Button variant="outline" onClick={exportPortfolioPDF}>
              <FileDown className="mr-2 h-4 w-4" /> Export Portfolio PDF
            </Button>
            <Button variant="outline" onClick={exportPortfolio}>
              <FileDown className="mr-2 h-4 w-4" /> Export CSV
            </Button>
            <Button onClick={exportExecutiveSummary}>
              <FileText className="mr-2 h-4 w-4" /> Export Executive Summary
            </Button>
          </>
        }
      />
      <div className="mx-auto max-w-7xl space-y-6 p-6">
      {tier === "lite" && (
        <UpgradePrompt
          feature="Advanced exports & multi-org views"
          tier="Enterprise"
          description="Enterprise unlocks regulator/auditor views, decision provenance, and customer-managed governance frameworks."
        />
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-9">
            {[
              ["Total", stats.total],
              ["Ideas", stats.ideas],
              ["Scored", stats.scored],
              ["Approved", stats.approved],
              ["High Priority", stats.highPriority],
              ["High Risk", stats.highRisk],
              ["Ready for Pilot", stats.readyForPilot],
              ["Sent to SARPI", stats.sarpi],
              ["Sent to C3G", stats.c3g],
            ].map(([label, value]) => (
              <Card key={String(label)}>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">{value as number}</div>
                  <div className="text-xs text-muted-foreground">{label as string}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
                <FilterSelect label="Department / Board" value={fDept} onChange={setFDept}
                  options={[["all", "All"], ...Array.from(new Set(useCases.map((u) => u.board_id))).map((b) => [b, b.slice(0, 8)])]} />
                <FilterSelect label="AI Type" value={fAi} onChange={setFAi}
                  options={[["all", "All"], ...aiTypes.map((t) => [t, t])]} />
                <FilterSelect label="Status" value={fStatus} onChange={setFStatus}
                  options={[["all", "All"], ...statuses.map((s) => [s, s])]} />
                <FilterSelect label="Risk Level" value={fRisk} onChange={setFRisk}
                  options={[["all", "All"], ["low", "Low"], ["medium", "Medium"], ["high", "High"]]} />
                <FilterSelect label="Priority Score" value={fPriority} onChange={setFPriority}
                  options={[["all", "All"], ["high", "High (≥70)"], ["medium", "Medium (40–69)"], ["low", "Low (<40)"]]} />
                <FilterSelect label="Owner" value={fOwner} onChange={setFOwner}
                  options={[["all", "All"], ...owners.map((o) => [o, o.slice(0, 8)])]} />
                <FilterSelect label="Integration" value={fIntegration} onChange={setFIntegration}
                  options={[["all", "All"], ["SARPI", "SARPI"], ["AdvisorX", "AdvisorX"], ["C3G", "C3G"]]} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4" /> Prioritization Matrix
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                X: Feasibility · Y: Value / Viability
              </span>
            </CardHeader>
            <CardContent>
              <Matrix data={matrixData} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Roadmap Views</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="30">
                <TabsList>
                  {HORIZONS.map((h) => (
                    <TabsTrigger key={h.key} value={h.key}>{h.label}</TabsTrigger>
                  ))}
                </TabsList>
                {HORIZONS.map((h) => (
                  <TabsContent key={h.key} value={h.key} className="mt-4">
                    <RoadmapList items={filtered} days={h.days} />
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </>
      )}

      <SampleDataDisclaimer />
    </div>
    </>
  );
}

function FilterSelect({
  label, value, onChange, options,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: (readonly [string, string])[] | string[][];
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function Matrix({ data }: { data: { uc: UseCase; x: number; y: number }[] }) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-2xl rounded-md border bg-muted/20">
      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
        <Quadrant label="Strategic Bets" tone="amber" align="tl" />
        <Quadrant label="Quick Wins" tone="emerald" align="tr" />
        <Quadrant label="Avoid / Hold" tone="rose" align="bl" />
        <Quadrant label="Experiments" tone="sky" align="br" />
      </div>
      <div className="absolute left-1/2 top-0 h-full w-px bg-border" />
      <div className="absolute left-0 top-1/2 h-px w-full bg-border" />
      {data.map(({ uc, x, y }) => (
        <Link
          key={uc.id}
          to="/studio/use-case/$id/feasibility"
          params={{ id: uc.id }}
          className="group absolute -ml-1.5 -mt-1.5"
          style={{ left: `${x}%`, top: `${100 - y}%` }}
          title={`${uc.title} (F:${x.toFixed(0)} V:${y.toFixed(0)})`}
        >
          <span className="block h-3 w-3 rounded-full bg-primary ring-2 ring-background transition group-hover:scale-150" />
        </Link>
      ))}
      <div className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-wider text-muted-foreground">
        Feasibility →
      </div>
      <div className="pointer-events-none absolute left-1 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] uppercase tracking-wider text-muted-foreground">
        Value / Viability →
      </div>
    </div>
  );
}

function Quadrant({
  label, tone, align,
}: { label: string; tone: "emerald" | "amber" | "rose" | "sky"; align: "tl"|"tr"|"bl"|"br" }) {
  const tones = {
    emerald: "bg-emerald-500/5 text-emerald-700 dark:text-emerald-300",
    amber: "bg-amber-500/5 text-amber-700 dark:text-amber-300",
    rose: "bg-rose-500/5 text-rose-700 dark:text-rose-300",
    sky: "bg-sky-500/5 text-sky-700 dark:text-sky-300",
  };
  const pos = {
    tl: "items-start justify-start", tr: "items-start justify-end",
    bl: "items-end justify-start", br: "items-end justify-end",
  };
  return (
    <div className={`flex p-3 ${tones[tone]} ${pos[align]}`}>
      <span className="text-xs font-semibold">{label}</span>
    </div>
  );
}

function RoadmapList({ items, days }: { items: UseCase[]; days: number }) {
  const sorted = items
    .slice()
    .sort((a, b) => (b.priority_score ?? 0) - (a.priority_score ?? 0));
  // bucket by score for a simple sequencing model
  const cutoff = days <= 30 ? 80 : days <= 90 ? 60 : days <= 365 ? 40 : 0;
  const inHorizon = sorted.filter((u) => (u.priority_score ?? 50) >= cutoff);
  if (!inHorizon.length) {
    return <p className="text-sm text-muted-foreground">Nothing planned for this horizon yet.</p>;
  }
  return (
    <div className="space-y-2">
      {inHorizon.map((u) => (
        <Link
          key={u.id}
          to="/studio/use-case/$id/blueprint"
          params={{ id: u.id }}
          className="flex items-center justify-between rounded-md border p-3 hover:bg-muted/50"
        >
          <div>
            <div className="font-medium">{u.title}</div>
            <div className="text-xs text-muted-foreground">{u.status} · {u.ai_type ?? "—"}</div>
          </div>
          <div className="flex gap-2">
            {u.risk_level && <Badge variant="outline">{u.risk_level} risk</Badge>}
            <Badge variant="secondary">priority {u.priority_score ?? "—"}</Badge>
          </div>
        </Link>
      ))}
    </div>
  );
}
