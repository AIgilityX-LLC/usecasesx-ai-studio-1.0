import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Crown } from "lucide-react";
import { SiteShell } from "@/components/SiteShell";
import { getInsights } from "@/lib/insights.functions";
import { SEGMENTS } from "@/lib/segments";
import { TRUST_FACTS, FOUNDING_ACCESS_END } from "@/lib/founding-access";
import { trackCTAEvent } from "@/lib/usecasex.tracking";
import { SITE_NAME, SITE_URL } from "@/lib/seo";
import heroImg from "@/assets/landing-hero.jpg";
import repositoryImg from "@/assets/landing-repository.jpg";
import studioImg from "@/assets/landing-studio.jpg";
import sovereignImg from "@/assets/landing-sovereign.jpg";
import aboutImg from "@/assets/landing-about.jpg";

export const Route = createFileRoute("/")({
  head: () => {
    const title = "UseCasesX™ — Discover, Design & Prioritize AI Use Cases";
    const description =
      "Discover 180 provenance-labelled AI use cases, design and score them, and manage a board-ready AI portfolio. Pro Founding Access free until 31 Dec 2026.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "robots", content: "index, follow" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: `${SITE_URL}/` },
        { property: "og:type", content: "website" },
        { property: "og:site_name", content: "UseCasesX™ by AIgilityX™" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
      links: [{ rel: "canonical", href: `${SITE_URL}/` }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: SITE_NAME,
            url: `${SITE_URL}/`,
            description,
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: SITE_NAME,
            url: `${SITE_URL}/`,
            description:
              "UseCasesX is a global AI use case repository, AI Opportunity Map and AI Use Case Studio, part of the SovereignX AI Suite.",
          }),
        },
      ],
    };
  },
  component: LandingPage,
});

function LandingPage() {
  return (
    <SiteShell>
      <Hero />
      <AboutUseCasesX />
      <SegmentsBand />
      <HowItWorks />
      <RepositorySection />
      <InsightsPreview />
      <StudioSection />
      <BoardsSection />
      <SarpiSection />
      <AdvisorXSection />
      <CyberXSection />
      <PortfolioRoadmapSection />
      <PlansSection />
      <SovereignSection />
      <TrustSection />
    </SiteShell>
  );
}

