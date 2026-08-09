import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { PageHero } from "@/components/usecasex/PageHero";
import { SCORE_LABELS, computeTotalScore, type ScoreDimensions } from "@/lib/usecasex.store";
import { useUseCaseXPro } from "@/hooks/usecasex-pro";
import { useBenefitsBySlug } from "@/hooks/useBenefits";
import { ValueSummary } from "@/components/value/ValueSummary";
import { trackCTAEvent } from "@/lib/usecasex.tracking";
import { AUDIT_EVENTS, PRODUCT_EVENTS, recordAuditEvent, recordProductEvent } from "@/lib/telemetry";
import {
  buildExecutiveNarrative,
  buildPortfolioReport,
  PROVENANCE_HELP,
  PROVENANCE_LABELS,
  type ReportItemInput,
} from "@/lib/reports/report-model";
import { downloadBenefitsCsv, downloadUseCaseCsv, printReport } from "@/lib/reports/report-export";
import { ReportDocument } from "@/components/reports/ReportDocument";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { FileDown, FileText, Printer, RotateCcw, Table2 } from "lucide-react";

type ReportType =
  | "AI Use Case Summary Report"
  | "AI Opportunity Portfolio Report"
  | "AI Quick Wins Report"
  | "Board AI Opportunity Brief"
  | "Department AI Use Case Report"
  | "AI Readiness and ROI Next-Step Report";

const REPORT_TYPES: ReportType[] = [
  "AI Use Case Summary Report",
  "AI Opportunity Portfolio Report",
  "AI Quick Wins Report",
  "Board AI Opportunity Brief",
  "Department AI Use Case Report",
  "AI Readiness and ROI Next-Step Report",
];

/** Report types that lead with per-use-case executive detail rather than roll-ups. */
const USE_CASE_LED: ReportType[] = ["AI Use Case Summary Report", "Department AI Use Case Report"];

type Profile = {
  full_name: string | null;
  organization: string | null;
  role: string | null;
  industry: string | null;
};

