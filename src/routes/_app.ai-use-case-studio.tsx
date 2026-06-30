import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sparkles, Lightbulb, Gauge, Database, Hammer, Rocket, Shield, Plus, FolderOpen, BookOpen,
  ArrowRight, CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/_app/ai-use-case-studio")({
  head: () => ({
    meta: [
      { title: "AIgilityX AI Use Case Studio™ — UseCasesX" },
      {
        name: "description",
        content:
          "A guided strategy workspace to move from AI ambition to validated, governed, fundable, and executable AI use cases.",
      },
    ],
  }),
  component: AIUseCaseStudioPage,
});

const FEATURES = [
  {
    icon: Lightbulb,
    title: "Discover AI Opportunities",
    desc: "Convert business pain points into AI use case ideas using guided prompts and pattern matching.",
  },
  {
    icon: Gauge,
    title: "Validate Feasibility",
    desc: "Score use cases across desirability, viability, feasibility, governability, and sustainability.",
  },
  {
    icon: Database,
    title: "Assess Data Readiness",
    desc: "Map required data sources, ownership, quality, privacy sensitivity, and readiness gaps.",
  },
  {
    icon: Hammer,
    title: "Build AI Use Case Blueprint",
    desc: "Generate structured AI use case blueprints with problem, users, data, model type, KPIs, risks, controls, and MVP scope.",
  },
  {
    icon: Rocket,
    title: "Connect with SARPI",
    desc: "Send selected use cases to SARPI for AI readiness, ROI, performance, and value assessment.",
  },
  {
    icon: Shield,
    title: "Govern with C3G",
    desc: "Connect use cases to CyberX Sovereign AI C3G for AI governance, risk, compliance, approval, and audit readiness.",
  },
];

const STATS = [
  { value: "1000+", label: "AI use case patterns" },
  { value: "18+", label: "Industries covered" },
  { value: "5", label: "Validation lenses" },
  { value: "3", label: "Governance modules" },
];

const STEPS = [
  { n: "1", title: "Describe your ambition", desc: "Bring a business problem or pick from 1000+ proven patterns." },
  { n: "2", title: "Validate & score", desc: "Test feasibility, data readiness, value and risk in minutes." },
  { n: "3", title: "Govern & fund", desc: "Generate a board-ready blueprint with built-in governance." },
  { n: "4", title: "Execute with confidence", desc: "Hand off an executable, defensible AI use case roadmap." },
];

const BENEFITS = [
  "No more stalled AI pilots — validate before you invest",
  "Board-ready blueprints in hours, not weeks",
  "Governance, risk and compliance built in from day one",
  "Reusable pattern library across every industry",
];

function AIUseCaseStudioPage() {
  return (
    <>
      <section className="border-b border-border bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="mx-auto max-w-[1280px] px-6 py-12">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
            <Sparkles className="h-3 w-3" /> Flagship Module
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            AIgilityX AI Use Case Studio™
          </h1>
          <p className="mt-2 text-sm font-medium text-muted-foreground">
            Powered by UseCaseX™ &nbsp;|&nbsp; Integrated with SARPI™, AdvisorX™, and CyberX Sovereign AI C3G™
          </p>
          <p className="mt-5 max-w-3xl text-base text-muted-foreground">
            A guided strategy workspace to help organizations and governments move
            from AI ambition to validated, governed, fundable, and executable AI use cases.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              to="/auth"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-sm hover:brightness-110"
            >
              Get started free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/studio"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-bold text-foreground hover:bg-secondary"
            >
              <Plus className="h-4 w-4" /> Start New AI Use Case
            </Link>
            <Link
              to="/boards"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-bold text-foreground hover:bg-secondary"
            >
              <FolderOpen className="h-4 w-4" /> Open Existing Board
            </Link>
            <Link
              to="/patterns"
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2.5 text-sm font-bold text-foreground hover:bg-primary/20"
            >
              <BookOpen className="h-4 w-4" /> Explore Pattern Library
            </Link>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-card/60 p-4 text-center">
                <div className="text-2xl font-bold text-primary">{s.value}</div>
                <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-background">
        <div className="mx-auto max-w-[1280px] px-6 py-12">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Studio capabilities
          </h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <article
                  key={f.title}
                  className="group rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/40"
                >
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/30">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold tracking-tight text-foreground">
                    {f.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-card/30">
        <div className="mx-auto max-w-[1280px] px-6 py-12">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">How it works</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl border border-border bg-background p-6">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {s.n}
                </div>
                <h3 className="mt-4 text-base font-bold text-foreground">{s.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-background">
        <div className="mx-auto max-w-[1280px] px-6 py-14">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Why teams choose the AI Use Case Studio
              </h2>
              <ul className="mt-6 space-y-3">
                {BENEFITS.map((b) => (
                  <li key={b} className="flex items-start gap-3 text-sm text-foreground">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-background p-8 text-center">
              <Sparkles className="mx-auto h-8 w-8 text-primary" />
              <h3 className="mt-4 text-xl font-bold text-foreground">Turn AI ambition into funded reality</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Create your free account and build your first validated, governance-ready AI use case today.
              </p>
              <Link
                to="/auth"
                className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-sm hover:brightness-110"
              >
                Sign up free <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="mt-3 text-xs text-muted-foreground">No credit card required.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
