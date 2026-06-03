import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/60 bg-card/40">
      <div className="mx-auto max-w-[1400px] px-6 py-16">
        <div className="grid gap-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary">
              UseCasesX™ · AIgilityX AI Use Case Studio™
            </div>
            <h2 className="mb-3 text-2xl font-bold leading-tight text-foreground md:text-3xl">
              Explore 100+ AI Use Cases for Your Industry —{" "}
              <span className="text-primary">find what to automate, govern, and scale next.</span>
            </h2>
            <p className="max-w-md text-sm text-muted-foreground">
              The AI opportunity intelligence layer of AIgilityX — discover, save, score, prioritise,
              and report AI use cases across industries and business functions.
            </p>
            <Link
              to="/auth"
              className="mt-6 inline-flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-5 py-2.5 text-sm font-bold text-primary hover:bg-primary/20"
            >
              Create Free Pro Account →
            </Link>
          </div>
          <FooterCol
            title="Discover"
            items={[
              { label: "Explore Use Cases", href: "/explore" },
              { label: "By Industry", href: "/explore" },
              { label: "By AI Type", href: "/explore" },
              { label: "By Business Function", href: "/explore" },
              { label: "Featured", href: "/explore?sort=featured" },
            ]}
          />
          <FooterCol
            title="UseCasesX Modules"
            items={[
              { label: "AI Use Case Studio™", href: "/studio" },
              { label: "SARPI™", href: "/sarpi" },
              { label: "AdvisorX™", href: "/advisorx" },
              { label: "CyberX C3G™", href: "/cyberx/c3g/intake" },
              { label: "Pricing", href: "/pricing" },
            ]}
          />
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-border/60 pt-6 text-xs text-muted-foreground md:flex-row md:items-center">
          <span>© 2026 AIgilityX™. UseCasesX™ — Global AI Use Cases Repository &amp; Development Studio.</span>
          <span className="font-mono uppercase tracking-widest">usecasex.aigilityx</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  items,
}: {
  title: string;
  items: Array<{ label: string; href: string }>;
}) {
  return (
    <div>
      <h4 className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        {title}
      </h4>
      <ul className="space-y-2 text-sm text-foreground/80">
        {items.map((i) =>
          i.href.startsWith("http") ? (
            <li key={i.label}>
              <a
                href={i.href}
                target="_blank"
                rel="noreferrer"
                className="hover:text-primary"
              >
                {i.label}
              </a>
            </li>
          ) : (
            <li key={i.label}>
              <a href={i.href} className="hover:text-primary">
                {i.label}
              </a>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
