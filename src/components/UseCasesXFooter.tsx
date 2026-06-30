import { Link } from "@tanstack/react-router";

export function UseCasesXFooter() {
  return (
    <footer className="dark border-t border-border bg-background text-foreground">
      <div className="mx-auto grid max-w-[1400px] gap-10 px-6 py-12 md:grid-cols-4">
        <div>
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-primary/15 ring-1 ring-primary/40">
              <span className="font-mono text-[12px] font-black text-primary">UX</span>
            </div>
            <div>
              <div className="text-sm font-bold text-foreground">
                UseCasesX<span className="text-primary">™</span>
              </div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">by AIgilityX™</div>
            </div>
          </Link>
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">
            Global AI Use Cases Repository & Development Studio. Discover. Design. Validate. Govern. Scale.
          </p>
        </div>
        <FooterCol
          title="Platform"
          items={[
            { l: "Global Repository", to: "/repository" },
            { l: "Deployment Intelligence", to: "/insights" },
            { l: "AI Use Case Studio™", to: "/studio" },
            { l: "PortfolioX™", to: "/portfoliox" },
            { l: "RoadmapX™", to: "/roadmap" },
            { l: "Pattern Library", to: "/patterns" },
          ]}
        />
        <FooterCol
          title="Discover"
          items={[
            { l: "Explore Use Cases", to: "/repository" },
            { l: "Use Case Boards", to: "/boards" },
            { l: "FeasibilityX™", to: "/feasibility" },
            { l: "DataReadinessX™", to: "/data-readiness" },
            { l: "GovernanceX™", to: "/governance" },
            { l: "DecisionX™", to: "/decision" },
          ]}
        />
        <FooterCol
          title="Integrations"
          items={[
            { l: "SARPI™", to: "/sarpi" },
            { l: "AdvisorX™", to: "/advisorx" },
            { l: "CyberX C3G™", to: "/cyberx/c3g/intake" },
            { l: "API Integration", to: "/api-integration" },
          ]}
        />
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-6 py-4 text-[11px] text-muted-foreground">
          <span>
            © {new Date().getFullYear()} AIgilityX. UseCasesX™ — Global AI Use Cases Repository & Development Studio.
          </span>
          <div className="flex flex-wrap items-center gap-4">
            <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
            <Link to="/insights" className="hover:text-foreground">Insights</Link>
            <span className="hidden sm:inline">Discover · Design · Validate · Govern · Scale.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, items }: { title: string; items: { l: string; to: string }[] }) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-foreground">{title}</div>
      <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
        {items.map((i) => (
          <li key={i.l}>
            <Link to={i.to as never} className="hover:text-foreground">
              {i.l}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
