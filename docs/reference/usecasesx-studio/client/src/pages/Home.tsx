import { useEffect, useState } from "react";
import { ArrowRight, Check, ChevronDown, Command, Database, FileCheck2, Layers3, Menu, Network, Play, Radar, ShieldCheck, Sparkles, X } from "lucide-react";

const heroImage = "/manus-storage/usecasesx-hero_855a6f06.jpg";
const architectureImage = "/manus-storage/usecasesx-architecture_ee28f77c.jpg";

const navItems = ["Platform", "Use cases", "For teams", "Resources"];
const steps = [
  { no: "01", title: "Discover", copy: "Find the highest-leverage opportunities across your organization.", icon: Radar },
  { no: "02", title: "Design", copy: "Turn a promising idea into a clear, testable AI workflow.", icon: Layers3 },
  { no: "03", title: "Govern", copy: "Give every use case the controls, evidence, and owners it needs.", icon: ShieldCheck },
  { no: "04", title: "Deploy", copy: "Move from approved blueprint to measurable business value.", icon: Command },
];

const marquee = ["Strategy", "Operations", "Risk", "Customer experience", "Technology", "Public sector", "Healthcare"];

function Reveal({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return <div className={`reveal ${className}`} style={style}>{children}</div>;
}

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add("is-visible")), { threshold: 0.14 });
    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
    return () => { window.removeEventListener("scroll", onScroll); observer.disconnect(); };
  }, []);

  return (
    <div className="site-shell">
      <header className={`site-nav ${scrolled ? "is-scrolled" : ""}`}>
        <a href="#top" className="brand" aria-label="UseCasesX Studio home">
          <span className="brand-mark"><span /><span /><span /></span>
          <span>UseCases<span className="brand-x">X</span> <b>STUDIO</b></span>
        </a>
        <nav className="desktop-nav" aria-label="Primary navigation">
          {navItems.map((item) => <a key={item} href={`#${item.toLowerCase().replaceAll(" ", "-")}`}>{item}<ChevronDown size={13} /></a>)}
        </nav>
        <div className="nav-actions"><a className="nav-login" href="#contact">Sign in</a><a className="button button-gold button-small" href="#contact">Get started <ArrowRight size={14} /></a></div>
        <button className="menu-toggle" onClick={() => setMenuOpen((v) => !v)} aria-label="Toggle navigation">{menuOpen ? <X /> : <Menu />}</button>
      </header>
      {menuOpen && <div className="mobile-menu">{navItems.map((item) => <a key={item} href={`#${item.toLowerCase().replaceAll(" ", "-")}`} onClick={() => setMenuOpen(false)}>{item}</a>)}<a href="#contact" onClick={() => setMenuOpen(false)}>Get started <ArrowRight size={15} /></a></div>}

      <main id="top">
        <section className="hero section-dark">
          <div className="hero-image" style={{ backgroundImage: `url(${heroImage})` }} />
          <div className="hero-grid" />
          <div className="hero-content container">
            <Reveal className="eyebrow"><span className="eyebrow-dot" /> AI use cases, made operational</Reveal>
            <Reveal className="hero-title-wrap"><h1>Build a validated AI use case <em>before</em> you spend a dollar building it.</h1></Reveal>
            <Reveal className="hero-copy"><p>UseCasesX Studio helps ambitious teams move from AI curiosity to governed, measurable action—without the guesswork.</p></Reveal>
            <Reveal className="hero-actions"><a className="button button-gold" href="#contact">Explore the studio <ArrowRight size={17} /></a><a className="text-link" href="#platform"><span className="play-icon"><Play size={12} fill="currentColor" /></span> See how it works</a></Reveal>
            <Reveal className="hero-proof"><span>Trusted thinking for</span><b>Strategy teams</b><b>Innovation leaders</b><b>Risk &amp; governance</b></Reveal>
          </div>
          <div className="hero-scroll"><span>Scroll to explore</span><span className="scroll-line" /></div>
        </section>

        <section className="signal-strip section-dark"><div className="container signal-inner"><span className="signal-label">THE OPERATING SYSTEM FOR AI VALUE</span>{marquee.map((item) => <span key={item} className="signal-item"><i />{item}</span>)}</div></section>

        <section id="platform" className="section-light platform-section"><div className="container split-layout"><Reveal className="section-kicker">01 / The studio</Reveal><Reveal className="split-copy"><h2>The AI use case studio for <span>real-world impact.</span></h2><p className="lead">Most AI programs don’t fail because the technology is wrong. They fail because the use case was never made clear enough to earn belief.</p><p>UseCasesX brings the opportunity, the operating model, the safeguards, and the business case into one shared system of record.</p><a className="under-link" href="#how-it-works">Explore the platform <ArrowRight size={15} /></a></Reveal><Reveal className="architecture-card"><img src={architectureImage} alt="Layered AI architecture visual" /><div className="architecture-caption"><span className="pulse" /> Governance layer active <b>72%</b></div></Reveal></div></section>

        <section id="how-it-works" className="section-dark process-section"><div className="container"><Reveal className="section-intro"><div className="section-kicker">02 / From signal to system</div><h2>One platform.<br /><span>Every decision connected.</span></h2><p>Make the path from discovery to delivery visible, collaborative, and built for the scrutiny that serious AI deserves.</p></Reveal><div className="process-grid">{steps.map(({ no, title, copy, icon: Icon }, index) => <Reveal key={no} className="process-card" style={{ "--delay": `${index * 70}ms` } as React.CSSProperties}><div className="process-top"><span>{no}</span><Icon size={21} strokeWidth={1.5} /></div><h3>{title}</h3><p>{copy}</p><div className="process-line" /></Reveal>)}</div></div></section>

        <section className="section-light metrics-section"><div className="container metrics-layout"><Reveal className="metrics-copy"><div className="section-kicker">03 / The signal</div><h2>Make the case<br /><span>before the case is made.</span></h2><p>Align teams around a common language for value, feasibility, risk, and readiness.</p><a className="under-link" href="#contact">See the method <ArrowRight size={15} /></a></Reveal><Reveal className="metric-board"><div className="metric-header"><span>Portfolio readiness</span><span>Live signal <i className="green-dot" /></span></div><div className="metric-score"><strong>82</strong><span>/100<br /><small>validated index</small></span></div><div className="bar-row"><span>Business value</span><div><i style={{ width: "88%" }} /></div><b>88</b></div><div className="bar-row"><span>Delivery readiness</span><div><i style={{ width: "76%" }} /></div><b>76</b></div><div className="bar-row"><span>Governance fit</span><div><i style={{ width: "92%" }} /></div><b>92</b></div><div className="board-footer"><span><Check size={13} /> Evidence-backed</span><span><Check size={13} /> Owner assigned</span><span><Check size={13} /> Gate ready</span></div></Reveal></div></section>

        <section id="use-cases" className="section-dark usecase-section"><div className="container"><Reveal className="center-intro"><div className="section-kicker">04 / Use cases</div><h2>From broad ambition<br /><span>to board-ready recommendation.</span></h2><p>Explore a living library of high-value use cases, shaped for the context you actually operate in.</p></Reveal><div className="usecase-grid">{([{ no: "01", title: "Customer intelligence", copy: "Turn fragmented signals into a sharper view of customer needs.", icon: Database }, { no: "02", title: "Operational copilots", copy: "Design assistive workflows that compound team capacity.", icon: Network }, { no: "03", title: "Risk & compliance", copy: "Move from reactive controls to proactive confidence.", icon: FileCheck2 }]).map(({ no, title, copy, icon: Icon }) => <Reveal key={no} className="usecase-card"><div className="card-number">{no}</div><Icon size={25} strokeWidth={1.4} /><h3>{title}</h3><p>{copy}</p><a href="#contact"><ArrowRight size={16} /></a></Reveal>)}</div></div></section>

        <section className="section-light cta-section" id="contact"><div className="cta-orb" /><div className="container cta-content"><Reveal className="section-kicker">05 / Your next decision</Reveal><Reveal><h2>Your next AI decision<br /><i>deserves evidence.</i></h2><p>Start with one use case. Leave with a clearer path to value.</p><a className="button button-dark" href="mailto:hello@usecasesx.studio">Talk to the studio <ArrowRight size={17} /></a></Reveal></div></section>
      </main>

      <footer className="footer section-dark"><div className="container footer-top"><a href="#top" className="brand"><span className="brand-mark"><span /><span /><span /></span><span>UseCases<span className="brand-x">X</span> <b>STUDIO</b></span></a><div className="footer-tag">Discover better.<br /><span>Decide smarter.</span></div></div><div className="container footer-bottom"><span>© 2026 UseCasesX Studio</span><span>AI use cases, made operational.</span><span>Privacy&nbsp;&nbsp; Terms</span></div></footer>
    </div>
  );
}
