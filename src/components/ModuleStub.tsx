import { Link } from "@tanstack/react-router";
import { PageHero } from "@/components/usecasex/PageHero";

interface ModuleStubProps {
  badge: string;
  title: string;
  description: string;
  comingSoonNote?: string;
  features?: string[];
}

/**
 * Generic stub page for the new UseCasesX lifecycle modules
 * (FeasibilityX, DataReadinessX, BlueprintX, PortfolioX, RoadmapX,
 * ImpactAssessmentX, GovernanceX, DecisionX). Each module owns a
 * dedicated route and will receive its full implementation in a
 * follow-up release.
 */
export function ModuleStub({
  badge,
  title,
  description,
  comingSoonNote,
  features,
}: ModuleStubProps) {
  return (
    <>
      <PageHero tone="dark" eyebrow={badge} title={title} description={description} />
      <section className="border-b border-border bg-secondary/40">
        <div className="mx-auto max-w-[1100px] px-6 py-14">
          {features && features.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {features.map((f) => (
                <div
                  key={f}
                  className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
                >
                  <div className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                    ✓
                  </div>
                  <p className="text-sm text-foreground">{f}</p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-12 rounded-2xl border border-primary/20 bg-primary/5 p-6">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
              Coming soon
            </div>
            <p className="mt-2 text-sm text-foreground">
              {comingSoonNote ??
                `The full ${title} workflow will be connected in an upcoming release. Until then, you can scope use cases in the Global Repository and develop drafts in the AI Use Case Studio.`}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                to="/repository"
                className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:brightness-110"
              >
                Open Global Repository
              </Link>
              <Link
                to="/studio"
                className="rounded-md border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary"
              >
                Open AI Use Case Studio
              </Link>
              <Link
                to="/dashboard"
                className="rounded-md border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
