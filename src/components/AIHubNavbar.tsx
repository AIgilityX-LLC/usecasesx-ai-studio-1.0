import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HUB_MODULES } from "@/lib/usecasex.data";

export function AIHubNavbar() {
  const { location } = useRouterState();
  const [email, setEmail] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user.email ?? null));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setEmail(s?.user.email ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-6 px-6">
        <Link to="/ai-hub" className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <span className="font-mono text-[13px] font-bold">AI</span>
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold tracking-tight text-foreground">AIgilityX</div>
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">AI Hub</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {HUB_MODULES.map((m) => {
            const isActive = m.slug === "usecasex"
              ? location.pathname.startsWith("/ai-hub/usecasex")
              : m.slug === "home"
                ? location.pathname === "/ai-hub"
                : false;
            return (
              <Link
                key={m.slug}
                to={m.to}
                className={
                  "rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors " +
                  (isActive
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground")
                }
              >
                {m.name}
                {!m.live && (
                  <span className="ml-1.5 inline-flex h-1.5 w-1.5 rounded-full bg-accent" title="Coming soon" />
                )}
              </Link>
            );
          })}
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
            to="/ai-hub/usecasex/pro"
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
            {HUB_MODULES.map((m) => (
              <Link
                key={m.slug}
                to={m.to}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"
              >
                {m.name}
                {!m.live && <span className="ml-2 text-[10px] uppercase tracking-widest text-muted-foreground">Soon</span>}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
