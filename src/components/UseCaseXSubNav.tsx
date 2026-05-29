import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface NavItem { to: string; label: string; pro?: boolean; admin?: boolean; }

const ITEMS: NavItem[] = [
  { to: "/ai-hub/usecasex", label: "UseCaseX Home" },
  { to: "/ai-hub/usecasex/explore", label: "Explore Use Cases" },
  { to: "/ai-hub/usecasex/dashboard", label: "Pro Dashboard", pro: true },
  { to: "/ai-hub/usecasex/saved", label: "Saved Use Cases", pro: true },
  { to: "/ai-hub/usecasex/portfolio", label: "AI Opportunity Portfolio", pro: true },
  { to: "/ai-hub/usecasex/reports", label: "Reports", pro: true },
  { to: "/ai-hub/usecasex/api-integration-preview", label: "API Integration Preview" },
  { to: "/ai-hub/usecasex/admin", label: "Admin", admin: true },
];

export function UseCaseXSubNav() {
  const { location } = useRouterState();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let active = true;
    const check = async () => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id;
      if (!uid) { if (active) setIsAdmin(false); return; }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid).eq("role", "admin").maybeSingle();
      if (active) setIsAdmin(!!data);
    };
    check();
    const { data } = supabase.auth.onAuthStateChange(() => check());
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);

  const items = ITEMS.filter((i) => !i.admin || isAdmin);

  return (
    <div className="border-b border-border bg-secondary/40">
      <div className="mx-auto max-w-[1400px] px-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Link to="/ai-hub/usecasex" className="flex items-center gap-2 py-3">
              <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">UseCaseX™</span>
              <span className="hidden text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground sm:inline">Global AI Use Cases Repository</span>
            </Link>
          </div>
        </div>
        <nav className="-mx-1 flex gap-1 overflow-x-auto pb-2 pt-1">
          {items.map((i) => {
            const isActive = i.to === "/ai-hub/usecasex"
              ? location.pathname === i.to
              : location.pathname.startsWith(i.to);
            return (
              <Link
                key={i.to}
                to={i.to as never}
                className={
                  "whitespace-nowrap rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-colors " +
                  (isActive
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-background/60 hover:text-foreground")
                }
              >
                {i.label}
                {i.pro && <span className="ml-1.5 text-[9px] font-bold uppercase tracking-widest text-primary">Pro</span>}
                {i.admin && <span className="ml-1.5 text-[9px] font-bold uppercase tracking-widest text-accent-foreground/80">Admin</span>}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
