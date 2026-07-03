import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHero } from "@/components/usecasex/PageHero";
import { CtaTriad } from "@/components/usecasex/CtaTriad";
import { trackModuleEvent } from "@/lib/module-analytics";

export const Route = createFileRoute("/_app/roi-calculator")({
  head: () => ({
    meta: [
      { title: "ROI & Mission Value Calculator — UseCasesX™" },
      { name: "description", content: "Estimate financial ROI and non-financial mission value for an AI use case before you invest." },
      { property: "og:title", content: "ROI & Mission Value Calculator — UseCasesX™" },
      { property: "og:description", content: "Estimate financial ROI and mission value for AI use cases." },
    ],
  }),
  component: RoiCalculatorPage,
});

const fmt = (n: number) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

function Field({ label, value, onChange, suffix }: { label: string; value: number; onChange: (n: number) => void; suffix?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="mt-1 flex items-center rounded-md border border-input bg-background">
        <input
          type="number"
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-full bg-transparent px-3 py-2 text-sm text-foreground outline-none"
        />
        {suffix ? <span className="pr-3 text-xs text-muted-foreground">{suffix}</span> : null}
      </div>
    </label>
  );
}

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <label className="block">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
        <span className="text-sm font-bold text-primary">{value}</span>
      </div>
      <input type="range" min={0} max={10} value={value} onChange={(e) => onChange(parseInt(e.target.value))} className="mt-2 w-full accent-[var(--gold)]" />
    </label>
  );
}

