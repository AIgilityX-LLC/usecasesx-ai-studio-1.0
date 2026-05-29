import type { ReactNode } from "react";
import { AIHubNavbar } from "./AIHubNavbar";
import { Link } from "@tanstack/react-router";

export function AppShell({ children, subNav }: { children: ReactNode; subNav?: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AIHubNavbar />
      {subNav}
      <main className="flex-1">{children}</main>
      <AppFooter />
    </div>
  );
}

function AppFooter() {
  return (
    <footer className="border-t border-border bg-secondary/40">
      <div className="mx-auto grid max-w-[1400px] gap-10 px-6 py-12 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground font-mono text-[12px] font-bold">AI</div>
            <div>
              <div className="text-sm font-bold text-foreground">AIgilityX</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Sovereign AI Ecosystems</div>
            </div>
          </div>
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">
            UseCaseX™ — the global AI use cases repository for executives, public sector leaders, and AI teams.
          </p>
        </div>
        <FooterCol title="UseCaseX" items={[
          { l: "Home", to: "/ai-hub/usecasex" },
          { l: "Explore", to: "/ai-hub/usecasex/explore" },
          { l: "Get Pro — Free", to: "/ai-hub/usecasex/pro" },
          { l: "API Integration", to: "/ai-hub/usecasex/api-integration-preview" },
        ]} />
        <FooterCol title="AI Hub" items={[
          { l: "Hub Home", to: "/ai-hub" },
          { l: "AI Readiness", to: "/ai-hub" },
          { l: "AI ROI Calculator", to: "/ai-hub" },
          { l: "Governance Toolkit", to: "/ai-hub" },
        ]} />
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-foreground">Sovereign AI Ecosystems</div>
          <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
            {["SARPI™","CyberX C3G™","AdvisorX™","FlowX™","PrivacyX™","AssureX™","AuditX™","RegulatorX™","ComplyX™","ARES™","ConversX™","SimulaX™"].map((p) => (
              <span key={p} className="rounded border border-border bg-background px-1.5 py-0.5">{p}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-2 px-6 py-4 text-[11px] text-muted-foreground">
          <span>© {new Date().getFullYear()} AIgilityX. UseCaseX™ is part of the AIgilityX AI Hub.</span>
          <span>Built for executives, public sector leaders, and AI teams.</span>
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
            <Link to={i.to as never} className="hover:text-foreground">{i.l}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
