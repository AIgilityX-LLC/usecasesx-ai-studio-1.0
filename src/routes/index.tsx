import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";

import { listUseCases, listTaxonomies } from "@/lib/use-cases.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import heroVideo from "@/assets/hero-bg.mp4.asset.json";

const taxonomiesQuery = queryOptions({
  queryKey: ["taxonomies"],
  queryFn: () => listTaxonomies(),
  staleTime: 5 * 60 * 1000,
});

const landingCasesQuery = queryOptions({
  queryKey: ["use-cases", "landing"],
  queryFn: () =>
    listUseCases({
      data: {
        q: "",
        industries: [],
        capabilities: [],
        businessFunctions: [],
        objectives: [],
        maturity: [],
        valuePotential: [],
        complexity: [],
        riskLevel: [],
        timeToValue: [],
        sort: "featured",
        landingOnly: true,
        limit: 9,
      },
    }),
  staleTime: 5 * 60 * 1000,
});

const featuredCasesQuery = queryOptions({
  queryKey: ["use-cases", "featured"],
  queryFn: () =>
    listUseCases({
      data: {
        q: "",
        industries: [],
        capabilities: [],
        businessFunctions: [],
        objectives: [],
        maturity: [],
        valuePotential: [],
        complexity: [],
        riskLevel: [],
        timeToValue: [],
        sort: "featured",
        featuredOnly: true,
        limit: 6,
      },
    }),
  staleTime: 5 * 60 * 1000,
});

const allCountQuery = queryOptions({
  queryKey: ["use-cases", "count"],
  queryFn: () =>
    listUseCases({
      data: {
        q: "",
        industries: [],
        capabilities: [],
        businessFunctions: [],
        objectives: [],
        maturity: [],
        valuePotential: [],
        complexity: [],
        riskLevel: [],
        timeToValue: [],
        sort: "recent",
        limit: 120,
      },
    }),
  staleTime: 5 * 60 * 1000,
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "UseCaseX™ — Explore 100+ AI Use Cases for your industry" },
      {
        name: "description",
        content:
          "AIgilityX UseCaseX™ — explore 100+ validated AI use cases across 18 industries. Find what to automate, govern, and scale next.",
      },
      { property: "og:title", content: "UseCaseX™ — AI Use Cases Repository" },
      {
        property: "og:description",
        content:
          "Explore 100+ AI use cases across 18 industries. Filter by AI type, business objective, value and risk. Built by AIgilityX.",
      },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(taxonomiesQuery),
      context.queryClient.ensureQueryData(featuredCasesQuery),
      context.queryClient.ensureQueryData(landingCasesQuery),
      context.queryClient.ensureQueryData(allCountQuery),
    ]),
  component: LandingPage,
  errorComponent: ({ error }) => (
    <div className="p-12 text-center text-destructive">{error.message}</div>
  ),
  notFoundComponent: () => <div className="p-12 text-center">Not found</div>,
});

