import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Building2,
  Check,
  Compass,
  Database,
  Globe2,
  Layers3,
  Lightbulb,
  Lock,
  Menu,
  Scale,
  ShieldCheck,
  Target,
  Workflow,
  X,
} from "lucide-react";
import { SITE_NAME, SITE_URL } from "@/lib/seo";
import { useReveal } from "@/hooks/useReveal";
import { trackCTAEvent } from "@/lib/usecasex.tracking";
import { LandingAuthActions } from "@/components/AuthNavActions";
import heroImage from "@/assets/usecasesx-hero-background.png";
import architectureImage from "@/assets/landing-studio.jpg";
import sovereignImage from "@/assets/landing-sovereign.jpg";

export const Route = createFileRoute("/")({
  head: () => {
    const title = "UseCasesX™ — Enterprise AI Use Case Operating System";
    const description =
      "Discover, design, score and prioritize AI use cases in one evidence-led enterprise workspace. Pro Founding Access is complimentary through 2026.";
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
      ],
    };
  },
  component: LandingPage,
});

const NAV_ITEMS: { label: string; to: string }[] = [
  { to: "/", label: "Home" },
  { to: "/repository", label: "Explore" },
  { to: "/how-it-works", label: "How it works" },
  { to: "/editions", label: "Editions" },
  { to: "/advisory", label: "Workshops" },
  { to: "/enterprise", label: "Enterprise" },
  { to: "/contact", label: "Contact" },
];

const MARQUEE = [
  "Strategy",
  "Operations",
  "Risk",
  "Customer experience",
  "Technology",
  "Public sector",
  "Healthcare",
  "Finance",
];

const ORG_TYPES = [
  {
    no: "01",
    title: "Strategy & Innovation",
    copy: "Find the opportunities that matter before the portfolio fills with noise.",
    icon: Lightbulb,
  },
  {
    no: "02",
    title: "Business & Operations",
    copy: "Turn operational friction into assistive workflows with measured outcomes.",
    icon: Workflow,
  },
  {
    no: "03",
    title: "Technology & Data",
    copy: "Anchor every case in capability, data readiness, and delivery reality.",
    icon: Database,
  },
  {
    no: "04",
    title: "Enterprise & Governance",
    copy: "Make ownership, evidence, and gate readiness visible across the estate.",
    icon: Building2,
  },
  {
    no: "05",
    title: "Government & Public Sector",
    copy: "Move with ambition while keeping transparency and public trust intact.",
    icon: Scale,
  },
];

const OS_STEPS = [
  {
    no: "01",
    title: "Explore & Align",
    copy: "Surface the highest-leverage opportunities and align on intent.",
    icon: Compass,
  },
  {
    no: "02",
    title: "Design & Validate",
    copy: "Shape a clear, testable case with value and feasibility hypotheses.",
    icon: Layers3,
  },
  {
    no: "03",
    title: "Govern & Activate",
    copy: "Assign owners, controls, and evidence before the spend begins.",
    icon: ShieldCheck,
  },
  {
    no: "04",
    title: "Measure & Scale",
    copy: "Track readiness, value, and risk as the portfolio compounds.",
    icon: Target,
  },
];

const BROWSER_ROWS = [
  { name: "Claims document intelligence", industry: "Insurance" },
  { name: "Service knowledge copilot", industry: "Services" },
  { name: "Demand sensing engine", industry: "Retail" },
];

const BOARD_COLUMNS = [
  {
    title: "Discovery",
    cards: [
      { name: "Customer service copilot", meta: "Customer experience" },
      { name: "Knowledge search", meta: "Knowledge management" },
    ],
  },
  {
    title: "Validation",
    cards: [
      { name: "Demand forecasting", meta: "Operations" },
      { name: "Claims triage", meta: "Insurance" },
    ],
  },
  {
    title: "Ready For Gate",
    cards: [
      { name: "Case routing agent", meta: "Service delivery" },
      { name: "Supplier insights", meta: "Procurement" },
    ],
  },
];

const OS_AUDIENCES = [
  {
    title: "SMEs",
    copy: "Move from idea to action.",
    detail: "Start with one use case, a clear owner, and a decision you can fund.",
    featured: false,
  },
  {
    title: "Enterprises",
    copy: "Make the portfolio legible.",
    detail: "Compare value, readiness, and risk across teams without losing context.",
    featured: true,
  },
  {
    title: "Governments & Regulators",
    copy: "Build with public trust.",
    detail: "Evidence trails, approval workflows, and deployment policy controls by design.",
    featured: false,
  },
];

