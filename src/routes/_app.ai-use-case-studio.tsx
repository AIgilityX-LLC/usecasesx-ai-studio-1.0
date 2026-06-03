import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sparkles, Lightbulb, Gauge, Database, Hammer, Rocket, Shield, Plus, FolderOpen, BookOpen,
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
              to="/studio"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-sm hover:brightness-110"
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
    </>
  );
}
