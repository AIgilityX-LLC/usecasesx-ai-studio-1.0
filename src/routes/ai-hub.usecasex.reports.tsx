import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MOCK_USE_CASES, type MockUseCase } from "@/lib/usecasex.mock";
import {
  useUseCaseXStore,
  computeTotalScore,
  interpretScore,
  SCORE_LABELS,
  type ScoreDimensions,
  type Portfolio,
} from "@/lib/usecasex.store";
import { trackCTAEvent } from "@/lib/usecasex.tracking";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Printer, FileDown, Send, FileText } from "lucide-react";

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

const ECOSYSTEM = [
  "UseCaseX", "AI Readiness", "AI ROI", "SARPI", "CyberX", "AdvisorX", "FlowX", "PrivacyX", "AssureX",
];

type Profile = {
  full_name: string | null;
  organization: string | null;
  role: string | null;
  industry: string | null;
};

export const Route = createFileRoute("/ai-hub/usecasex/reports")({
  head: () => ({
    meta: [
      { title: "AI Opportunity Reports — UseCaseX™ Pro" },
      { name: "description", content: "Generate executive AI opportunity reports, quick-win briefs and board packs ready for print or PDF." },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const navigate = useNavigate();
  const session = useSupabaseSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const store = useUseCaseXStore();
  const printRef = useRef<HTMLDivElement>(null);

  const [reportType, setReportType] = useState<ReportType>("AI Use Case Summary Report");
  const [portfolioId, setPortfolioId] = useState<string>("");
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());
  const [generated, setGenerated] = useState(false);

  useEffect(() => {
    if (session === undefined) return;
    if (session === null) { navigate({ to: "/ai-hub/usecasex/pro", replace: true }); return; }
    let active = true;
    (async () => {
      const { data: p } = await supabase
        .from("profiles")
        .select("full_name, organization, role, industry, profile_completed")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (!active) return;
      if (!p?.profile_completed) { navigate({ to: "/ai-hub/usecasex/profile", replace: true }); return; }
      setProfile(p);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [session, navigate]);

  // Pre-select saved use cases based on report type
  useEffect(() => {
    if (!store.saved.length) return;
    let slugs: string[] = [];
    if (reportType === "AI Opportunity Portfolio Report" && portfolioId) {
      const p = store.portfolios.find((x) => x.id === portfolioId);
      slugs = p?.useCaseSlugs ?? [];
    } else if (reportType === "AI Quick Wins Report") {
      slugs = store.saved
        .filter((s) => {
          const total = computeTotalScore(s.score);
          return total >= 70;
        })
        .map((s) => s.useCaseSlug);
      if (!slugs.length) slugs = store.saved.map((s) => s.useCaseSlug);
    } else {
      slugs = store.saved.map((s) => s.useCaseSlug);
    }
    setSelectedSlugs(new Set(slugs));
  }, [reportType, portfolioId, store.saved, store.portfolios]);

  const selectedItems = useMemo(() => {
    return Array.from(selectedSlugs)
      .map((slug) => {
        const uc = MOCK_USE_CASES.find((u) => u.slug === slug);
        const entry = store.saved.find((s) => s.useCaseSlug === slug);
        return uc ? { uc, score: entry?.score, note: entry?.note, priority: entry?.priority } : null;
      })
      .filter(Boolean) as Array<{ uc: MockUseCase; score?: ScoreDimensions; note?: string; priority?: string }>;
  }, [selectedSlugs, store.saved]);

  const handlePrint = () => {
    trackCTAEvent("report_printed", { reportType });
    window.print();
  };

  const handleSendTo = (target: "AdvisorX" | "SARPI" | "CyberX") => {
    trackCTAEvent("report_sent_to_platform", { reportType, target });
    alert(`Sent to ${target}. (Integration pathway placeholder)`);
  };

  if (loading) {
    return <div className="mx-auto max-w-4xl px-6 py-16 text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #usecasex-report, #usecasex-report * { visibility: visible; }
          #usecasex-report { position: absolute; inset: 0; padding: 0; }
          .no-print { display: none !important; }
          @page { size: A4; margin: 18mm; }
        }
      `}</style>

      <section className="border-b border-border bg-background no-print">
        <div className="mx-auto max-w-[1280px] px-6 py-10 space-y-6">
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">AI Opportunity Reports</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Generate executive-ready reports from your saved use cases, scores and portfolios.
              </p>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline"><Link to="/ai-hub/usecasex/saved">Saved</Link></Button>
              <Button asChild variant="outline"><Link to="/ai-hub/usecasex/portfolio">Portfolios</Link></Button>
            </div>
          </header>

          <Card>
            <CardHeader><CardTitle className="text-base">Configure report</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wide text-muted-foreground">Report type</label>
                <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REPORT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {reportType === "AI Opportunity Portfolio Report" && (
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-wide text-muted-foreground">Portfolio</label>
                  <Select value={portfolioId} onValueChange={setPortfolioId}>
                    <SelectTrigger><SelectValue placeholder="Select a portfolio" /></SelectTrigger>
                    <SelectContent>
                      {store.portfolios.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5 md:col-span-3">
                <label className="text-xs uppercase tracking-wide text-muted-foreground">Use cases to include</label>
                {store.saved.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No saved use cases. <Link to="/ai-hub/usecasex/explore" className="underline">Browse the catalogue</Link>.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-56 overflow-auto rounded-md border p-2">
                    {store.saved.map((s) => {
                      const uc = MOCK_USE_CASES.find((u) => u.slug === s.useCaseSlug);
                      if (!uc) return null;
                      const checked = selectedSlugs.has(s.useCaseSlug);
                      return (
                        <label key={s.useCaseSlug} className="flex items-start gap-2 text-sm cursor-pointer rounded p-1.5 hover:bg-muted">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(c) => {
                              setSelectedSlugs((prev) => {
                                const next = new Set(prev);
                                if (c) next.add(s.useCaseSlug); else next.delete(s.useCaseSlug);
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
            <Button
              onClick={() => { setGenerated(true); trackCTAEvent("report_generated", { reportType, count: selectedItems.length }); }}
              disabled={selectedItems.length === 0}
            >
              <FileText className="w-4 h-4 mr-1" /> Generate Report
            </Button>
            <Button variant="outline" onClick={handlePrint} disabled={!generated}>
              <Printer className="w-4 h-4 mr-1" /> Print / Save PDF
            </Button>
            <Button variant="outline" onClick={handlePrint} disabled={!generated}>
              <FileDown className="w-4 h-4 mr-1" /> Download PDF
            </Button>
            <Separator orientation="vertical" className="h-9 mx-1" />
            <Button variant="secondary" onClick={() => handleSendTo("AdvisorX")} disabled={!generated}>
              <Send className="w-4 h-4 mr-1" /> Send to AdvisorX
            </Button>
            <Button variant="secondary" onClick={() => handleSendTo("SARPI")} disabled={!generated}>
              <Send className="w-4 h-4 mr-1" /> Send to SARPI
            </Button>
            <Button variant="secondary" onClick={() => handleSendTo("CyberX")} disabled={!generated}>
              <Send className="w-4 h-4 mr-1" /> Send to CyberX
            </Button>
          </div>
        </div>
      </section>

      {generated && (
        <section className="bg-muted/30 py-10 px-6">
          <div ref={printRef} id="usecasex-report" className="mx-auto max-w-[900px] bg-white text-slate-900 rounded-lg shadow-sm border border-border print:shadow-none print:border-0 p-10 space-y-8">
            <ReportBody
              reportType={reportType}
              profile={profile}
              items={selectedItems}
              portfolio={reportType === "AI Opportunity Portfolio Report" ? store.portfolios.find((p) => p.id === portfolioId) : undefined}
            />
          </div>
        </section>
      )}
    </>
  );
}

function ReportBody({
  reportType, profile, items, portfolio,
}: {
  reportType: ReportType;
  profile: Profile | null;
  items: Array<{ uc: MockUseCase; score?: ScoreDimensions; note?: string; priority?: string }>;
  portfolio?: Portfolio;
}) {
  const scored = items.filter((i) => i.score);
  const avgScore = scored.length
    ? Math.round(scored.reduce((acc, i) => acc + computeTotalScore(i.score), 0) / scored.length)
    : 0;

  const highValue = items.filter((i) => computeTotalScore(i.score) >= 80);
  const planning = items.filter((i) => { const t = computeTotalScore(i.score); return t >= 60 && t < 80; });
  const readiness = items.filter((i) => { const t = computeTotalScore(i.score); return t >= 40 && t < 60; });
  const lowPriority = items.filter((i) => computeTotalScore(i.score) < 40 && i.score);

  const highRisk = items.filter((i) => i.uc.riskLevel === "High" || i.uc.riskLevel === "Critical");
  const agentic = items.filter((i) => /agent/i.test(i.uc.aiType) || /agent/i.test(i.uc.title));

  return (
    <>
      {/* Branded header */}
      <header className="flex items-start justify-between border-b border-slate-200 pb-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-600">AIgilityX™ · UseCaseX™</p>
          <h1 className="text-3xl font-semibold mt-2 leading-tight">{reportType}</h1>
          <p className="text-sm text-slate-500 mt-2">{new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</p>
        </div>
        <div className="text-right text-xs text-slate-500">
          <p className="font-semibold text-slate-900">{profile?.organization ?? "Your organization"}</p>
          <p>{profile?.full_name ?? "—"}</p>
          {profile?.role && <p>{profile.role}</p>}
          {profile?.industry && <p>{profile.industry}</p>}
        </div>
      </header>

      {portfolio && (
        <Section title="Portfolio">
          <div className="grid grid-cols-3 gap-3 text-sm">
            <Meta label="Name" value={portfolio.name} />
            <Meta label="Type" value={portfolio.type} />
            <Meta label="Status" value={portfolio.status} />
            {portfolio.objective && <Meta label="Objective" value={portfolio.objective} wide />}
            {portfolio.targetDepartment && <Meta label="Department" value={portfolio.targetDepartment} />}
            {portfolio.targetQuarter && <Meta label="Target" value={portfolio.targetQuarter} />}
          </div>
        </Section>
      )}

      {/* Executive summary */}
      <Section title="Executive Summary">
        <div className="grid grid-cols-4 gap-3">
          <Stat label="Use cases" value={items.length} />
          <Stat label="Avg score" value={avgScore || "—"} />
          <Stat label="High-priority" value={highValue.length} />
          <Stat label="High-risk" value={highRisk.length} />
        </div>
        <p className="text-sm text-slate-600 mt-4 leading-relaxed">
          This report summarises {items.length} AI use case{items.length === 1 ? "" : "s"} shortlisted by {profile?.organization ?? "your organization"}.
          The portfolio shows an average AIgilityX composite score of {avgScore || "—"}/100, with {highValue.length} flagged as high-priority quick wins or strategic plays and {highRisk.length} requiring elevated governance attention.
        </p>
      </Section>

      {/* Use cases */}
      <Section title="Selected Use Cases">
        <div className="space-y-3">
          {items.map(({ uc, score, note, priority }) => {
            const total = computeTotalScore(score);
            const interp = score ? interpretScore(total) : null;
            return (
              <div key={uc.slug} className="rounded-md border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">{uc.title}</h3>
                    <p className="text-xs text-slate-500 mt-1">{uc.industry.name} · {uc.businessFunction} · {uc.aiType}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-2xl font-semibold tabular-nums">{score ? total : "—"}</div>
                    {priority && <div className="text-[10px] uppercase tracking-wide text-slate-500">{priority}</div>}
                  </div>
                </div>
                <p className="text-sm text-slate-600 mt-2 leading-snug">{uc.summary}</p>
                <div className="flex flex-wrap gap-1.5 mt-2 text-[10px]">
                  <Tag>Value: {uc.valuePotential}</Tag>
                  <Tag>Complexity: {uc.complexity}</Tag>
                  <Tag>Risk: {uc.riskLevel}</Tag>
                  <Tag>TTV: {uc.timeToValue}</Tag>
                  <Tag>Maturity: {uc.maturity}</Tag>
                </div>
                {interp && <p className="text-[11px] text-slate-500 mt-2 italic">{interp.label}</p>}
                {note && <p className="text-xs text-slate-700 mt-2 border-l-2 border-indigo-300 pl-2">Note: {note}</p>}
              </div>
            );
          })}
        </div>
      </Section>

      {/* Scores breakdown */}
      {scored.length > 0 && (
        <Section title="Score Breakdown">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2 pr-2 font-medium">Use case</th>
                {Object.values(SCORE_LABELS).map((l) => (
                  <th key={l} className="py-2 px-1 font-medium text-center">{l.split(" ").map((w) => w[0]).join("")}</th>
                ))}
                <th className="py-2 pl-2 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {scored.map(({ uc, score }) => (
                <tr key={uc.slug} className="border-b border-slate-100">
                  <td className="py-2 pr-2 truncate max-w-[280px]">{uc.title}</td>
                  {(Object.keys(SCORE_LABELS) as Array<keyof ScoreDimensions>).map((k) => (
                    <td key={k} className="py-2 px-1 text-center tabular-nums text-slate-700">{score![k]}</td>
                  ))}
                  <td className="py-2 pl-2 text-right font-semibold tabular-nums">{computeTotalScore(score)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[10px] text-slate-400 mt-2">
            Dimensions: SA Strategic Alignment · VP Value Potential · F Feasibility · TtV Time to Value · RM Risk Manageability · GR Governance Readiness
          </p>
        </Section>
      )}

      {/* Priority matrix */}
      <Section title="Priority Matrix">
        <div className="grid grid-cols-2 gap-3">
          <MatrixBlock title="80–100 · Quick wins / strategic" tone="bg-emerald-50 border-emerald-200" items={highValue.map((i) => i.uc.title)} />
          <MatrixBlock title="60–79 · Strong candidate · planning" tone="bg-blue-50 border-blue-200" items={planning.map((i) => i.uc.title)} />
          <MatrixBlock title="40–59 · Readiness improvement" tone="bg-amber-50 border-amber-200" items={readiness.map((i) => i.uc.title)} />
          <MatrixBlock title="0–39 · Low priority / not ready" tone="bg-slate-50 border-slate-200" items={lowPriority.map((i) => i.uc.title)} />
        </div>
      </Section>

      {/* Readiness considerations */}
      <Section title="Readiness Considerations">
        <ul className="text-sm text-slate-700 space-y-1.5 list-disc pl-5">
          <li>Confirm data availability, quality and lineage for each shortlisted use case.</li>
          <li>Validate sponsorship, change capacity and skills in target functions.</li>
          <li>Assess platform fit (model, vector store, agent framework) against existing stack.</li>
          <li>Send borderline (40–59) candidates to <strong>SARPI™ AI Readiness</strong> for diagnostic review.</li>
        </ul>
      </Section>

      {/* ROI areas */}
      <Section title="ROI Areas">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <RoiBox title="Productivity gains" desc="Time reduction, automation of repetitive tasks, copilot acceleration." />
          <RoiBox title="Revenue uplift" desc="Personalisation, conversion, new digital products." />
          <RoiBox title="Cost avoidance" desc="Reduced incidents, lower fraud / risk losses, less manual review." />
          <RoiBox title="Decision quality" desc="Faster, better-informed decisions across operations and strategy." />
        </div>
        <p className="text-xs text-slate-500 mt-3">Run <strong>AI ROI Calculator</strong> on top-scoring items to quantify value.</p>
      </Section>

      {/* Risk & governance */}
      <Section title="Risk & Governance Overview">
        <div className="grid grid-cols-3 gap-3 text-sm">
          <Stat label="High-risk items" value={highRisk.length} />
          <Stat label="Agentic AI items" value={agentic.length} />
          <Stat label="Total in scope" value={items.length} />
        </div>
        <ul className="text-sm text-slate-700 space-y-1.5 list-disc pl-5 mt-3">
          {highRisk.length > 0 && <li><strong>{highRisk.length}</strong> use case(s) flagged High or Critical risk — send to <strong>CyberX C3G™</strong> for governance review.</li>}
          {agentic.length > 0 && <li><strong>{agentic.length}</strong> agentic AI opportunity(ies) — design controls and workflow handoffs in <strong>FlowX™</strong>.</li>}
          <li>Privacy review via <strong>PrivacyX™</strong> for any use case touching personal or sensitive data.</li>
          <li>Independent validation via <strong>AssureX™</strong> before production rollout.</li>
        </ul>
      </Section>

      {/* Next steps */}
      <Section title="Recommended AIgilityX Next Steps">
        <ol className="text-sm text-slate-700 space-y-2 list-decimal pl-5">
          {highValue.length > 0 && <li>Move {highValue.length} high-priority use case(s) into a <strong>Quick Wins portfolio</strong> and trigger AI ROI calculation.</li>}
          {readiness.length > 0 && <li>Send {readiness.length} medium-score use case(s) to <strong>SARPI AI Readiness</strong> diagnostic.</li>}
          {highRisk.length > 0 && <li>Route {highRisk.length} high-risk use case(s) to <strong>CyberX Governance Review</strong>.</li>}
          <li>Use <strong>AdvisorX</strong> to align portfolio with executive strategy and board priorities.</li>
          <li>Pilot top-scoring use cases via <strong>FlowX</strong> and validate with <strong>AssureX</strong> before scale-up.</li>
        </ol>
      </Section>

      {/* Ecosystem pathway */}
      <Section title="AIgilityX Execution Path">
        <div className="flex flex-wrap items-center gap-1.5">
          {ECOSYSTEM.map((step, i) => (
            <div key={step} className="flex items-center gap-1.5">
              <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">
                {i + 1}. {step}
              </span>
              {i < ECOSYSTEM.length - 1 && <span className="text-slate-300">→</span>}
            </div>
          ))}
        </div>
      </Section>

      <footer className="pt-6 border-t border-slate-200 text-[10px] text-slate-400 flex justify-between">
        <span>© AIgilityX™ — Confidential. Generated via UseCaseX™ Pro.</span>
        <span>aigilityx.ai</span>
      </footer>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-indigo-700 border-l-4 border-indigo-500 pl-2">{title}</h2>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-center">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-2xl font-semibold tabular-nums mt-0.5">{value}</p>
    </div>
  );
}

function Meta({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-3" : ""}>
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm text-slate-900">{value}</p>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">{children}</span>;
}

function MatrixBlock({ title, tone, items }: { title: string; tone: string; items: string[] }) {
  return (
    <div className={`rounded-md border ${tone} p-3`}>
      <p className="text-xs font-semibold text-slate-700 mb-2">{title}</p>
      {items.length === 0 ? (
        <p className="text-[11px] text-slate-500 italic">None</p>
      ) : (
        <ul className="text-xs text-slate-700 space-y-1 list-disc pl-4">
          {items.map((t) => <li key={t}>{t}</li>)}
        </ul>
      )}
    </div>
  );
}

function RoiBox({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-md border border-slate-200 p-3">
      <p className="font-medium text-slate-900">{title}</p>
      <p className="text-xs text-slate-600 mt-1">{desc}</p>
    </div>
  );
}
