import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero } from "@/components/usecasex/PageHero";

export const Route = createFileRoute("/_app/resources")({
  head: () => ({
    meta: [
      { title: "Resources — UseCasesX™" },
      {
        name: "description",
        content:
          "Guides, frameworks, and references for discovering, designing, and governing enterprise and government AI use cases with UseCasesX™.",
      },
      { property: "og:title", content: "Resources — UseCasesX™" },
      {
        property: "og:description",
        content:
          "Guides, frameworks, and references for AI use case discovery, feasibility, governance, and value realization.",
      },
    ],
  }),
  component: ResourcesPage,
});

const RESOURCE_GROUPS: {
  tone: "dark" | "light";
  title: string;
  blurb: string;
  links: { l: string; to: string; d: string }[];
}[] = [
  {
    tone: "light",
    title: "Discover & explore",
    blurb: "Browse the global repository and curate boards for your teams.",
    links: [
      { l: "Global Repository", to: "/repository", d: "180+ governed AI use cases across 18 industries." },
      { l: "Pattern Library", to: "/patterns", d: "Reusable AI solution patterns and taxonomy." },
      { l: "Compare Use Cases", to: "/compare", d: "Side-by-side outcomes, risk, and evidence." },
      { l: "Use Case Boards", to: "/boards", d: "Build and share curated collections." },
    ],
  },
  {
    tone: "dark",
    title: "Design & validate",
    blurb: "Take a use case from idea to a validated, fundable blueprint.",
    links: [
      { l: "AI Use Case Studio™", to: "/ai-use-case-studio", d: "Powered by UseCaseX™ design workflow." },
      { l: "FeasibilityX™", to: "/feasibility", d: "Score feasibility and readiness." },
      { l: "DataReadinessX™", to: "/data-readiness", d: "Assess data inputs and quality." },
      { l: "Deployment Intelligence", to: "/insights", d: "Benchmarks and deployment signals." },
    ],
  },
  {
    tone: "light",
    title: "Govern & scale",
    blurb: "Apply governance-first controls and plan your portfolio.",
    links: [
      { l: "GovernanceX™", to: "/governance", d: "Risk classification and controls." },
      { l: "PortfolioX™", to: "/portfoliox", d: "Prioritize value vs feasibility." },
      { l: "RoadmapX™", to: "/roadmap", d: "Sequence delivery across horizons." },
      { l: "Pricing & Plans", to: "/pricing", d: "Lite, Pro, and Enterprise tiers." },
    ],
  },
];

function ResourcesPage() {
  return (
    <div>
      <PageHero
        tone="dark"
        eyebrow="Resources"
        title="Everything you need to operationalize AI use cases"
        description="Curated guides and entry points across discovery, design, validation, governance, and scale — all powered by UseCasesX™."
        actions={
          <>
            <Link
              to="/repository"
              className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:brightness-110"
            >
              Explore the repository
            </Link>
            <Link
              to="/ai-use-case-studio"
              className="rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary"
            >
              Open the Studio
            </Link>
          </>
        }
      />

      {RESOURCE_GROUPS.map((group) => (
        <section
          key={group.title}
          className={
            group.tone === "dark"
              ? "dark border-b border-border bg-background text-foreground"
              : "border-b border-border bg-secondary/30 text-foreground"
          }
        >
          <div className="mx-auto w-full max-w-[1200px] px-6 py-12 md:py-16">
            <h2 className="text-2xl font-bold tracking-tight">{group.title}</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{group.blurb}</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {group.links.map((item) => (
                <Link
                  key={item.to}
                  to={item.to as never}
                  className="group rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="text-sm font-bold text-foreground group-hover:text-primary">
                    {item.l}
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">{item.d}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