const PRICING = [
  {
    name: "Lite",
    tagline: "For focused teams",
    features: ["Use-case library access", "Readiness scoring", "Shared decision boards"],
    featured: false,
  },
  {
    name: "Pro",
    tagline: "For growing portfolios",
    badge: "Most adopted",
    features: [
      "Everything in Lite",
      "Custom use-case builder",
      "Evidence-backed recommendations",
      "Governance workflows",
    ],
    featured: true,
  },
  {
    name: "Enterprise",
    tagline: "For complex organizations",
    features: [
      "Everything in Pro",
      "Portfolio intelligence",
      "Managed-cloud design-partner pilots",
      "Advanced controls & support",
    ],
    featured: false,
  },
];

const FOOTER_COLS: { title: string; links: { label: string; to?: string; href?: string }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Use Case Studio", to: "/ai-use-case-studio" },
      { label: "Use-Case Library", to: "/repository" },
      { label: "Operating System", href: "#operating-system" },
      { label: "Governance", to: "/governance" },
    ],
  },
  {
    title: "Use Cases",
    links: [
      { label: "Customer Intelligence", to: "/repository" },
      { label: "Operational Copilots", to: "/repository" },
      { label: "Risk & Compliance", to: "/repository" },
      { label: "Public Sector", to: "/repository" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Methodology", to: "/resources" },
      { label: "Evidence Guide", to: "/resources" },
      { label: "Enterprise AI", href: "#sovereign" },
      { label: "Contact Studio", to: "/contact" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About UseCasesX", to: "/about" },
      { label: "Privacy", to: "/privacy" },
      { label: "Terms", to: "/terms" },
      { label: "Security", to: "/security" },
    ],
  },
];

function useInViewOnce<T extends HTMLElement>(opts?: { immediate?: boolean }) {
  const ref = useRef<T | null>(null);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const immediate = opts?.immediate === true;

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setReady(true);
      setVisible(true);
      return;
    }
    setReady(true);
    if (immediate) {
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    }
    const alreadyInView = () => {
      const rect = el.getBoundingClientRect();
      return rect.top < window.innerHeight * 0.92 && rect.bottom > 0;
    };
    if (alreadyInView()) {
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setVisible(true);
        io.disconnect();
      },
      { threshold: 0.05, rootMargin: "0px 0px -40px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [immediate]);

  return { ref, ready, visible };
}

function animClass(base: string, ready: boolean, visible: boolean) {
  return `${base}${ready ? " is-ready" : ""}${visible ? " is-visible" : ""}`;
}

function Reveal({
  children,
  className = "",
  style,
  delay,
  variant,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  delay?: number;
  variant?: string;
}) {
  return (
    <div
      className={className}
      data-reveal={variant || true}
      data-reveal-delay={delay != null ? String(delay) : undefined}
      style={style}
    >
      {children}
    </div>
  );
}

function BrandMark() {
  return (
    <span className="ux-brand-mark" aria-hidden>
      <span />
      <span />
      <span />
    </span>
  );
}

function BrandLink({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`ux-brand ${className}`.trim()} aria-label="UseCasesX Studio home">
      <BrandMark />
      <span>
        UseCases<span className="ux-brand-x">X</span> <b>STUDIO</b>
      </span>
    </Link>
  );
}

function SectionHeading({
  children,
  className = "",
  anim = "ux-heading-up",
}: {
  children: ReactNode;
  className?: string;
  anim?: string;
}) {
  const { ref, ready, visible } = useInViewOnce<HTMLHeadingElement>();
  return (
    <h2 ref={ref} className={animClass(`${anim} ${className}`.trim(), ready, visible)}>
      {children}
    </h2>
  );
}