/* MARKET SEGMENTS */
function SegmentsBand() {
  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-[1400px] px-6 py-20">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
          Market segments
        </div>
        <h2 className="mt-2 max-w-3xl text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          One platform for every organization type.
        </h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          From SMEs to national institutions — explore AI use cases curated for your mission, budget
          and governance context.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {SEGMENTS.map((s) => (
            <Link
              key={s.slug}
              to="/segments/$segment"
              params={{ segment: s.slug }}
              className="group rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-gold)]"
            >
              <s.icon className="h-7 w-7 text-primary" />
              <h3 className="mt-4 text-base font-bold leading-tight text-foreground">{s.name}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.hero}</p>
              <span className="mt-3 inline-block text-sm font-bold text-primary group-hover:underline">
                Explore →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* HOW IT WORKS */
function HowItWorks() {
  const steps = [
    {
      n: "01",
      t: "Explore & Discover",
      d: "Search 180 curated AI use cases and the live Deployment Intelligence layer to find high-value, low-risk opportunities for your sector.",
    },
    {
      n: "02",
      t: "Design & Validate",
      d: "Open the AI Use Case Studio™ to draft tailored briefs, score feasibility and data readiness, and assemble portfolios and roadmaps.",
    },
    {
      n: "03",
      t: "Govern & Scale value",
      d: "Route initiatives through C3G™ governance, track readiness with SARPI™, and realize value with AdvisorX™ board-ready recommendations.",
    },
  ];
  return (
    <section className="border-b border-border bg-secondary/30">
      <div className="mx-auto max-w-[1400px] px-6 py-20">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
          How it works
        </div>
        <h2 className="mt-2 max-w-3xl text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          From discovery to governed value — one operating system.
        </h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="rounded-2xl border border-border bg-card p-6">
              <div className="font-mono text-3xl font-black text-primary/30">{s.n}</div>
              <h3 className="mt-3 text-lg font-bold text-foreground">{s.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* DEPLOYMENT INTELLIGENCE PREVIEW (live) */
function InsightsPreview() {
  const { data } = useQuery({
    queryKey: ["insights", "landing"],
    queryFn: () => getInsights(),
    staleTime: 5 * 60 * 1000,
  });
  const caps = (data?.topCapabilities ?? []).slice(0, 6);
  const max = Math.max(1, ...caps.map((c) => c.count));
  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto grid max-w-[1400px] gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
            Deployment Intelligence
          </div>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            See where AI is actually being applied.
          </h2>
          <p className="mt-4 text-muted-foreground">
            A live intelligence layer over the entire corpus — the most-applied AI capabilities,
            value concentration by industry, and risk distribution. Make evidence-based AI portfolio
            decisions, not guesses.
          </p>
          {data && (
            <div className="mt-6 flex flex-wrap gap-6 text-sm">
              <Stat v={data.totals.useCases.toLocaleString()} l="Use cases analyzed" />
              <Stat v={data.totals.industries} l="Industries" />
              <Stat v={data.totals.capabilities} l="AI capabilities" />
            </div>
          )}
          <div className="mt-8">
            <Link
              to="/insights"
              className="rounded-md bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110"
            >
              Explore Insights →
            </Link>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xl">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Top AI capability types
          </div>
          <div className="mt-5 space-y-3">
            {caps.length === 0 && (
              <p className="text-sm text-muted-foreground">Loading live corpus…</p>
            )}
            {caps.map((c) => (
              <div key={c.slug}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{c.name}</span>
                  <span className="font-mono text-muted-foreground">{c.count}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(c.count / max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ v, l }: { v: string | number; l: string }) {
  return (
    <div>
      <div className="font-mono text-2xl font-bold text-foreground">{v}</div>
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
        {l}
      </div>
    </div>
  );
}

/* 1 — HERO */
function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <img
        src={heroImg}
        alt=""
        aria-hidden
        width={1920}
        height={1088}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-70"
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, oklch(0.18 0.05 258 / 0.88) 0%, oklch(0.18 0.05 258 / 0.78) 60%, oklch(0.18 0.05 258 / 0.95) 100%)",
        }}
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 hero-aurora" />
      <div aria-hidden className="pointer-events-none absolute inset-0 hero-grid" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 hero-scan" />
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {[
          { l: "12%", t: "24%", s: 6, d: "0s" },
          { l: "31%", t: "68%", s: 4, d: "1.4s" },
          { l: "48%", t: "18%", s: 5, d: "2.6s" },
          { l: "63%", t: "74%", s: 7, d: "0.8s" },
          { l: "78%", t: "34%", s: 4, d: "3.4s" },
          { l: "89%", t: "62%", s: 6, d: "2s" },
        ].map((n) => (
          <span
            key={n.l}
            className="hero-node absolute"
            style={{
              left: n.l,
              top: n.t,
              width: n.s,
              height: n.s,
              animationDelay: n.d,
            }}
          />
        ))}
      </div>
      <div className="relative mx-auto max-w-[1400px] px-6 pb-24 pt-24 sm:pt-32">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          AI USE CASE STUDIO™ BY AIGILITYX™
        </div>
        <h1 className="max-w-5xl text-balance text-3xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
          <span className="block">Turn AI ideas into a portfolio you can defend</span>
          <span className="mt-2 block text-xl font-semibold tracking-tight text-white/90 sm:mt-3 sm:text-3xl lg:text-4xl">
            Discover · Design · Prioritize · Manage
          </span>
        </h1>
        <p className="mt-5 max-w-3xl text-lg text-white/85 sm:text-xl">
          <strong className="font-semibold text-white">Discover</strong> proven use cases in a
          provenance-labelled repository.{" "}
          <strong className="font-semibold text-white">Design</strong> them into defined use cases
          in AI Use Case Studio™. <strong className="font-semibold text-white">Prioritize</strong>{" "}
          on feasibility, data readiness and value.{" "}
          <strong className="font-semibold text-white">Manage</strong> the funded portfolio,
          roadmap, benefits and board-ready exports.
        </p>
        <p className="mt-4 max-w-3xl text-sm text-white/70">
          Lite is free and open. Pro Founding Access is complimentary through {FOUNDING_ACCESS_END},
          subject to published fair-use limits. Enterprise is delivered through a paid Design
          Partner engagement.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/pricing"
            hash="founding"
            onClick={() =>
              trackCTAEvent("waitlist_join_clicked", {
                source_page: "/",
                target_route: "/pricing#founding",
                location: "landing_hero",
              })
            }
            data-analytics-id="waitlist-cta-hero"
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-6 py-3 text-center text-sm font-bold text-primary-foreground shadow-lg hover:brightness-110"
          >
            <Crown className="h-4 w-4 shrink-0" aria-hidden />
            Get Pro Founding Access — free until 2027
          </Link>
          <Link
            to="/repository"
            onClick={() =>
              trackCTAEvent("cta_clicked", {
                source_page: "/",
                target_route: "/repository",
                location: "landing_hero_repository",
              })
            }
            data-analytics-id="cta-landing-hero-repository"
            className="rounded-md border border-white/30 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur hover:bg-white/15"
          >
            Explore the repository →
          </Link>
          <Link
            to="/how-it-works"
            onClick={() =>
              trackCTAEvent("cta_clicked", {
                source_page: "/",
                target_route: "/how-it-works",
                location: "landing_hero_how",
              })
            }
            data-analytics-id="cta-landing-hero-how"
            className="rounded-md border border-white/20 px-6 py-3 text-sm font-bold text-white/90 hover:bg-white/10"
          >
            How it works
          </Link>
        </div>

        <div className="mt-14 grid max-w-5xl grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { v: "180", l: "Published Use Cases" },
            { v: "18", l: "Industries" },
            { v: "9", l: "Journey Stages" },
            { v: "12", l: "Export Deliverables" },
            { v: "100%", l: "Provenance Labelled" },
            { v: "Free", l: "Until 31 Dec 2026" },
          ].map((s) => (
            <div
              key={s.l}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur"
            >
              <div className="font-mono text-xl font-bold text-white sm:text-2xl">{s.v}</div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/65">
                {s.l}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* 2 — ABOUT / WHY USECASESX */
function AboutUseCasesX() {
  const points = [
    "A curated, governed repository of 180 enterprise and sovereign AI use cases.",
    "Built for governments, regulators, banks, healthcare, defense and critical infrastructure.",
    "Lifecycle workflows — discover, design, validate, govern, prioritize and scale.",
    "Sovereign-ready by design, from public SaaS to air-gapped deployments.",
  ];
  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-[1400px] px-6 py-20">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
              About UseCasesX
            </div>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              The AI Use Case Studio — built for real-world AI ROI & Business Impact.
            </h2>
            <p className="mt-4 text-muted-foreground">
              UseCasesX™ by AIgilityX™ helps organizations move from AI ambition to governed,
              measurable value. It is more than a repository — it is an operating system that takes
              every initiative from discovery through design, validation, governance and scale, with
              sovereignty and compliance built in from day one.
            </p>
            <ul className="mt-6 space-y-3">
              {points.map((p) => (
                <li key={p} className="flex items-start gap-3 text-sm text-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/repository"
                className="rounded-md bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110"
              >
                Explore the Repository →
              </Link>
              <Link
                to="/pricing"
                className="rounded-md border border-border px-5 py-2.5 text-sm font-bold text-foreground hover:bg-secondary"
              >
                See Plans
              </Link>
            </div>
          </div>
          <div className="relative">
            <img
              src={aboutImg}
              alt="UseCasesX AI use case operating system overview"
              width={1280}
              height={1024}
              loading="lazy"
              className="w-full rounded-2xl border border-border object-cover shadow-xl"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

/* 3 — GLOBAL REPOSITORY */
function RepositorySection() {
  return (
    <section className="border-b border-border bg-secondary/30">
      <div className="mx-auto grid max-w-[1400px] gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
            Global Repository
          </div>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            180 curated AI use cases across 18+ industries.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Browse, search, and filter by industry, business function, AI type, value potential,
            complexity, risk and maturity. Every use case is reviewed by the AIgilityX team for
            business clarity, AI fit, delivery realism and sovereign-AI considerations.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-foreground">
            {[
              "Filter by sector, function and AI capability",
              "Score, save, and shortlist to your workspace",
              "Export Lite PDFs and full integration packages",
            ].map((x) => (
              <li key={x} className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                {x}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex gap-3">
            <Link
              to="/repository"
              className="rounded-md bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110"
            >
              Explore Repository →
            </Link>
            <Link
              to="/patterns"
              className="rounded-md border border-border bg-background px-5 py-2.5 text-sm font-semibold hover:bg-secondary"
            >
              Pattern Library
            </Link>
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-border shadow-xl">
          <img
            src={repositoryImg}
            alt="Global AI use cases repository"
            loading="lazy"
            width={1536}
            height={1024}
            className="h-full w-full object-cover"
          />
        </div>
      </div>
    </section>
  );
}

/* 4 — STUDIO */
function StudioSection() {
  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto grid max-w-[1400px] gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center">
        <div className="order-2 overflow-hidden rounded-2xl border border-border shadow-xl lg:order-1">
          <img
            src={studioImg}
            alt="AI Use Case Studio interface"
            loading="lazy"
            width={1536}
            height={1024}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="order-1 lg:order-2">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
            AIgilityX AI Use Case Studio™
          </div>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Design custom AI use cases for your organization.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Research and draft tailored AI use cases with the studio's research engines. Generate
            full briefs — problem, AI solution, data needs, KPIs, ROI areas, governance
            considerations and next steps — then push into PortfolioX™, BlueprintX™ and DecisionX™.
          </p>
          <div className="mt-8 flex gap-3">
            <Link
              to="/studio"
              className="rounded-md bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110"
            >
              Launch AI Use Case Studio™ →
            </Link>
            <Link
              to="/blueprint"
              className="rounded-md border border-border bg-background px-5 py-2.5 text-sm font-semibold hover:bg-secondary"
            >
              BlueprintX™
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* Use Case Boards */
function BoardsSection() {
  const FEATURES = [
    "Build multiple boards for sprints, portfolios and backlogs",
    "Add use cases from the repository with duplicate protection",
    "Drag-and-drop reorder, curate and remove items",
    "Rename, save and delete boards with full audit trail",
  ];
  return (
    <section className="border-b border-border bg-secondary/30">
      <div className="mx-auto grid max-w-[1400px] gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
            Use Case Boards
          </div>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Organize your AI use cases into shared boards.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Group AI use cases into boards for portfolio reviews, quick-win sprints and innovation
            backlogs — then prioritize, reorder and hand off with confidence. Every change is
            captured in your workspace audit trail.
          </p>
          <ul className="mt-6 space-y-2">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md bg-primary/10 text-[11px] font-bold text-primary">
                  ✓
                </span>
                {f}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex gap-3">
            <Link
              to="/boards"
              className="rounded-md bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110"
            >
              Open Use Case Boards →
            </Link>
            <Link
              to="/repository"
              className="rounded-md border border-border bg-background px-5 py-2.5 text-sm font-semibold hover:bg-secondary"
            >
              Browse Repository
            </Link>
          </div>
        </div>
        <div className="grid gap-4 rounded-2xl border border-border bg-card p-6 shadow-xl">
          {["Quick-Win Sprint Q1", "Government AI Portfolio", "Innovation Backlog"].map((t, i) => (
            <div
              key={t}
              className="flex items-center justify-between rounded-xl border border-border bg-background p-4"
            >
              <div>
                <div className="text-sm font-bold text-foreground">{t}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {(i + 2) * 3} use cases · updated recently
                </div>
              </div>
              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">
                Studio
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* 5 — SARPI + WHY USECASESX */
function SarpiSection() {
  const pillars = [
    {
      t: "Beyond a repository",
      d: "Not a content library — an AI Use Case Operating System with lifecycle workflows.",
    },
    {
      t: "Beyond a marketplace",
      d: "No sponsored listings. Every use case is curated, governed, and sovereign-aware.",
    },
    {
      t: "Built for regulated industries",
      d: "Designed for governments, banks, healthcare, defense, energy and critical infrastructure.",
    },
    {
      t: "Sovereign-ready by design",
      d: "From Public SaaS to Air-Gapped Sovereign Deployment — one product, six deployment models.",
    },
    {
      t: "Every initiative starts here",
      d: "We help you build the right AI solutions before investing in development.",
    },
    {
      t: "API-ready ecosystem",
      d: "Plugs into SARPI™, CyberX C3G™, AdvisorX™ and the wider AIgilityX platform stack.",
    },
  ];
  return (
    <section className="border-b border-border surface-dark">
      <div className="mx-auto max-w-[1400px] px-6 py-20">
        <div className="grid items-end gap-4 lg:grid-cols-[1fr_auto]">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
              AI Readiness · SARPI™
            </div>
            <h2 className="mt-2 max-w-3xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Know where you stand. Track readiness, value, and risk in one index.
            </h2>
            <p className="mt-3 max-w-3xl text-white/75">
              The Strategic AI Readiness &amp; Performance Index measures organizational maturity
              and value realization across every prioritized use case from UseCasesX™.
            </p>
          </div>
          <Link
            to="/sarpi"
            className="rounded-md bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110"
          >
            Open SARPI™ →
          </Link>
        </div>

        <div className="mt-20">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
            WHY USECASESX - AI USECASE STUDIO
          </div>
          <h2 className="mt-2 max-w-3xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
            The AI Use Case OS for SMEs, Enterprises, Governments &amp; Regulators.
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pillars.map((p) => (
              <div key={p.t} className="rounded-xl border border-border bg-card p-6">
                <h3 className="text-base font-bold text-foreground">{p.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{p.d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* 6 — ADVISORX */
function AdvisorXSection() {
  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-[1400px] px-6 py-20">
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr] lg:items-end">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
              Executive Guidance · AdvisorX™
            </div>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              From use case to board-ready recommendation.
            </h2>
            <p className="mt-3 max-w-3xl text-muted-foreground">
              AdvisorX™ turns scored portfolios into prioritized AI investment recommendations,
              executive briefings, and decision-grade roadmaps.
            </p>
          </div>
          <Link
            to="/advisorx"
            className="self-end rounded-md bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110"
          >
            Open AdvisorX™ →
          </Link>
        </div>
      </div>
    </section>
  );
}

/* 7 — CYBERX */
function CyberXSection() {
  return (
    <section className="border-b border-border bg-secondary/30">
      <div className="mx-auto max-w-[1400px] px-6 py-20">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
          Governance · CyberX Sovereign AI C3G™
        </div>
        <h2 className="mt-2 max-w-3xl text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Cybersecurity, Compliance &amp; Governance for every AI initiative.
        </h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          Route high-risk use cases through structured governance intake: control mapping, regulator
          alignment, evidence capture, audit trail and assurance — built for sovereign and regulated
          environments.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/cyberx/c3g/intake"
            search={{ source: "home", use_case_id: undefined }}
            className="rounded-md bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110"
          >
            Open CyberX C3G™ →
          </Link>
          <Link
            to="/governance"
            className="rounded-md border border-border bg-background px-5 py-2.5 text-sm font-semibold hover:bg-secondary"
          >
            GovernanceX™
          </Link>
        </div>
      </div>
    </section>
  );
}

/* 8 — PORTFOLIO & ROADMAP */
function PortfolioRoadmapSection() {
  const cards = [
    {
      t: "PortfolioX™",
      d: "Group scored use cases into themed AI investment portfolios — quick wins, strategic plays, sovereign programs.",
      to: "/portfoliox",
    },
    {
      t: "RoadmapX™",
      d: "Sequence portfolios into multi-quarter roadmaps with milestones, dependencies, and value gates.",
      to: "/roadmap",
    },
    {
      t: "ImpactAssessmentX™",
      d: "Quantify expected impact across revenue, cost, risk, citizen and customer outcomes before commitment.",
      to: "/impact-assessment",
    },
    {
      t: "DecisionX™",
      d: "Capture approvals, board minutes, and the audit trail behind every Go / No-Go / Defer decision.",
      to: "/decision",
    },
  ];
  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-[1400px] px-6 py-20">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
          Portfolio &amp; Roadmap Management
        </div>
        <h2 className="mt-2 max-w-3xl text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          From prioritized use case to funded delivery roadmap.
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <Link
              key={c.t}
              to={c.to as never}
              className="group rounded-xl border border-border bg-card p-6 transition hover:-translate-y-0.5 hover:border-primary/40"
            >
              <h3 className="text-base font-bold text-foreground group-hover:text-primary">
                {c.t}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">{c.d}</p>
              <div className="mt-5 text-[10px] font-bold uppercase tracking-widest text-primary opacity-0 transition-opacity group-hover:opacity-100">
                Open →
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* 9 — PLANS */
function PlansSection() {
  const plans = [
    {
      name: "UseCasesX Lite™",
      tag: "Free · No login required",
      features: [
        "Browse, search, filter 180 curated use cases",
        "View full use case detail pages",
        "Industry &amp; AI-type taxonomy filters",
        "Download Lite PDF after lead capture",
        "Public Global AI Use Cases Repository",
        "No login required to explore",
      ],
      cta: { label: "Start free", to: "/repository" },
    },
    {
      name: "UseCasesX Pro™",
      tag: "Free Beta · Gratis until 31 Dec 2026 · Most Popular",
      highlight: true,
      features: [
        "Save, score &amp; prioritize use cases",
        "Build PortfolioX™ &amp; RoadmapX™",
        "Use AIgilityX AI Use Case Studio™",
        "Feasibility, data readiness &amp; blueprint canvases",
        "AdvisorX™ AI co-pilot guidance",
        "Generate executive PDF reports",
      ],
      cta: { label: "Join the Waitlist — Early Gratis Access", to: "/pricing" },
    },

    {
      name: "UseCasesX Enterprise™",
      tag: "Enterprise · Sovereign AI System included",
      features: [
        "Everything in Pro, for whole organizations",
        "SSO, RBAC &amp; private workspaces",
        "Integration into SARPI™, CyberX™, AdvisorX™",
        "C3G™ governance records &amp; audit trail",
        "Sovereign AI System™: GovCloud, on-prem, air-gapped",
        "Country-specific governance packs &amp; success engineering",
      ],
      cta: { label: "Talk to us", to: "/api-integration" },
    },
  ];
  return (
    <section className="border-b border-border bg-secondary/30">
      <div className="mx-auto max-w-[1400px] px-6 py-20">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
          Editions
        </div>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Lite · Pro · Enterprise (incl. Sovereign AI System)
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.name}
              className={
                "flex h-full flex-col rounded-2xl border bg-card p-6 " +
                (p.highlight
                  ? "border-primary/40 shadow-[var(--shadow-elegant)] ring-1 ring-primary/20"
                  : "border-border")
              }
            >
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                {p.tag}
              </div>
              <h3
                className="mt-2 text-xl font-bold text-foreground"
                dangerouslySetInnerHTML={{ __html: p.name }}
              />
              <ul className="mt-5 flex-1 space-y-2 text-sm text-foreground">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                    <span dangerouslySetInnerHTML={{ __html: f }} />
                  </li>
                ))}
              </ul>
              <Link
                to={p.cta.to as never}
                className={
                  "mt-6 inline-flex w-full justify-center rounded-md px-4 py-2.5 text-sm font-bold " +
                  (p.highlight
                    ? "bg-primary text-primary-foreground hover:brightness-110"
                    : "border border-border bg-background text-foreground hover:bg-secondary")
                }
              >
                {p.cta.label} →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* 10 — SOVEREIGN */
function SovereignSection() {
  return (
    <section className="border-b border-border surface-dark">
      <div className="mx-auto grid max-w-[1400px] gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
            Government &amp; Sovereign AI
          </div>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Built for ministries, regulators &amp; sovereign AI programs.
          </h2>
          <p className="mt-4 text-white/80">
            UseCasesX™ supports the full spectrum of sovereign deployment: Public SaaS, Enterprise
            SaaS, Private Cloud, GovCloud, On-Premises, and Air-Gapped Sovereign Deployment — with
            country-specific governance packs and a tamper-evident audit trail across the full use
            case lifecycle.
          </p>
          <ul className="mt-6 grid grid-cols-2 gap-2 text-sm text-white">
            {[
              "Public SaaS",
              "Enterprise SaaS",
              "Private Cloud",
              "GovCloud",
              "On-Premises",
              "Air-Gapped",
            ].map((d) => (
              <li
                key={d}
                className="rounded-md border border-white/15 bg-white/5 px-3 py-2 text-center backdrop-blur"
              >
                {d}
              </li>
            ))}
          </ul>
        </div>
        <div className="overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
          <img
            src={sovereignImg}
            alt="Sovereign AI deployment"
            loading="lazy"
            width={1536}
            height={1024}
            className="h-full w-full object-cover"
          />
        </div>
      </div>
    </section>
  );
}

/* 11 — TRUST SIGNALS (verifiable statements only) */
function TrustSection() {
  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-[1400px] px-6 py-20">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
          What we can evidence
        </div>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Claims you can check inside the product.
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          We are pre-launch, so there are no customer logos, certifications or adoption numbers to
          show — and we will not invent any. These are statements you can verify by using the
          platform.
        </p>
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {TRUST_FACTS.slice(0, 6).map((fact) => (
            <article key={fact.title} className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-base font-bold text-foreground">{fact.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{fact.body}</p>
            </article>
          ))}
        </div>
        <div className="mt-8">
          <Link
            to="/about"
            data-analytics-id="cta-landing-trust"
            onClick={() =>
              trackCTAEvent("cta_clicked", { location: "landing-trust", target_route: "/about" })
            }
            className="inline-flex items-center rounded-md border border-border px-5 py-2.5 text-sm font-bold text-foreground hover:bg-secondary"
          >
            Read about & trust →
          </Link>
        </div>
      </div>
    </section>
  );
}
