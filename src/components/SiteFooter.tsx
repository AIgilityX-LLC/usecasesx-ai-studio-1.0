export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/60 bg-card/40">
      <div className="mx-auto max-w-[1400px] px-6 py-16">
        <div className="grid gap-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary">
              AIgilityX Sovereign Hub
            </div>
            <h2 className="mb-3 text-2xl font-bold leading-tight text-foreground md:text-3xl">
              The world's open registry of <span className="text-primary">governed AI in production</span>.
            </h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Curated and contributor-submitted deployments across government, telecom, healthcare,
              finance and energy — with maturity, impact, and evidence on every case.
            </p>
            <a
              href="/submit"
              className="mt-6 inline-flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-5 py-2.5 text-sm font-bold text-primary hover:bg-primary/20"
            >
              Become a contributor →
            </a>
          </div>
          <FooterCol
            title="Repository"
            items={["All Use Cases", "By Industry", "By Capability", "By Country", "Compare"]}
          />
          <FooterCol
            title="Platform"
            items={["About the Hub", "Methodology", "API Access", "Data Exports", "Contact"]}
          />
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-border/60 pt-6 text-xs text-muted-foreground md:flex-row md:items-center">
          <span>© 2026 AIgilityX. Sovereign AI Innovation Hub.</span>
          <span className="font-mono uppercase tracking-widest">hub.aigilityx.com / repository</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4 className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        {title}
      </h4>
      <ul className="space-y-2 text-sm text-foreground/80">
        {items.map((i) => (
          <li key={i} className="hover:text-primary cursor-pointer">
            {i}
          </li>
        ))}
      </ul>
    </div>
  );
}
