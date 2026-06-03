import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { CTAButtonGroup } from "@/components/CTAButtonGroup";
import { HUB_MODULES } from "@/lib/usecasex.data";

export const Route = createFileRoute("/ai-hub/")({
  head: () => ({
    meta: [
      { title: "AIgilityX AI Hub — Sovereign AI Ecosystems" },
      { name: "description", content: "The AIgilityX AI Hub — explore UseCasesX™, AI Readiness, AI ROI Calculator, AI Strategy Canvas, AI Governance Toolkit and more." },
      { property: "og:title", content: "AIgilityX AI Hub" },
      { property: "og:description", content: "Sovereign AI Ecosystems — discover what to automate, govern and scale next." },
    ],
  }),
  component: HubHome,
});

function HubHome() {
  return (
    <AppShell>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border bg-background">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 left-1/2 h-[460px] w-[900px] -translate-x-1/2 rounded-full opacity-60 blur-3xl"
            style={{ background: "radial-gradient(closest-side, oklch(0.78 0.13 215 / 0.32), transparent 70%)" }} />
        </div>
        <div className="relative mx-auto max-w-[1400px] px-6 pb-20 pt-24">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
            AIgilityX · AI Hub
          </div>
          <h1 className="max-w-4xl text-[44px] font-bold leading-[1.05] tracking-tight text-foreground sm:text-6xl">
            One <span className="text-primary">Sovereign AI</span> hub for executives, public sector leaders, and AI teams.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            Discover what to automate, govern, and scale next — across UseCasesX™, AI Readiness, AI ROI, Strategy Canvas, Governance and more.
          </p>
          <div className="mt-8">
            <CTAButtonGroup ctas={[
              { label: "Open UseCasesX™ →", to: "/ai-hub/usecasex" },
              { label: "Get Pro — Free", to: "/ai-hub/usecasex/pro", variant: "secondary" },
            ]} />
          </div>
        </div>
      </section>

      {/* MODULES */}
      <section className="border-b border-border bg-secondary/40">
        <div className="mx-auto max-w-[1400px] px-6 py-16">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Modules</div>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">The AIgilityX AI Hub at a glance</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {HUB_MODULES.filter((m) => m.slug !== "home").map((m) => (
              <Link
                key={m.slug}
                to={m.to}
                className="group flex h-full flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--shadow-elegant)]"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-foreground group-hover:text-primary">{m.name}</h3>
                    {!m.live && <span className="rounded bg-secondary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Soon</span>}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {m.slug === "usecasex" && "1000+ AI use cases. Filter, score, shortlist."}
                    {m.slug === "ai-readiness" && "Assess your organization's AI readiness across 8 dimensions."}
                    {m.slug === "roi-calculator" && "Quantify the business case for any AI initiative."}
                    {m.slug === "strategy-canvas" && "One-page AI strategy across vision, value, data, risk."}
                    {m.slug === "governance" && "Policies, controls, and AI governance frameworks."}
                    {m.slug === "reports" && "Board-ready exports across the AI portfolio."}
                    {m.slug === "dashboard" && "KPI tiles, scoring, and portfolio analytics."}
                  </p>
                </div>
                <div className="mt-5 text-[10px] font-bold uppercase tracking-widest text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  {m.live ? "Open →" : "Preview →"}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-b border-border bg-background">
        <div className="mx-auto max-w-[1400px] px-6 py-16">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-10">
            <div className="grid items-center gap-8 md:grid-cols-3">
              <div className="md:col-span-2">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">UseCasesX™ · Free / Lite + Pro</div>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Start with the Global AI Use Cases Repository.
                </h2>
                <p className="mt-2 max-w-2xl text-muted-foreground">
                  Browse 1000+ use cases for free. Sign up for Pro (free) to save, score, and build AI opportunity portfolios.
                </p>
              </div>
              <div className="flex flex-col gap-3 md:items-end">
                <Link to="/ai-hub/usecasex" className="rounded-md bg-primary px-5 py-3 text-center text-sm font-bold text-primary-foreground hover:brightness-110">Open UseCasesX™ →</Link>
                <Link to="/ai-hub/usecasex/pro" className="text-center text-sm font-semibold text-muted-foreground hover:text-foreground">Get Pro — Free</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
