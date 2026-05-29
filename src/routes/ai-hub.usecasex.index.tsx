import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { listUseCases, listTaxonomies } from "@/lib/use-cases.functions";
import { UseCaseXHero } from "@/components/UseCaseXHero";
import { IndustryFocusedSection } from "@/components/IndustryFocusedSection";
import { UseCaseCard } from "@/components/UseCaseCard";
import { PARTNER_PLATFORMS } from "@/lib/usecasex.data";
import { PlatformBadge } from "@/components/PlatformBadge";
import { Link } from "@tanstack/react-router";
import { CTAButtonGroup } from "@/components/CTAButtonGroup";

const taxQ = queryOptions({ queryKey: ["taxonomies"], queryFn: () => listTaxonomies(), staleTime: 5*60*1000 });
const featQ = queryOptions({
  queryKey: ["use-cases", "featured-hub"],
  queryFn: () => listUseCases({ data: { q: "", industries: [], capabilities: [], businessFunctions: [], objectives: [], maturity: [], valuePotential: [], complexity: [], riskLevel: [], timeToValue: [], sort: "featured", featuredOnly: true, limit: 6 } }),
  staleTime: 5*60*1000,
});
const allQ = queryOptions({
  queryKey: ["use-cases", "count-hub"],
  queryFn: () => listUseCases({ data: { q: "", industries: [], capabilities: [], businessFunctions: [], objectives: [], maturity: [], valuePotential: [], complexity: [], riskLevel: [], timeToValue: [], sort: "recent", limit: 120 } }),
  staleTime: 5*60*1000,
});

export const Route = createFileRoute("/ai-hub/usecasex/")({
  head: () => ({
    meta: [
      { title: "UseCaseX™ — Explore 1000+ AI Use Cases for Your Industry" },
      { name: "description", content: "Find what to automate, govern, and scale next — 1000+ AI use cases across 18+ industries, 20+ AI types and 17+ business objectives." },
      { property: "og:title", content: "UseCaseX™ — Global AI Use Cases Repository" },
      { property: "og:description", content: "Built by AIgilityX — the Sovereign AI Ecosystems." },
    ],
  }),
  loader: ({ context }) => Promise.all([
    context.queryClient.ensureQueryData(taxQ),
    context.queryClient.ensureQueryData(featQ),
    context.queryClient.ensureQueryData(allQ),
  ]),
  component: Page,
  errorComponent: ({ error }) => <div className="p-12 text-center text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-12 text-center">Not found</div>,
});

function Page() {
  const { data: tax } = useSuspenseQuery(taxQ);
  const { data: featured } = useSuspenseQuery(featQ);
  const { data: all } = useSuspenseQuery(allQ);

  return (
    <>
      <UseCaseXHero stats={{ useCases: Math.max(all.total, 1000), industries: Math.max(tax.industries.length, 18), aiTypes: Math.max(tax.capabilities.length, 20), objectives: Math.max(tax.objectives.length, 17) }} />
      <IndustryFocusedSection />

      {/* Featured */}
      <section className="border-b border-border bg-background">
        <div className="mx-auto max-w-[1400px] px-6 py-16">
          <div className="flex items-end justify-between gap-4">
            <div className="max-w-2xl">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Featured</div>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">High-impact use cases right now</h2>
              <p className="mt-2 text-muted-foreground">A curated cross-section from across the repository.</p>
            </div>
            <Link to="/ai-hub/usecasex/explore" className="text-[11px] font-bold uppercase tracking-widest text-primary hover:underline">See all →</Link>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.cases.slice(0, 6).map((c) => <UseCaseCard key={c.id} c={c} />)}
          </div>
        </div>
      </section>

      {/* Free vs Pro */}
      <section className="border-b border-border bg-secondary/40">
        <div className="mx-auto max-w-[1400px] px-6 py-16">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Two ways to use UseCaseX™</div>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Free / Lite — or Pro (also free with registration)</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <Tier name="Free / Lite" tag="No login required" features={[
              "Browse, search and filter 1000+ use cases",
              "View full use case detail",
              "Submit lead forms",
              "Download Lite PDF after lead capture",
            ]} cta={{ label: "Explore the Repository →", to: "/ai-hub/usecasex/explore" }} />
            <Tier name="Pro" tag="Free with registration" highlight features={[
              "Save use cases to your private workspace",
              "Score use cases with the AIgilityX engine",
              "Build AI Opportunity Portfolios",
              "Generate Pro reports & dashboards",
            ]} cta={{ label: "Get Pro — Free", to: "/ai-hub/usecasex/pro" }} />
          </div>
        </div>
      </section>

      {/* Integration extension */}
      <section className="border-b border-border bg-background">
        <div className="mx-auto max-w-[1400px] px-6 py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Sovereign AI Ecosystems</div>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">API-ready for the full AIgilityX platform.</h2>
              <p className="mt-2 text-muted-foreground">UseCaseX™ data flows into SARPI™, CyberX C3G™, AdvisorX™ and 10+ other platforms via a stable API + integration-event contract.</p>
            </div>
            <Link to="/ai-hub/usecasex/api-integration-preview" className="text-[11px] font-bold uppercase tracking-widest text-primary hover:underline">See the API preview →</Link>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {PARTNER_PLATFORMS.map((p) => <PlatformBadge key={p.slug} name={p.name} category={p.category} color={p.color as "navy"|"blue"|"cyan"} />)}
          </div>
        </div>
      </section>
    </>
  );
}

function Tier({ name, tag, features, cta, highlight }: { name: string; tag: string; features: string[]; cta: { label: string; to: string }; highlight?: boolean }) {
  return (
    <div className={"rounded-2xl border p-7 shadow-[var(--shadow-card)] " + (highlight ? "border-primary/30 bg-primary/5" : "border-border bg-card")}>
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-foreground">{name}</h3>
        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-foreground">{tag}</span>
      </div>
      <ul className="mt-5 space-y-2.5 text-sm text-foreground/90">
        {features.map((f) => (
          <li key={f} className="flex gap-2"><span className="mt-0.5 text-primary">✓</span><span>{f}</span></li>
        ))}
      </ul>
      <div className="mt-6">
        <CTAButtonGroup ctas={[{ label: cta.label, to: cta.to, variant: highlight ? "primary" : "secondary" }]} />
      </div>
    </div>
  );
}
