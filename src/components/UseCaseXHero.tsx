import { Link } from "@tanstack/react-router";
import heroVideoAsset from "@/assets/hero-bg.mp4.asset.json";
import { CTAButtonGroup } from "./CTAButtonGroup";

const HERO_VIDEO = (heroVideoAsset as { url: string }).url;

interface HeroStats {
  useCases: number;
  industries: number;
  businessFunctions: number;
}

export function UseCaseXHero({ stats, onRequestStrategy }: { stats?: HeroStats; onRequestStrategy?: () => void }) {
  return (
    <section className="relative overflow-hidden border-b border-border surface-dark">
      <video
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-40"
        src={HERO_VIDEO}
        autoPlay
        muted
        loop
        playsInline
        aria-hidden
      />
      <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(180deg, oklch(0.18 0.05 258 / 0.85) 0%, oklch(0.18 0.05 258 / 0.78) 60%, oklch(0.18 0.05 258 / 0.92) 100%)" }} />
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-[420px] w-[820px] -translate-x-1/2 rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(closest-side, oklch(0.78 0.13 215 / 0.55), transparent 70%)" }} />
        <div className="absolute -bottom-40 right-0 h-[380px] w-[640px] rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(closest-side, oklch(0.55 0.22 258 / 0.45), transparent 70%)" }} />
      </div>

      <div className="relative mx-auto max-w-[1400px] px-6 pb-24 pt-20 sm:pt-28">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[oklch(0.85_0.12_215)] backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.78_0.13_215)]" />
          UseCasesX™ · Global AI Use Cases Repository
        </div>
        <h1 className="max-w-5xl text-[44px] font-bold leading-[1.05] tracking-tight text-white sm:text-6xl">
          Explore <span className="text-[oklch(0.85_0.13_215)]">1000+ AI Use Cases</span> for your industry.
        </h1>
        <p className="mt-5 max-w-3xl text-lg text-white/80 sm:text-xl">
          Find what to <span className="font-semibold text-white">automate</span>,{" "}
          <span className="font-semibold text-white">govern</span>, and{" "}
          <span className="font-semibold text-white">scale</span> next — across{" "}
          18+ industries, 20+ AI types and 17+ business objectives. Built by{" "}
          <span className="font-semibold text-white">AIgilityX — the Sovereign AI Ecosystems.</span>
        </p>
        <p className="mt-4 max-w-3xl text-base text-white/70 sm:text-lg">
          Discover practical AI, GenAI, Agentic AI, and automation use cases across industries and business functions.
          Compare value potential, complexity, risk, readiness, and ROI pathways — then move from idea to execution with AIgilityX.
        </p>

        <div className="mt-8">
          <CTAButtonGroup ctas={[
            { label: "Explore AI Use Cases →", to: "/repository" },
            { label: "Create Free Pro Account", to: "/pro", variant: "secondary" },
            { label: "Request AI Strategy Session ↗", onClick: onRequestStrategy, variant: "ghost" },
          ]} />
        </div>

        {stats && (
          <div className="mt-12 grid max-w-5xl grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { v: `${stats.useCases.toLocaleString()}+`, l: "AI Use Cases" },
              { v: `${stats.industries}+`, l: "Industries" },
              { v: `${stats.businessFunctions}+`, l: "Business Functions" },
              { v: "Free", l: "Pro Access" },
              { v: "API-Ready", l: "Ecosystem Layer" },
            ].map((s) => (
              <div key={s.l} className="rounded-xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur">
                <div className="font-mono text-xl font-bold text-white sm:text-2xl">{s.v}</div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">{s.l}</div>
              </div>
            ))}
          </div>
        )}

        <p className="mt-8 text-[11px] uppercase tracking-[0.18em] text-white/55">
          Trusted across <Link to="/" className="text-white hover:text-[oklch(0.85_0.13_215)]">Banking · Public Sector · Healthcare · Energy · Defense · Telecom</Link>
        </p>
      </div>
    </section>
  );
}
