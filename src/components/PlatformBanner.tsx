import { Link } from "@tanstack/react-router";
import { Sparkles, Library, Plus, ArrowRight } from "lucide-react";

const FLOW = [
  "Discover in Repository",
  "Design in Studio",
  "Assess with SARPI",
  "Advise with AdvisorX",
  "Govern with C3G",
  "Execute & Scale",
];

export function PlatformBanner() {
  return (
    <section className="border-b border-border bg-gradient-to-br from-primary/10 via-background to-background">
      <div className="mx-auto max-w-[1280px] px-6 py-10">
        <div className="flex flex-col gap-2">
          <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
            UseCasesX™ Platform
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Global AI Use Cases Repository{" "}
            <span className="text-muted-foreground">(UseCasesX)</span>
          </h1>
          <p className="text-base text-muted-foreground">
            The AIgilityX™ platform for discovering, designing, validating, governing, and scaling AI use cases.
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-primary/30 bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                <Sparkles className="h-3 w-3" /> Flagship Module
              </div>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground">
                AIgilityX AI Use Case Studio™
              </h2>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-primary">
                Powered by UseCaseX™
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Integrated with SARPI™, AdvisorX™, and CyberX Sovereign AI C3G™.
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                Move from AI idea to boardroom-ready blueprint through guided discovery,
                feasibility scoring, data readiness, governance mapping, and portfolio
                prioritization.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/studio"
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-sm hover:brightness-110"
              >
                <Sparkles className="h-4 w-4" />
                Start AI Use Case Studio
              </Link>
              <Link
                to="/repository"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-bold text-foreground hover:bg-secondary"
              >
                <Library className="h-4 w-4" />
                Explore Repository
              </Link>
              <Link
                to="/studio"
                className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2.5 text-sm font-bold text-foreground hover:bg-primary/20"
              >
                <Plus className="h-4 w-4" />
                Create New Board
              </Link>
            </div>
          </div>

          <div className="mt-6 border-t border-border pt-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Platform flow
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
              {FLOW.map((step, i) => (
                <span key={step} className="inline-flex items-center gap-2">
                  <span className="rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground">
                    {step}
                  </span>
                  {i < FLOW.length - 1 && (
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
