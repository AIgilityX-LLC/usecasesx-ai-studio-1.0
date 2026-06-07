import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  useSavedUseCases, useUseCaseScores, usePortfolios, useGeneratedReports,
  type SavedUseCase, type UseCaseScore,
} from "@/hooks/usecasex-dashboard";
import { Can } from "@/components/Can";

interface Props {
  profile?: { full_name?: string | null; industry?: string | null; main_ai_interest?: string | null } | null;
}

export function ProDashboard({ profile }: Props) {
  const saved = useSavedUseCases();
  const scores = useUseCaseScores();
  const portfolios = usePortfolios();
  const reports = useGeneratedReports();

  const scoreById = useMemo(
    () => new Map(scores.map((s) => [s.useCaseId, s])),
    [scores],
  );

  const avgScore = scores.length
    ? Math.round(scores.reduce((a, s) => a + s.total, 0) / scores.length)
    : 0;

  const quickWins = saved.filter((u) =>
    u.valuePotential === "High" && u.complexity !== "High" && u.timeToValue === "Short",
  );
  const strategic = saved.filter((u) => u.valuePotential === "High" && u.complexity === "High");
  const highRisk = saved.filter((u) => u.riskLevel === "Critical" || u.riskLevel === "High");
  const roiReady = saved.filter((u) =>
    u.valuePotential === "High" && (u.maturity === "Advanced" || u.maturity === "Intermediate"),
  );
  const readinessNeeded = saved.filter((u) => u.maturity === "Beginner");
  const highPriority = saved.filter((u) => u.priority === "High");

  const tiles = [
    { t: "Saved use cases", v: saved.length, d: "Across your workspace" },
    { t: "Average score", v: `${avgScore}/100`, d: "AIgilityX composite" },
    { t: "High-priority", v: highPriority.length, d: "Flagged as priority" },
    { t: "High-risk", v: highRisk.length, d: "Critical or high risk" },
    { t: "Quick wins", v: quickWins.length, d: "Short TTV · high value" },
    { t: "Reports generated", v: reports.length, d: "Executive & portfolio PDFs" },
  ];

  const nextActions = buildNextActions({ saved, scores, roiReady, highRisk, readinessNeeded });

  return (
    <div className="space-y-10">
      {/* 1. Welcome */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
            UseCasesX™ Pro · Dashboard
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Welcome{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}.
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {profile?.industry ? `Industry: ${profile.industry}` : "Set your industry in profile."}
            {profile?.main_ai_interest ? ` · Focus: ${profile.main_ai_interest}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/studio"
            className="rounded-lg border border-primary/40 bg-primary/10 px-4 py-2.5 text-sm font-bold text-foreground hover:bg-primary/20">
            ✨ Open Studio
          </Link>
          <Link to="/repository"
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110">
            Explore use cases →
          </Link>
        </div>
      </header>

      {/* 2. Tiles */}
      <section aria-label="Summary" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {tiles.map((t) => (
          <div key={t.t} className="rounded-xl border border-border bg-card p-5">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t.t}</div>
            <div className="mt-2 text-3xl font-bold text-foreground">{t.v}</div>
            <p className="mt-1 text-xs text-muted-foreground">{t.d}</p>
          </div>
        ))}
      </section>

      {/* 3. Charts */}
      <section className="grid gap-6 lg:grid-cols-2">
        <BarCard title="Use cases by industry" data={countBy(saved, (u) => u.industry.name)} />
        <BarCard title="Use cases by function"  data={countBy(saved, (u) => u.businessFunction)} />
        <BarCard title="Use cases by risk level" data={countBy(saved, (u) => u.riskLevel)} accent="risk" />
        <BarCard title="Use cases by value potential" data={countBy(saved, (u) => u.valuePotential)} />
        <BarCard title="Score distribution" data={scoreBuckets(scores)} accent="score" className="lg:col-span-2" />
      </section>

      {/* 4. Portfolio + Buckets */}
      <section className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-bold text-foreground">AI Opportunity Portfolios</h2>
          <p className="mt-1 text-sm text-muted-foreground">Themed groupings of your saved use cases.</p>
          <ul className="mt-4 divide-y divide-border">
            {portfolios.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-semibold text-foreground">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.objective} · {p.useCaseIds.length} use cases</div>
                </div>
                <button className="rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-secondary">
                  Open
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-bold text-foreground">Recommended next actions</h2>
          <ul className="mt-4 space-y-3">
            {nextActions.map((a) => (
              <li key={a.label} className="flex items-start gap-3 rounded-xl border border-border bg-background p-3">
                <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                  {a.icon}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-foreground">{a.label}</div>
                  <p className="text-xs text-muted-foreground">{a.reason}</p>
                </div>
                <Link to={a.to as "/repository"}
                  className="self-center rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-secondary">
                  Open
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 5. Buckets */}
      <section className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <BucketCard title="Quick wins" hint="Short TTV · high value · manageable complexity" items={quickWins} scoreById={scoreById} />
        <BucketCard title="Strategic opportunities" hint="High value · high complexity" items={strategic} scoreById={scoreById} />
        <BucketCard title="High-risk use cases" hint="Send through CyberX & governance" items={highRisk} scoreById={scoreById} tone="danger" />
        <BucketCard title="ROI-ready use cases" hint="Mature enough to monetize" items={roiReady} scoreById={scoreById} tone="success" />
        <BucketCard title="Readiness-needed" hint="Send to SARPI / AI Readiness" items={readinessNeeded} scoreById={scoreById} tone="warn" />
        <BucketCard title="High-priority" hint="Flagged in your portfolio" items={highPriority} scoreById={scoreById} tone="primary" />
      </section>

      {/* 6. Reports + Ecosystem */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Reports</h2>
            <button className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:brightness-110">
              Generate new report
            </button>
          </div>
          <ul className="mt-4 divide-y divide-border">
            {reports.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-semibold text-foreground">{r.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.kind} · {new Date(r.createdAt).toLocaleDateString()} · {r.useCaseCount} cases
                  </div>
                </div>
                <button className="rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-secondary">
                  Download
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-bold text-foreground">AIgilityX Ecosystem</h2>
          <p className="mt-1 text-sm text-muted-foreground">Trigger the next platform in your journey.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              { t: "SARPI", d: "Track maturity & performance" },
              { t: "CyberX", d: "Govern AI risks" },
              { t: "AdvisorX", d: "Strategic decisions" },
              { t: "FlowX", d: "Execute workflows" },
              { t: "PrivacyX", d: "Data protection review" },
              { t: "AssureX", d: "Validate trust & assurance" },
            ].map((p) => (
              <button key={p.t}
                className="rounded-xl border border-border bg-background p-3 text-left hover:bg-secondary">
                <div className="text-sm font-semibold text-foreground">{p.t}</div>
                <div className="text-xs text-muted-foreground">{p.d}</div>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

// --- Helpers -----------------------------------------------------------
function countBy<T>(items: T[], key: (t: T) => string): Array<{ label: string; value: number }> {
  const m = new Map<string, number>();
  for (const i of items) m.set(key(i), (m.get(key(i)) ?? 0) + 1);
  return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

function scoreBuckets(scores: UseCaseScore[]) {
  const buckets = [
    { label: "0–40", value: 0 }, { label: "41–60", value: 0 },
    { label: "61–75", value: 0 }, { label: "76–100", value: 0 },
  ];
  for (const s of scores) {
    if (s.total <= 40) buckets[0].value++;
    else if (s.total <= 60) buckets[1].value++;
    else if (s.total <= 75) buckets[2].value++;
    else buckets[3].value++;
  }
  return buckets;
}

function BarCard({
  title, data, accent = "default", className = "",
}: {
  title: string;
  data: Array<{ label: string; value: number }>;
  accent?: "default" | "risk" | "score";
  className?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const colorFor = (label: string) => {
    if (accent === "risk") {
      return label === "Critical" ? "bg-destructive"
        : label === "High" ? "bg-orange-500"
        : label === "Medium" ? "bg-amber-500"
        : "bg-emerald-500";
    }
    if (accent === "score") {
      return label.startsWith("0") ? "bg-destructive"
        : label.startsWith("41") ? "bg-amber-500"
        : label.startsWith("61") ? "bg-primary/70"
        : "bg-primary";
    }
    return "bg-primary";
  };

  return (
    <div className={`rounded-2xl border border-border bg-card p-6 ${className}`}>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {data.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No data yet.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {data.map((d) => (
            <li key={d.label} className="flex items-center gap-3 text-xs">
              <span className="w-32 shrink-0 truncate text-foreground">{d.label}</span>
              <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                <div className={`h-full ${colorFor(d.label)}`} style={{ width: `${(d.value / max) * 100}%` }} />
              </div>
              <span className="w-6 shrink-0 text-right tabular-nums text-muted-foreground">{d.value}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BucketCard({
  title, hint, items, scoreById, tone = "default",
}: {
  title: string;
  hint: string;
  items: SavedUseCase[];
  scoreById: Map<string, UseCaseScore>;
  tone?: "default" | "danger" | "warn" | "success" | "primary";
}) {
  const toneCls =
    tone === "danger" ? "border-destructive/30"
    : tone === "warn" ? "border-amber-500/40"
    : tone === "success" ? "border-emerald-500/40"
    : tone === "primary" ? "border-primary/30"
    : "border-border";

  return (
    <div className={`rounded-2xl border ${toneCls} bg-card p-6`}>
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
        <span className="text-xs text-muted-foreground">{items.length}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      {items.length === 0 ? (
        <p className="mt-4 text-xs text-muted-foreground">Nothing here yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.slice(0, 4).map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2">
              <Link
                to="/use-cases/$slug"
                params={{ slug: u.slug }}
                search={{
                  dept: u.industry.slug,
                  func: slugify(u.businessFunction),
                } as any}
                className="truncate text-xs font-semibold text-foreground hover:text-primary"
              >
                {u.title}
              </Link>
              <span className="shrink-0 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-foreground">
                {scoreById.get(u.id)?.total ?? "—"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function buildNextActions({
  saved, scores, roiReady, highRisk, readinessNeeded,
}: {
  saved: SavedUseCase[];
  scores: UseCaseScore[];
  roiReady: SavedUseCase[];
  highRisk: SavedUseCase[];
  readinessNeeded: SavedUseCase[];
}) {
  const out: Array<{ label: string; reason: string; icon: string; to: string }> = [];
  if (saved.length === 0) {
    out.push({ label: "Explore use cases", reason: "Start saving relevant AI opportunities.", icon: "→", to: "/repository" });
    return out;
  }
  if (scores.length < saved.length) {
    out.push({ label: "Score your top use cases", reason: "Some saved cases are unscored.", icon: "★", to: "/repository" });
  }
  if (roiReady.length > 0) {
    out.push({ label: "Calculate AI ROI", reason: `${roiReady.length} high-value cases are ROI-ready.`, icon: "$", to: "/repository" });
  }
  if (highRisk.length > 0) {
    out.push({ label: "Send to CyberX Governance Review", reason: `${highRisk.length} use cases flagged high/critical risk.`, icon: "!", to: "/repository" });
  }
  if (readinessNeeded.length > 0) {
    out.push({ label: "Send to SARPI / AI Readiness", reason: "Maturity is unclear for some cases.", icon: "◉", to: "/repository" });
  }
  if (saved.some((u) => /agentic/i.test(u.aiType))) {
    out.push({ label: "Design a FlowX Workflow", reason: "You have Agentic AI use cases.", icon: "⚙", to: "/repository" });
  }
  if (saved.some((u) => /decision|strategy/i.test(u.objective))) {
    out.push({ label: "Ask AdvisorX", reason: "Strategic decisions detected in your portfolio.", icon: "?", to: "/repository" });
  }
  return out;
}