export const Route = createFileRoute("/_app/reports")({
  head: () => ({
    meta: [
      { title: "AI Opportunity Reports — UseCasesX™ Pro" },
      {
        name: "description",
        content:
          "Generate executive AI use case and portfolio reports from your own workspace records, ready for print, PDF or CSV.",
      },
      { property: "og:title", content: "AI Opportunity Reports — UseCasesX™ Pro" },
      {
        property: "og:description",
        content:
          "Executive use case summaries and portfolio reports built only from your saved scores, decisions and value records.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const navigate = useNavigate();
  const session = useSupabaseSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const store = useUseCaseXPro();
  const printRef = useRef<HTMLDivElement>(null);

  const [reportType, setReportType] = useState<ReportType>("AI Use Case Summary Report");
  const [portfolioId, setPortfolioId] = useState<string>("");
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());
  const [generated, setGenerated] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);
  /** Narrative edits are the user's own words once touched; null = use generated. */
  const [narrativeOverride, setNarrativeOverride] = useState<string | null>(null);

  useEffect(() => {
    if (session === undefined) return;
    if (session === null) {
      navigate({ to: "/pro", replace: true });
      return;
    }
    let active = true;
    (async () => {
      const { data: p } = await supabase
        .from("profiles")
        .select("full_name, organization, role, industry, profile_completed")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (!active) return;
      if (!p?.profile_completed) {
        navigate({ to: "/profile", replace: true });
        return;
      }
      setProfile(p);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [session, navigate]);

  // Pre-select saved use cases based on report type
  useEffect(() => {
    if (!store.saved.length) return;
    let slugs: string[] = [];
    if (reportType === "AI Opportunity Portfolio Report" && portfolioId) {
      const p = store.portfolios.find((x) => x.id === portfolioId);
      slugs = p?.useCaseSlugs ?? [];
    } else if (reportType === "AI Quick Wins Report") {
      slugs = store.saved.filter((s) => computeTotalScore(s.score) >= 70).map((s) => s.useCaseSlug);
      if (!slugs.length) slugs = store.saved.map((s) => s.useCaseSlug);
    } else {
      slugs = store.saved.map((s) => s.useCaseSlug);
    }
    setSelectedSlugs(new Set(slugs));
  }, [reportType, portfolioId, store.saved, store.portfolios]);

  const portfolio = useMemo(
    () => store.portfolios.find((p) => p.id === portfolioId) ?? null,
    [store.portfolios, portfolioId],
  );

  // Value realisation for the selection. Reports work in repository slugs;
  // benefits live on Studio use cases, so the lineage map bridges the two.
  const selectedSlugToId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const slug of selectedSlugs) {
      const id = store.slugToId[slug];
      if (id) map[slug] = id;
    }
    return map;
  }, [selectedSlugs, store.slugToId]);

  const value = useBenefitsBySlug(selectedSlugToId);

  /** One assembled input row per selected use case — the report's only source. */
  const items: ReportItemInput[] = useMemo(() => {
    const entryBySlug = new Map(
      store.portfolios
        .flatMap((p) => (portfolio ? (p.id === portfolio.id ? p.entries : []) : p.entries))
        .map((entry) => [entry.useCaseSlug ?? "", entry]),
    );
    return Array.from(selectedSlugs)
      .map((slug): ReportItemInput | null => {
        const content = store.useCaseContent[slug];
        if (!content) return null;
        const saved = store.saved.find((s) => s.useCaseSlug === slug);
        return {
          useCaseId: store.slugToId[slug] ?? null,
          studioUseCaseId: value.studioIdBySlug[slug] ?? null,
          content,
          score: saved?.score,
          note: saved?.note,
          priority: saved?.priority,
          entry: entryBySlug.get(slug),
          benefits: value.benefitsBySlug[slug] ?? [],
        };
      })
      .filter((row): row is ReportItemInput => row !== null)
      .sort((a, b) => a.content.title.localeCompare(b.content.title));
  }, [
    selectedSlugs,
    store.saved,
    store.useCaseContent,
    store.slugToId,
    store.portfolios,
    portfolio,
    value.benefitsBySlug,
    value.studioIdBySlug,
  ]);

  const report = useMemo(() => buildPortfolioReport(items, portfolio), [items, portfolio]);
  const generatedNarrative = useMemo(
    () => buildExecutiveNarrative(report, { organization: profile?.organization ?? null }),
    [report, profile?.organization],
  );
  const narrative = narrativeOverride ?? generatedNarrative;

  const handleGenerate = async () => {
    const stamp = new Date();
    setGenerated(true);
    setGeneratedAt(stamp);
    setNarrativeOverride(null);
    trackCTAEvent("report_generated", { reportType, count: items.length });
    void recordAuditEvent({
      event: AUDIT_EVENTS.reportGenerated,
      entity: { type: "report", id: portfolio?.id ?? null },
      next: { reportType, useCaseCount: items.length, portfolioId: portfolio?.id ?? null },
    });
    void recordProductEvent({
      event: PRODUCT_EVENTS.reportExported,
      entity: { type: "report" },
      properties: { reportType, format: "screen", useCaseCount: items.length },
    });
    try {
      const { generateReportRecord } = await import("@/lib/usecasex.services");
      await generateReportRecord({
        title: `${reportType} — ${stamp.toLocaleDateString()}`,
        kind: reportType,
        useCaseCount: items.length,
        payload: { slugs: Array.from(selectedSlugs), portfolioId },
      });
    } catch (e) {
      console.error("[generate-report]", e);
    }
  };

  const recordExport = (format: "pdf" | "csv" | "csv_benefits", filename?: string) => {
    void recordAuditEvent({
      event: AUDIT_EVENTS.exportGenerated,
      entity: { type: "report", id: portfolio?.id ?? null },
      next: { reportType, format, filename: filename ?? null, useCaseCount: items.length },
    });
    void recordProductEvent({
      event: PRODUCT_EVENTS.reportExported,
      entity: { type: "report" },
      properties: { reportType, format, useCaseCount: items.length },
    });
  };

  const handlePrint = () => {
    trackCTAEvent("report_printed", { reportType });
    recordExport("pdf");
    printReport();
  };

  const handleCsv = () => {
    const filename = downloadUseCaseCsv(items, reportType);
    recordExport("csv", filename);
    toast.success(`Exported ${filename}`);
  };

  const handleBenefitsCsv = () => {
    const filename = downloadBenefitsCsv(items, reportType);
    recordExport("csv_benefits", filename);
    toast.success(`Exported ${filename}`);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-16 text-sm text-muted-foreground">Loading…</div>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #usecasex-report, #usecasex-report * { visibility: visible; }
          #usecasex-report { position: absolute; inset: 0; padding: 0; }
          .no-print { display: none !important; }
          .report-section { break-inside: avoid; page-break-inside: avoid; }
          .report-page-break { break-before: page; page-break-before: always; }
          table { break-inside: auto; }
          tr { break-inside: avoid; page-break-inside: avoid; }
          thead { display: table-header-group; }
          @page { size: A4; margin: 16mm; }
        }
      `}</style>

      <div className="no-print">
        <PageHero
          tone="dark"
          eyebrow="Reports"
          title="AI Opportunity Reports"
          description="Executive use case summaries and portfolio reports built only from your saved records — scores, decisions, delivery plans and value."
          actions={
            <>
              <Button asChild variant="outline">
                <Link to="/my-use-cases">Saved</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/portfoliox">Portfolios</Link>
              </Button>
            </>
          }
        />
      </div>

      <section className="border-b border-border bg-secondary/40 no-print">
        <div className="mx-auto max-w-[1280px] space-y-6 px-6 py-10">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Configure report</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Report type
                </label>
                <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REPORT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {reportType === "AI Opportunity Portfolio Report" && (
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Portfolio
                  </label>
                  <Select value={portfolioId} onValueChange={setPortfolioId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a portfolio" />
                    </SelectTrigger>
                    <SelectContent>
                      {store.portfolios.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5 md:col-span-3">
                <label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Use cases to include
                </label>
                {store.saved.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No saved use cases.{" "}
                    <Link to="/repository" className="underline">
                      Browse the catalogue
                    </Link>
                    .
                  </p>
                ) : (
                  <div className="grid max-h-56 grid-cols-1 gap-2 overflow-auto rounded-md border p-2 md:grid-cols-2">
                    {store.saved.map((s) => {
                      const uc = store.useCaseContent[s.useCaseSlug];
                      if (!uc) return null;
                      return (
                        <label
                          key={s.useCaseSlug}
                          className="flex cursor-pointer items-start gap-2 rounded p-1.5 text-sm hover:bg-muted"
                        >
                          <Checkbox
                            checked={selectedSlugs.has(s.useCaseSlug)}
                            onCheckedChange={(c) => {
                              setSelectedSlugs((prev) => {
                                const next = new Set(prev);
                                if (c) next.add(s.useCaseSlug);
                                else next.delete(s.useCaseSlug);
                                return next;
                              });
                            }}
                          />
                          <span className="leading-tight">{uc.title}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleGenerate} disabled={items.length === 0}>
              <FileText className="mr-1 h-4 w-4" /> Generate report
            </Button>
            <Button variant="outline" onClick={handlePrint} disabled={!generated}>
              <Printer className="mr-1 h-4 w-4" /> Print / Save as PDF
            </Button>
            <Separator orientation="vertical" className="mx-1 h-9" />
            <Button variant="outline" onClick={handleCsv} disabled={!generated}>
              <Table2 className="mr-1 h-4 w-4" /> Export use cases (CSV)
            </Button>
            <Button
              variant="outline"
              onClick={handleBenefitsCsv}
              disabled={!generated || report.totals.benefits === 0}
            >
              <FileDown className="mr-1 h-4 w-4" /> Export benefits (CSV)
            </Button>
          </div>

          {generated && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Executive narrative</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  {PROVENANCE_HELP.narrative} Edit it freely — your wording is what prints.
                </p>
                <Textarea
                  value={narrative}
                  rows={4}
                  aria-label="Executive narrative"
                  onChange={(e) => setNarrativeOverride(e.target.value)}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setNarrativeOverride(null)}
                  disabled={narrativeOverride === null}
                >
                  <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reset to generated text
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {generated && (
        <section className="bg-muted/30 px-6 py-10">
          <div
            ref={printRef}
            id="usecasex-report"
            className="mx-auto max-w-[900px] space-y-8 rounded-lg border border-border bg-white p-10 text-slate-900 shadow-sm print:border-0 print:shadow-none"
          >
            <ReportDocument
              reportType={reportType}
              useCaseLed={USE_CASE_LED.includes(reportType)}
              report={report}
              items={items}
              narrative={narrative}
              narrativeEdited={narrativeOverride !== null}
              generatedAt={generatedAt ?? new Date()}
              organization={profile?.organization ?? null}
              author={profile?.full_name ?? null}
              authorRole={profile?.role ?? null}
              industry={profile?.industry ?? null}
            />

            <div className="report-section">
              <SectionHeading title="Value realisation" source={PROVENANCE_LABELS.studio_value} />
              <ValueSummary
                aggregate={value.aggregate}
                loading={value.isLoading}
                title="Aggregated value"
                description="Benefits captured in the AI Use Case Studio for the selected use cases. Only compatible units, currencies and periods are combined."
                emptyHint="No benefits have been captured in the Studio for these use cases yet."
              />
            </div>
          </div>
        </section>
      )}
    </>
  );
}

function SectionHeading({ title, source }: { title: string; source: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3 border-l-4 border-indigo-500 pl-2">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-indigo-700">{title}</h2>
      <span className="text-[10px] uppercase tracking-wide text-slate-400">{source}</span>
    </div>
  );
}

export { SCORE_LABELS };
export type { ScoreDimensions };
