/**
 * Founding Access activation hub.
 *
 * Shown on /pro to signed-in participants after onboarding. It does not
 * duplicate any workspace surface — it routes into the existing dashboard,
 * projects (use cases / opportunities), scoring and portfolio pages so a
 * newly onboarded participant knows exactly what to do next.
 */

import { Link } from "@tanstack/react-router";
import { useWorkspaceContext } from "@/hooks/useWorkspaceContext";

type Card = {
  step: string;
  title: string;
  description: string;
  to: string;
  cta: string;
};

const CARDS: Card[] = [
  {
    step: "01",
    title: "Your dashboard",
    description:
      "Activity, saved work and workspace status in one place. Start here after onboarding.",
    to: "/dashboard",
    cta: "Open dashboard",
  },
  {
    step: "02",
    title: "Projects & use cases",
    description:
      "Capture an opportunity, draft it in Studio, and track everything you own in My Use Cases.",
    to: "/my-use-cases",
    cta: "Open my use cases",
  },
  {
    step: "03",
    title: "Scoring",
    description:
      "Score on strategic fit, value, feasibility, risk, readiness and time-to-value to get a composite score.",
    to: "/feasibility",
    cta: "Open scoring",
  },
  {
    step: "04",
    title: "Portfolio & roadmap",
    description:
      "Group scored use cases into a prioritized portfolio and sequence them on the roadmap.",
    to: "/portfoliox",
    cta: "Open portfolio",
  },
];

export function ProActivationHub() {
  const { data: context, isLoading } = useWorkspaceContext();
  const workspaceName = context?.workspace?.name ?? null;
  const organizationName = context?.organization?.name ?? null;
  const needsOnboarding = !isLoading && !context?.workspace;

  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-[1180px] px-6 py-16">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
          Founding Access · Pro workspace
        </div>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Activate your <span className="text-primary">Pro workspace</span>
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          {workspaceName
            ? `You're working in ${workspaceName}${organizationName ? ` · ${organizationName}` : ""}. Follow the four steps below to go from a saved use case to a board-ready portfolio.`
            : "Follow the four steps below to go from a saved use case to a board-ready portfolio."}
        </p>

        {needsOnboarding ? (
          <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-5">
            <div className="text-sm font-bold text-foreground">Finish onboarding first</div>
            <p className="mt-1 text-sm text-muted-foreground">
              We still need your organization, role and sector to provision your Pro workspace.
            </p>
            <Link
              to="/onboarding"
              className="mt-3 inline-block rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110"
            >
              Complete onboarding →
            </Link>
          </div>
        ) : null}

        <ol className="mt-10 grid gap-4 sm:grid-cols-2">
          {CARDS.map((card) => (
            <li
              key={card.step}
              className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]"
            >
              <span className="text-[10px] font-bold tracking-widest text-primary">
                STEP {card.step}
              </span>
              <h2 className="mt-2 text-lg font-bold text-foreground">{card.title}</h2>
              <p className="mt-1 flex-1 text-sm leading-relaxed text-muted-foreground">
                {card.description}
              </p>
              <Link
                to={card.to}
                className="mt-4 inline-block self-start rounded-lg border border-primary/50 px-4 py-2 text-sm font-bold text-primary hover:bg-primary/10"
              >
                {card.cta} →
              </Link>
            </li>
          ))}
        </ol>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/repository"
            className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            Browse the repository
          </Link>
          <Link
            to="/opportunities/new"
            className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            Capture an opportunity
          </Link>
          <Link
            to="/roadmap"
            className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            Open roadmap
          </Link>
        </div>
      </div>
    </section>
  );
}