function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  useReveal();

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <div className="ux-landing" id="top">
      <div className="ux-announce">
        <div className="ux-container ux-announce-inner">
          <span>New: The UseCasesX AI use-case operating system</span>
          <Link
            className="ux-announce-link"
            to="/ai-use-case-studio"
            onClick={() =>
              trackCTAEvent("cta_clicked", {
                source_page: "/",
                target_route: "/ai-use-case-studio",
                location: "landing_announce_explore",
              })
            }
          >
            Explore the studio <ArrowRight size={12} aria-hidden />
          </Link>
        </div>
      </div>

      <header className="ux-site-nav">
        <BrandLink className="ux-nav-brand" />
        <nav className="ux-desktop-nav" aria-label="Primary navigation">
          {NAV_ITEMS.map((item) => (
            <Link key={item.label} to={item.to as never}>
              {item.label}
            </Link>
          ))}
        </nav>
        <LandingAuthActions />
        <button
          type="button"
          className="ux-menu-toggle"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X /> : <Menu />}
        </button>
      </header>

      {menuOpen && (
        <div className="ux-mobile-menu" role="dialog" aria-label="Mobile navigation">
          {NAV_ITEMS.map((item) => (
            <Link key={item.label} to={item.to as never} onClick={() => setMenuOpen(false)}>
              {item.label}
            </Link>
          ))}
          <LandingAuthActions mobile onNavigate={() => setMenuOpen(false)} />
        </div>
      )}

      <main id="main-content" tabIndex={-1} className="outline-none">
        {/* Product hero */}
        <section className="ux-hero ux-section-dark">
          <img
            className="ux-hero-background"
            src={heroImage}
            alt=""
            width={2560}
            height={1440}
            decoding="async"
            fetchPriority="high"
            aria-hidden
          />
          <div className="ux-hero-overlay" aria-hidden />
          <div className="ux-hero-content">
            <div className="ux-eyebrow">
              <span className="ux-eyebrow-dot" /> Enterprise AI portfolio management
            </div>
            <h1 className="ux-hero-heading">
              Operationalize <span className="is-accent">high-value</span> AI use cases.
            </h1>
            <p className="ux-hero-lead">
              UseCasesX brings discovery, design, scoring and portfolio decisions into one
              evidence-led workspace.
            </p>
            <div className="ux-hero-actions">
              <Link
                className="ux-button ux-button-gold"
                to="/ai-use-case-studio"
                onClick={() =>
                  trackCTAEvent("cta_clicked", {
                    source_page: "/",
                    target_route: "/ai-use-case-studio",
                    location: "landing_hero_explore_studio",
                  })
                }
              >
                Explore the studio <ArrowRight size={17} aria-hidden />
              </Link>
              <Link className="ux-button ux-button-ghost" to="/enterprise">
                Explore Enterprise <ArrowRight size={17} aria-hidden />
              </Link>
            </div>
            <p className="ux-hero-proof">From opportunity to a decision you can defend.</p>
          </div>
          <div className="ux-hero-scroll" aria-hidden="true">
            <span>Scroll to explore</span>
            <span className="ux-scroll-line" />
          </div>
        </section>

        {/* 6. Signal strip */}
        <section className="ux-signal-strip ux-section-dark" aria-label="Operating domains">
          <div className="ux-container ux-signal-inner">
            <span className="ux-signal-label">THE OPERATING SYSTEM FOR AI VALUE</span>
            <div className="ux-signal-marquee" aria-hidden>
              <div className="ux-signal-track">
                {[...MARQUEE, ...MARQUEE].map((item, i) => (
                  <span key={`${item}-${i}`} className="ux-signal-item">
                    <i aria-hidden />
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 7. Studio */}
        <section id="platform" className="ux-section-light ux-studio-section">
          <div className="ux-container ux-split-layout">
            <div className="ux-split-copy">
              <Reveal className="ux-section-kicker" variant="up">
                01 / The studio
              </Reveal>
              <SectionHeading anim="ux-heading-mask">
                The AI Use Case Studio — Built For
                <br />
                <span className="ux-accent">Real-World AI ROI &amp; Business Impact.</span>
              </SectionHeading>
              <p className="ux-lead">
                Most AI programs don’t fail because the technology is wrong. They fail because the
                use case was never made clear enough to earn belief.
              </p>
              <ul className="ux-checklist">
                <li>
                  <Check size={15} aria-hidden /> Make the problem, outcome, and owner explicit.
                </li>
                <li>
                  <Check size={15} aria-hidden /> Build a credible value and feasibility hypothesis.
                </li>
                <li>
                  <Check size={15} aria-hidden /> Carry the evidence from first signal to decision.
                </li>
              </ul>
              <a className="ux-under-link" href="#operating-system">
                Explore the platform <ArrowRight size={15} aria-hidden />
              </a>
            </div>
            <Reveal className="ux-architecture-card" variant="scale" delay={120}>
              <img src={architectureImage} alt="Layered AI architecture visual" />
              <div className="ux-architecture-caption">
                <span className="ux-pulse" aria-hidden /> Design with evidence and ownership
              </div>
            </Reveal>
          </div>
        </section>

        {/* 8. Organization types */}
        <section id="org-types" className="ux-section-dark ux-org-section">
          <div className="ux-container">
            <Reveal className="ux-section-kicker">02 / One platform</Reveal>
            <SectionHeading anim="ux-heading-up">
              One Platform For Every Organization Type.
            </SectionHeading>
            <div className="ux-org-grid">
              {ORG_TYPES.map(({ no, title, copy, icon: Icon }, i) => (
                <Reveal key={no} className="ux-org-card" delay={i * 60} variant="up">
                  <div className="ux-org-top">
                    <span>{no}</span>
                    <Icon size={20} strokeWidth={1.5} aria-hidden />
                  </div>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                  <ArrowRight className="ux-org-arrow" size={15} aria-hidden />
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* 9. Operating system */}
        <section id="operating-system" className="ux-section-light ux-os-section">
          <div className="ux-container">
            <Reveal className="ux-section-kicker">03 / The operating system</Reveal>
            <SectionHeading anim="ux-heading-lines">
              From Discovery To Governed Value —{" "}
              <span className="ux-accent">One Operating System.</span>
            </SectionHeading>
            <div className="ux-os-steps">
              {OS_STEPS.map(({ no, title, copy, icon: Icon }, i) => (
                <Reveal key={no} className="ux-os-step" delay={i * 80} variant="draw">
                  <div className="ux-os-step-icon">
                    <Icon size={20} strokeWidth={1.5} aria-hidden />
                  </div>
                  <span className="ux-os-step-no">{no}</span>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                  {i < OS_STEPS.length - 1 && <span className="ux-os-connector" aria-hidden />}
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* 10. Use-case library */}
        <section id="use-cases" className="ux-section-dark ux-library-section">
          <div className="ux-container ux-library-layout">
            <div className="ux-library-copy">
              <Reveal className="ux-section-kicker" variant="left">
                04 / The use-case library
              </Reveal>
              <SectionHeading anim="ux-heading-left">
                180 Curated AI Use Cases Across 18+ Industries.
              </SectionHeading>
              <p>
                Start with patterns that have already been considered, then shape them for your own
                context, constraints, and ambition.
              </p>
              <ul className="ux-checklist ux-checklist-dark">
                <li>
                  <Check size={15} aria-hidden /> Search by industry, outcome, or capability.
                </li>
                <li>
                  <Check size={15} aria-hidden /> Compare value, readiness, risk, and evidence.
                </li>
                <li>
                  <Check size={15} aria-hidden /> Turn a relevant pattern into your own case.
                </li>
              </ul>
              <Link className="ux-button ux-button-gold ux-button-small" to="/repository">
                Explore the library <ArrowRight size={14} aria-hidden />
              </Link>
            </div>
            <Reveal className="ux-map-visual" variant="float" delay={100}>
              <div className="ux-map-globe" aria-hidden>
                <Globe2 size={120} strokeWidth={0.8} />
                <span className="ux-map-node ux-map-node-a" />
                <span className="ux-map-node ux-map-node-b" />
                <span className="ux-map-node ux-map-node-c" />
                <span className="ux-map-node ux-map-node-d" />
              </div>
              <div className="ux-map-labels">
                <span>18+ industries</span>
                <span>180 curated cases</span>
                <span>evidence connected</span>
              </div>
            </Reveal>
          </div>
        </section>

        {/* 11. See AI applications */}
        <section id="applications" className="ux-section-light ux-browser-section">
          <div className="ux-container">
            <Reveal className="ux-section-kicker">05 / See the signal</Reveal>
            <SectionHeading anim="ux-heading-up">
              See Where AI Is Actually Being Applied.
            </SectionHeading>
            <p className="ux-section-lead">
              Browse a living library of practical examples and understand what makes a use case
              worth pursuing.
            </p>
            <Reveal className="ux-browser" variant="right" delay={80}>
              <div className="ux-browser-chrome">
                <span />
                <span />
                <span />
                <div className="ux-browser-url">UseCasesX / repository · illustrative view</div>
              </div>
              <div className="ux-browser-toolbar">
                <input
                  readOnly
                  value="Search use cases, industries, outcomes…"
                  aria-label="Search"
                />
                <div className="ux-chips">
                  <span className="is-active">All</span>
                  <span>Insurance</span>
                  <span>Services</span>
                  <span>Retail</span>
                </div>
              </div>
              <div className="ux-browser-table" role="table" aria-label="Example use cases">
                <div className="ux-browser-row ux-browser-head" role="row">
                  <span>Use case</span>
                  <span>Industry</span>
                  <span>Explore</span>
                  <span>Use case</span>
                </div>
                {BROWSER_ROWS.map((row) => (
                  <div key={row.name} className="ux-browser-row" role="row">
                    <span>{row.name}</span>
                    <span>{row.industry}</span>
                    <span>Discover</span>
                    <span>View details</span>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* 12. Custom AI use cases */}
        <section id="builder" className="ux-section-dark ux-builder-section">
          <div className="ux-container ux-builder-layout">
            <Reveal className="ux-builder-visual" variant="scale">
              <div className="ux-builder-toolbar">
                <span>Use Case Builder</span>
                <b>Draft · v0.4</b>
              </div>
              <div className="ux-builder-nodes">
                <div className="ux-node ux-node-problem">
                  <small>Business problem</small>
                  <strong>Fragmented service signals</strong>
                </div>
                <div className="ux-node ux-node-capability">
                  <small>AI capability</small>
                  <strong>Retrieval + assistive workflow</strong>
                </div>
                <div className="ux-node ux-node-outcome">
                  <small>Measured outcome</small>
                  <strong>Faster first-response quality</strong>
                </div>
                <span className="ux-builder-line ux-builder-line-a" aria-hidden />
                <span className="ux-builder-line ux-builder-line-b" aria-hidden />
              </div>
            </Reveal>
            <div className="ux-builder-copy">
              <SectionHeading anim="ux-heading-blur">
                Design Custom AI Use Cases For Your Organization.
              </SectionHeading>
              <ul className="ux-checklist ux-checklist-dark">
                <li>
                  <Check size={15} aria-hidden /> Start from a prompt, signal, or strategic
                  priority.
                </li>
                <li>
                  <Check size={15} aria-hidden /> Collaborate across business and technical teams.
                </li>
                <li>
                  <Check size={15} aria-hidden /> Save a versioned record of the decision.
                </li>
              </ul>
              <Link className="ux-button ux-button-gold ux-button-small" to="/ai-use-case-studio">
                Design a use case <ArrowRight size={14} aria-hidden />
              </Link>
            </div>
          </div>
        </section>

        {/* 13. Shared boards */}
        <section id="boards" className="ux-section-light ux-boards-section">
          <div className="ux-container">
            <SectionHeading anim="ux-heading-up">
              Organize Your AI Use Cases Into Shared Boards.
            </SectionHeading>
            <Reveal className="ux-board-mock" variant="left" delay={60}>
              <div className="ux-board-top">
                <span>Portfolio board · illustrative view</span>
                <Link to="/portfoliox" className="ux-add-case">
                  View portfolios <ArrowRight size={13} aria-hidden />
                </Link>
              </div>
              <div className="ux-board-columns">
                {BOARD_COLUMNS.map((col) => (
                  <div key={col.title} className="ux-board-col">
                    <h3>{col.title}</h3>
                    {col.cards.map((card) => (
                      <article key={card.name} className="ux-board-card">
                        <strong>{card.name}</strong>
                        <span>{card.meta}</span>
                      </article>
                    ))}
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* 15. AI Use Case OS audiences */}
        <section id="audiences" className="ux-section-dark ux-audience-section">
          <div className="ux-container">
            <SectionHeading anim="ux-heading-up">
              The AI Use Case OS For SMEs, Enterprises, Governments &amp; Regulators.
            </SectionHeading>
            <div className="ux-audience-grid">
              {OS_AUDIENCES.map((card, i) => (
                <Reveal
                  key={card.title}
                  className={`ux-audience-card${card.featured ? " is-featured" : ""}`}
                  delay={card.featured ? 120 : i * 70}
                  variant="up"
                >
                  <h3>{card.title}</h3>
                  <p className="ux-audience-lead">{card.copy}</p>
                  <p>{card.detail}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* 16. Board-ready recommendation */}
        <section id="recommendation" className="ux-section-light ux-reco-section">
          <div className="ux-container">
            <SectionHeading anim="ux-heading-up">
              From Use Case To Board-Ready Recommendation.
            </SectionHeading>
            <p className="ux-section-lead">
              Translate the work into a decision that is easy to review, challenge, and fund.
            </p>
            <Reveal className="ux-reco-strip" variant="up">
              <div>
                <span className="ux-reco-label">Recommendation status</span>
                <strong>Ready for decision</strong>
              </div>
              <span className="ux-reco-evidence">Evidence · value · feasibility · risk</span>
              <Link to="/contact" className="ux-reco-arrow" aria-label="Talk to the studio">
                <ArrowRight size={18} aria-hidden />
              </Link>
            </Reveal>
          </div>
        </section>

        {/* 19. Pricing */}
        <section id="editions" className="ux-section-dark ux-pricing-section">
          <div className="ux-container">
            <SectionHeading anim="ux-heading-up">Lite · Pro · Enterprise</SectionHeading>
            <div className="ux-pricing-grid">
              {PRICING.map((tier, i) => (
                <Reveal
                  key={tier.name}
                  className={`ux-price-card${tier.featured ? " is-featured" : ""}`}
                  delay={i * 80}
                  variant="up"
                >
                  {tier.badge && <span className="ux-price-badge">{tier.badge}</span>}
                  <h3>{tier.name}</h3>
                  <p>{tier.tagline}</p>
                  <ul>
                    {tier.features.map((f) => (
                      <li key={f}>
                        <Check size={14} aria-hidden /> {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    className={`ux-button ux-button-small${tier.featured ? " ux-button-gold" : " ux-button-ghost"}`}
                    to={tier.name === "Enterprise" ? "/enterprise" : "/auth"}
                  >
                    {tier.name === "Enterprise" ? "Talk to sales" : "Get started"}{" "}
                    <ArrowRight size={14} aria-hidden />
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* 20. Sovereign AI */}
        <section id="sovereign" className="ux-section-light ux-sovereign-section">
          <div className="ux-container ux-sovereign-layout">
            <div>
              <SectionHeading anim="ux-heading-up">
                Built For Ministries, Regulators
                <br />
                &amp; Public-Sector AI Programs.
              </SectionHeading>
              <p className="ux-lead">
                Move at the speed of innovation without losing the transparency, control, and public
                accountability your mandate requires. Regional and sovereign deployment remain on
                the roadmap; current pilots run as managed-cloud design-partner engagements.
              </p>
              <ul className="ux-checklist">
                <li>
                  <Check size={15} aria-hidden /> Localized governance and approval workflows.
                </li>
                <li>
                  <Check size={15} aria-hidden /> Evidence trails built for audit and review.
                </li>
                <li>
                  <Check size={15} aria-hidden /> Deployment policy controls for design-partner
                  pilots.
                </li>
              </ul>
              <Link className="ux-under-link" to="/enterprise">
                Explore enterprise AI <ArrowRight size={15} aria-hidden />
              </Link>
            </div>
            <Reveal className="ux-sovereign-visual" variant="scale" delay={100}>
              <img src={sovereignImage} alt="Secure managed-cloud infrastructure visual" />
              <div className="ux-sovereign-caption">
                <Lock size={14} aria-hidden /> Secure infrastructure
                <span>
                  <i aria-hidden /> Policy layer active
                </span>
              </div>
            </Reveal>
          </div>
        </section>

        {/* 21. Final CTA */}
        <section className="ux-section-light ux-cta-section" id="contact">
          <div className="ux-cta-orb" aria-hidden />
          <div className="ux-container ux-cta-content">
            <SectionHeading anim="ux-heading-scale">
              Your Next AI Decision <span className="ux-accent">Deserves Evidence,</span>
              <br />
              Not Opinion.
            </SectionHeading>
            <p>Start with one use case. Leave with a clearer path to value.</p>
            <Link
              className="ux-button ux-button-dark"
              to="/contact"
              onClick={() =>
                trackCTAEvent("cta_clicked", {
                  source_page: "/",
                  target_route: "/contact",
                  location: "landing_final_talk_studio",
                })
              }
            >
              Talk to the studio <ArrowRight size={17} aria-hidden />
            </Link>
          </div>
        </section>
      </main>

      <footer className="ux-footer ux-section-dark">
        <div className="ux-container ux-footer-top">
          <div>
            <BrandLink />
            <p className="ux-footer-tagline">AI use cases, made operational.</p>
          </div>
          <div className="ux-footer-tag">
            Discover better.
            <br />
            <span>Decide smarter.</span>
          </div>
        </div>
        <div className="ux-container ux-footer-cols">
          {FOOTER_COLS.map((col) => (
            <div key={col.title}>
              <h4>{col.title}</h4>
              <ul>
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.to ? (
                      <Link to={link.to as never}>{link.label}</Link>
                    ) : (
                      <a href={link.href}>{link.label}</a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="ux-container ux-footer-bottom">
          <span>© 2026 UseCasesX Studio by AIgilityX</span>
          <span>AI decisions with evidence.</span>
          <span>Built for responsible ambition.</span>
        </div>
      </footer>
    </div>
  );
}
