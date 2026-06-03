import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ADMIN_TIER_ROLES } from "@/lib/usecasex.roles";

interface NavItem { to: string; label: string; admin?: boolean; auth?: boolean; }

const PRIMARY: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", auth: true },
  { to: "/repository", label: "Global Repository" },
  { to: "/studio", label: "AI Use Case Studio™", auth: true },
  { to: "/my-use-cases", label: "My Use Cases", auth: true },
  { to: "/reports", label: "Reports", auth: true },
];

const MODULES: NavItem[] = [
  { to: "/boards", label: "Use Case Boards", auth: true },
  { to: "/patterns", label: "Pattern Library" },
  { to: "/feasibility", label: "FeasibilityX™", auth: true },
  { to: "/data-readiness", label: "DataReadinessX™", auth: true },
  { to: "/blueprint", label: "BlueprintX™", auth: true },
  { to: "/portfoliox", label: "PortfolioX™", auth: true },
  { to: "/roadmap", label: "RoadmapX™", auth: true },
  { to: "/impact-assessment", label: "ImpactAssessmentX™", auth: true },
  { to: "/governance", label: "GovernanceX™", auth: true },
  { to: "/decision", label: "DecisionX™", auth: true },
  { to: "/sarpi", label: "SARPI™" },
  { to: "/advisorx", label: "AdvisorX™" },
  { to: "/cyberx/c3g/intake", label: "CyberX C3G™" },
];

export function TopNav() {
  const { location } = useRouterState();
  const [email, setEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const [modOpen, setModOpen] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!active) return;
      const uid = sess.session?.user.id;
      setEmail(sess.session?.user.email ?? null);
      if (!uid) { setIsAdmin(false); return; }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid).in("role", [...ADMIN_TIER_ROLES]);
      if (active) setIsAdmin(!!data && data.length > 0);
    };
    load();
    const { data } = supabase.auth.onAuthStateChange(() => load());
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);

  const isActive = (to: string) => to === "/" ? location.pathname === to : location.pathname.startsWith(to);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-6 px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-primary/15 ring-1 ring-primary/40">
            <span className="font-mono text-[13px] font-black text-primary">UX</span>
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold tracking-tight text-foreground">
              UseCasesX<span className="text-primary">™</span>
            </div>
            <div className="text-[9px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              by AIgilityX™
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-0.5 lg:flex">
          {PRIMARY.map((i) => (
            <Link
              key={i.to}
              to={i.to as never}
              className={"rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors " +
                (isActive(i.to) ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground")}
            >
              {i.label}
            </Link>
          ))}
          <div className="relative">
            <button
              onClick={() => setModOpen((v) => !v)}
              onBlur={() => setTimeout(() => setModOpen(false), 150)}
              className="rounded-md px-2.5 py-1.5 text-[13px] font-medium text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
            >
              Modules ▾
            </button>
            {modOpen && (
              <div className="absolute right-0 top-full mt-1 w-64 rounded-lg border border-border bg-background p-2 shadow-lg">
                <div className="grid grid-cols-1 gap-0.5">
                  {MODULES.map((i) => (
                    <Link
                      key={i.to}
                      to={i.to as never}
                      onClick={() => setModOpen(false)}
                      className="rounded-md px-3 py-1.5 text-[13px] font-medium text-foreground hover:bg-secondary"
                    >
                      {i.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
          {isAdmin && (
            <Link
              to="/administration"
              className={"rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors " +
                (isActive("/administration") ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground")}
            >
              Administration
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {email ? (
            <button
              onClick={() => supabase.auth.signOut()}
              className="hidden rounded-md border border-border px-3 py-1.5 text-[13px] font-medium text-foreground hover:bg-secondary md:inline-flex"
            >
              Sign out
            </button>
          ) : (
            <Link
              to="/auth"
              className="hidden rounded-md border border-border px-3 py-1.5 text-[13px] font-medium text-foreground hover:bg-secondary md:inline-flex"
            >
              Sign in
            </Link>
          )}
          <Link
            to="/pro"
            className="rounded-md bg-primary px-3.5 py-1.5 text-[13px] font-bold text-primary-foreground shadow-sm transition-all hover:brightness-110"
          >
            Get Pro — Free
          </Link>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
            className="grid h-9 w-9 place-items-center rounded-md border border-border lg:hidden"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-border bg-background lg:hidden">
          <nav className="mx-auto flex max-w-[1400px] flex-col px-4 py-3">
            {[...PRIMARY, ...MODULES, ...(isAdmin ? [{ to: "/administration", label: "Administration" }] : [])].map((i) => (
              <Link
                key={i.to}
                to={i.to as never}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"
              >
                {i.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