function LandingPage() {
  const { data: tax } = useSuspenseQuery(taxonomiesQuery);
  const { data: featured } = useSuspenseQuery(featuredCasesQuery);
  const { data: landing } = useSuspenseQuery(landingCasesQuery);
  const { data: all } = useSuspenseQuery(allCountQuery);

  const showcase = (featured.cases.length ? featured.cases : landing.cases).slice(0, 6);

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <SiteHeader />

      {/* HERO — dark, video background */}
      <section className="relative overflow-hidden border-b border-border/60 bg-background">
        <video
          aria-hidden
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-60"
          src={heroVideo.url}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, oklch(0.14 0.05 252 / 0.55) 0%, oklch(0.14 0.05 252 / 0.85) 65%, oklch(0.14 0.05 252) 100%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.14] mix-blend-screen"
          style={{
            backgroundImage:
              "linear-gradient(oklch(0.84 0.16 205 / 0.6) 1px, transparent 1px), linear-gradient(90deg, oklch(0.84 0.16 205 / 0.6) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse at top, black 30%, transparent 75%)",
          }}
        />
        <div className="relative mx-auto max-w-[1400px] px-6 pb-20 pt-24">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            UseCaseX™ · AI Use Cases Repository
          </div>
          <h1 className="max-w-5xl text-[44px] font-bold leading-[1.05] tracking-tight sm:text-6xl">
            Explore <span className="text-primary">100+ AI Use Cases</span> for your industry
          </h1>
          <p className="mt-5 max-w-3xl text-lg text-muted-foreground">
            Find what to automate, govern, and scale next — across 18 industries, 20 AI types and
            17 business objectives. Built by AIgilityX, the Sovereign AI specialists.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              to="/explore"
              className="rounded-md bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-[0_0_24px_oklch(0.82_0.13_210/0.4)] transition-all hover:shadow-[0_0_36px_oklch(0.82_0.13_210/0.7)]"
            >
              Explore the Library →
            </Link>
            <Link
              to="/auth"
              className="rounded-md border border-border bg-card/60 px-6 py-3 text-sm font-bold text-foreground hover:border-primary/40 hover:text-primary"
            >
              Create a Free Pro Account
            </Link>
            <a
              href="https://hub.aigilityx.com"
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              See the full AI Hub ↗
            </a>
          </div>

          {/* Stat strip */}
          <div className="mt-14 grid max-w-4xl grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4">
            {[
              { v: all.total.toString().padStart(3, "0"), l: "Use Cases" },
              { v: tax.industries.length.toString().padStart(2, "0"), l: "Industries" },
              { v: tax.capabilities.length.toString().padStart(2, "0"), l: "AI Types" },
              { v: tax.objectives.length.toString().padStart(2, "0"), l: "Objectives" },
            ].map((s) => (
              <div key={s.l} className="bg-card px-5 py-4">
                <div className="font-mono text-2xl font-bold text-primary">{s.v}</div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INDUSTRIES — light */}
      <section className="surface-light border-b border-border/60">
        <div className="mx-auto max-w-[1400px] px-6 py-16">
          <SectionHeader
            kicker="Explore by industry"
            title="18 industries. One repository."
            subtitle="Jump straight to the AI use cases that move the needle in your sector."
          />
          <div className="mt-8 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3 lg:grid-cols-6">
            {tax.industries.map((ind) => (
              <Link
                key={ind.slug}
                to="/explore"
                search={{ industries: [ind.slug] }}
                className="group flex flex-col justify-between bg-card px-4 py-5 transition-colors hover:bg-secondary"
              >
                <span className="text-sm font-bold text-foreground transition-colors group-hover:text-primary">
                  {ind.name}
                </span>
                <span className="mt-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  View cases →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED — dark */}
      <section className="bg-background border-b border-border/60">
        <div className="mx-auto max-w-[1400px] px-6 py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHeader
              kicker="Featured use cases"
              title="What's working right now"
              subtitle="A curated cross-section of high-impact deployments across the repository."
            />
            <Link
              to="/explore"
              className="text-sm font-bold uppercase tracking-widest text-primary hover:underline"
            >
              See all →
            </Link>
          </div>
          {showcase.length ? (
            <div className="mt-8 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
              {showcase.map((c) => (
                <FeaturedCard key={c.id} c={c} />
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-xl border border-dashed border-border bg-card/40 p-12 text-center text-muted-foreground">
              Featured use cases will appear here as the repository grows.
            </div>
          )}
        </div>
      </section>

      {/* HOW IT WORKS — light */}
      <section className="surface-light border-b border-border/60">
        <div className="mx-auto max-w-[1400px] px-6 py-16">
          <SectionHeader
            kicker="How it works"
            title="From discovery to deployment"
            subtitle="A simple 5-step loop — go deep with UseCaseX Pro to score, shortlist and export your AI portfolio."
          />
          <div className="mt-10 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-5">
            {[
              { n: "01", t: "Browse", d: "Explore 100+ validated AI use cases across 18 industries." },
              { n: "02", t: "Filter", d: "Narrow by AI type, business objective, value, risk and time-to-value." },
              { n: "03", t: "Save", d: "Shortlist promising cases into your private workspace (Pro)." },
              { n: "04", t: "Score", d: "Run the AIgilityX scoring engine on your portfolio (Pro)." },
              { n: "05", t: "Export", d: "Generate a board-ready PDF and hand off to AdvisorX, FlowX, SARPI or CyberX C3G." },
            ].map((s) => (
              <div key={s.n} className="bg-card p-6">
                <div className="font-mono text-xs font-bold text-primary">{s.n}</div>
                <div className="mt-3 text-base font-bold text-foreground">{s.t}</div>
                <div className="mt-2 text-sm text-muted-foreground">{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-b border-border/60">
        <div className="mx-auto max-w-[1400px] px-6 py-20">
          <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-card p-10 md:p-14">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.12]"
              style={{
                backgroundImage:
                  "linear-gradient(oklch(0.82 0.13 210 / 0.7) 1px, transparent 1px), linear-gradient(90deg, oklch(0.82 0.13 210 / 0.7) 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />
            <div className="relative grid items-center gap-8 md:grid-cols-3">
              <div className="md:col-span-2">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                  UseCaseX Pro
                </div>
                <h2 className="text-2xl font-bold leading-tight sm:text-3xl">
                  Turn the repository into <span className="text-primary">your AI roadmap</span>.
                </h2>
                <p className="mt-3 max-w-2xl text-muted-foreground">
                  Save use cases, score them with the AIgilityX engine, build portfolios and export
                  board-ready PDFs. Free to register.
                </p>
              </div>
              <div className="flex flex-col gap-3 md:items-end">
                <Link
                  to="/auth"
                  className="rounded-md bg-primary px-6 py-3 text-center text-sm font-bold text-primary-foreground hover:brightness-110"
                >
                  Create a Free Pro Account →
                </Link>
                <Link to="/explore" className="text-center text-sm font-medium text-muted-foreground hover:text-foreground">
                  Or keep exploring as a guest
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function SectionHeader({
  kicker,
  title,
  subtitle,
}: {
  kicker: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="max-w-2xl">
      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{kicker}</div>
      <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
      {subtitle ? <p className="mt-2 text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}

type CardCase = Awaited<ReturnType<typeof listUseCases>>["cases"][number];

function FeaturedCard({ c }: { c: CardCase }) {
  const industries = ((c.use_case_industries ?? []) as Array<{ industries?: { name?: string } }>)
    .map((x) => x.industries?.name)
    .filter(Boolean) as string[];
  const capabilities = ((c.use_case_capabilities ?? []) as Array<{ ai_capabilities?: { name?: string } }>)
    .map((x) => x.ai_capabilities?.name)
    .filter(Boolean) as string[];

  return (
    <Link to="/cases/$slug" params={{ slug: c.slug }} className="group flex flex-col bg-card p-6 transition-colors hover:bg-secondary">
      <div className="mb-3 flex flex-wrap gap-1.5">
        {industries.slice(0, 1).map((t) => (
          <span key={t} className="rounded border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">
            {t}
          </span>
        ))}
        {capabilities.slice(0, 1).map((t) => (
          <span key={t} className="rounded border border-border bg-background/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {t}
          </span>
        ))}
      </div>
      <h3 className="mb-2 text-lg font-bold leading-snug text-foreground transition-colors group-hover:text-primary">{c.title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground line-clamp-3">{c.summary}</p>
      <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-3 text-[10px] font-bold uppercase tracking-widest">
        <span className="text-muted-foreground">{c.organization ?? "AIgilityX"}</span>
        <span className="text-primary opacity-0 transition-opacity group-hover:opacity-100">Open →</span>
      </div>
    </Link>
  );
}