function RoiCalculatorPage() {
  const [mode, setMode] = useState<"financial" | "mission">("financial");

  // Financial
  const [investment, setInvestment] = useState(120000);
  const [annualBenefit, setAnnualBenefit] = useState(180000);
  const [annualCost, setAnnualCost] = useState(30000);
  const [years, setYears] = useState(3);

  const fin = useMemo(() => {
    const netAnnual = annualBenefit - annualCost;
    const totalNet = netAnnual * years - investment;
    const roi = investment > 0 ? (totalNet / investment) * 100 : 0;
    const payback = netAnnual > 0 ? investment / netAnnual : Infinity;
    return { netAnnual, totalNet, roi, payback };
  }, [investment, annualBenefit, annualCost, years]);

  // Mission value (doc §12) — weighted non-financial composite
  const [missionValue, setMissionValue] = useState(7);
  const [riskReduction, setRiskReduction] = useState(6);
  const [readiness, setReadiness] = useState(5);
  const [responseTime, setResponseTime] = useState(6);
  const [resilience, setResilience] = useState(7);
  const [compliance, setCompliance] = useState(5);

  const weights = { missionValue: 0.25, riskReduction: 0.2, readiness: 0.15, responseTime: 0.15, resilience: 0.15, compliance: 0.1 };
  const missionScore = useMemo(() => {
    const s =
      missionValue * weights.missionValue + riskReduction * weights.riskReduction + readiness * weights.readiness +
      responseTime * weights.responseTime + resilience * weights.resilience + compliance * weights.compliance;
    return Math.round(s * 10);
  }, [missionValue, riskReduction, readiness, responseTime, resilience, compliance]);

  const missionBand = missionScore >= 75 ? "Mission-Critical" : missionScore >= 50 ? "High Value" : missionScore >= 30 ? "Moderate" : "Low";

  const exportSummary = () => {
    if (typeof window === "undefined") return;
    void trackModuleEvent("roi_calculator", "click", { interaction: "export_summary", mode });
    const body =
      mode === "financial"
        ? `<table class="kv">
             <tr><th>Investment</th><td>${fmt(investment)}</td></tr>
             <tr><th>Annual benefit</th><td>${fmt(annualBenefit)}</td></tr>
             <tr><th>Annual running cost</th><td>${fmt(annualCost)}</td></tr>
             <tr><th>Horizon</th><td>${years} years</td></tr>
             <tr><th>Net annual value</th><td>${fmt(fin.netAnnual)}</td></tr>
             <tr><th>${years}-yr net value</th><td>${fmt(fin.totalNet)}</td></tr>
             <tr><th>ROI</th><td>${fin.roi.toFixed(0)}%</td></tr>
             <tr><th>Payback</th><td>${Number.isFinite(fin.payback) ? fin.payback.toFixed(1) + " years" : "—"}</td></tr>
           </table>`
        : `<table class="kv">
             <tr><th>Mission value</th><td>${missionValue}/10</td></tr>
             <tr><th>Risk reduction</th><td>${riskReduction}/10</td></tr>
             <tr><th>Readiness improvement</th><td>${readiness}/10</td></tr>
             <tr><th>Response time</th><td>${responseTime}/10</td></tr>
             <tr><th>Operational resilience</th><td>${resilience}/10</td></tr>
             <tr><th>Compliance</th><td>${compliance}/10</td></tr>
             <tr><th>Composite mission score</th><td>${missionScore}/100 (${missionBand})</td></tr>
           </table>`;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>UseCasesX Value Summary</title>
      <style>body{font-family:system-ui,sans-serif;margin:40px;color:#111}h1{font-size:20px}
      .meta{color:#777;font-size:12px;margin-bottom:16px}table.kv{border-collapse:collapse}
      table.kv th{text-align:left;color:#555;padding:4px 24px 4px 0}table.kv td{padding:4px 0;font-weight:600}</style>
      </head><body><h1>${mode === "financial" ? "AI Use Case ROI Summary" : "AI Use Case Mission Value Summary"}</h1>
      <div class="meta">Generated ${new Date().toLocaleString()} · UseCasesX™ by AIgilityX™</div>${body}
      <script>window.onload=function(){window.print();}</script></body></html>`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); }
  };

  const switchMode = (m: "financial" | "mission") => {
    setMode(m);
    void trackModuleEvent("roi_calculator", "click", { interaction: "mode_switch", mode: m });
  };

  return (
    <article>
      <PageHero
        tone="dark"
        eyebrow="Value Intelligence"
        title="ROI & Mission Value Calculator"
        description="Estimate financial ROI or, for government and defense, non-financial mission value — because mission impact isn't always measured in dollars."
      />

      <div className="mx-auto max-w-[1100px] px-6 py-10">
        <div className="inline-flex rounded-lg border border-border bg-card p-1">
          <button onClick={() => switchMode("financial")} className={"rounded-md px-4 py-2 text-sm font-bold " + (mode === "financial" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>Financial ROI</button>
          <button onClick={() => switchMode("mission")} className={"rounded-md px-4 py-2 text-sm font-bold " + (mode === "mission" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>Mission Value</button>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-bold text-foreground">{mode === "financial" ? "Inputs" : "Score each dimension (0–10)"}</h2>
            {mode === "financial" ? (
              <div className="mt-4 space-y-4">
                <Field label="Initial investment" value={investment} onChange={setInvestment} suffix="USD" />
                <Field label="Expected annual benefit" value={annualBenefit} onChange={setAnnualBenefit} suffix="USD" />
                <Field label="Annual running cost" value={annualCost} onChange={setAnnualCost} suffix="USD" />
                <Field label="Time horizon" value={years} onChange={(n) => setYears(Math.max(1, Math.round(n)))} suffix="years" />
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <Slider label="Mission value" value={missionValue} onChange={setMissionValue} />
                <Slider label="Risk reduction" value={riskReduction} onChange={setRiskReduction} />
                <Slider label="Readiness improvement" value={readiness} onChange={setReadiness} />
                <Slider label="Response time improvement" value={responseTime} onChange={setResponseTime} />
                <Slider label="Operational resilience" value={resilience} onChange={setResilience} />
                <Slider label="Compliance improvement" value={compliance} onChange={setCompliance} />
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-[image:var(--gradient-navy)] p-6 text-white">
            <h2 className="text-sm font-bold uppercase tracking-widest text-primary">Result</h2>
            {mode === "financial" ? (
              <div className="mt-4 space-y-5">
                <div>
                  <div className="text-5xl font-black text-primary">{fin.roi.toFixed(0)}%</div>
                  <div className="text-xs uppercase tracking-widest text-white/70">Return on investment ({years}-yr)</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><div className="text-2xl font-bold">{Number.isFinite(fin.payback) ? fin.payback.toFixed(1) : "—"}</div><div className="text-xs text-white/70">Payback (years)</div></div>
                  <div><div className="text-2xl font-bold">{fmt(fin.netAnnual)}</div><div className="text-xs text-white/70">Net annual value</div></div>
                  <div className="col-span-2"><div className="text-2xl font-bold">{fmt(fin.totalNet)}</div><div className="text-xs text-white/70">{years}-yr total net value</div></div>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-5">
                <div>
                  <div className="text-5xl font-black text-primary">{missionScore}<span className="text-2xl text-white/60">/100</span></div>
                  <div className="text-xs uppercase tracking-widest text-white/70">Composite mission score</div>
                </div>
                <div className="inline-block rounded-full bg-primary/20 px-3 py-1 text-sm font-bold text-primary">{missionBand}</div>
                <p className="text-sm text-white/70">Weighted across mission value, risk reduction, readiness, response time, resilience and compliance.</p>
              </div>
            )}
            <button onClick={exportSummary} className="mt-6 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:brightness-110">
              Export summary (PDF)
            </button>
          </div>
        </div>
      </div>

      <CtaTriad />
    </article>
  );
}
