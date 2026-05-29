import { Link } from "@tanstack/react-router";
import { CTAButtonGroup } from "./CTAButtonGroup";

export function UseCaseXHero({ stats }: { stats?: { useCases: number; industries: number; aiTypes: number; objectives: number } }) {
  return (
    <section className="relative overflow-hidden border-b border-border bg-background">
      {/* Soft cyan ambient gradient */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-[420px] w-[820px] -translate-x-1/2 rounded-full opacity-50 blur-3xl"
          style={{ background: "radial-gradient(closest-side, oklch(0.78 0.13 215 / 0.35), transparent 70%)" }} />
        <div className="absolute -bottom-40 right-0 h-[380px] w-[640px] rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(closest-side, oklch(0.55 0.22 258 / 0.18), transparent 70%)" }} />
      </div>

      <div className="relative mx-auto max-w-[1400px] px-6 pb-20 pt-20 sm:pt-28">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          UseCaseX™ · Global AI Use Cases Repository
        </div>
        <h1 className="max-w-5xl text-[44px] font-bold leading-[1.05] tracking-tight text-foreground sm:text-6xl">
          Explore <span className="text-primary">1000+ AI Use Cases</span> for your industry.
        </h1>
        <p className="mt-5 max-w-3xl text-lg text-muted-foreground sm:text-xl">
          Find what to <span className="font-semibold text-foreground">automate</span>,{" "}
          <span className="font-semibold text-foreground">govern</span>, and{" "}
          <span className="font-semibold text-foreground">scale</span> next — across{" "}
          18+ industries, 20+ AI types and 17+ business objectives. Built by{" "}
          <span className="font-semibold text-foreground">AIgilityX — the Sovereign AI Ecosystems.</span>
        </p>

        <div className="mt-8">
          <CTAButtonGroup ctas={[
            { label: "Explore the Repository →", to: "/ai-hub/usecasex/explore" },
            { label: "Get Pro — Free", to: "/ai-hub/usecasex/pro", variant: "secondary" },
            { label: "API Integration ↗", to: "/ai-hub/usecasex/api-integration-preview", variant: "ghost" },
          ]} />
        </div>

        {stats && (
          <div className="mt-12 grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { v: stats.useCases.toLocaleString(), l: "AI Use Cases" },
              { v: `${stats.industries}+`, l: "Industries" },
              { v: `${stats.aiTypes}+`, l: "AI Types" },
              { v: `${stats.objectives}+`, l: "Objectives" },
            ].map((s) => (
              <div key={s.l} className="rounded-xl border border-border bg-card px-5 py-4 shadow-[var(--shadow-card)]">
                <div className="font-mono text-2xl font-bold text-foreground">{s.v}</div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{s.l}</div>
              </div>
            ))}
          </div>
        )}

        <p className="mt-8 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Trusted across <Link to="/ai-hub" className="text-foreground hover:text-primary">Banking · Public Sector · Healthcare · Energy · Defense · Telecom</Link>
        </p>
      </div>
    </section>
  );
}
