import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { AppBreadcrumb } from "./AppBreadcrumb";
import { UseCasesXFooter } from "./UseCasesXFooter";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { supabase } from "@/integrations/supabase/client";

const TOP_NAV: { to: string; label: string }[] = [
  { to: "/", label: "Home" },
  { to: "/repository", label: "Explore" },
  { to: "/insights", label: "Insights" },
  { to: "/patterns", label: "Patterns" },
  { to: "/ai-use-case-studio", label: "Studio" },
  { to: "/resources", label: "Resources" },
  { to: "/pricing", label: "Pricing" },
];

export function SiteShell({ children }: { children: ReactNode }) {
  const session = useSupabaseSession();
  const isAuthed = !!session;

  // Dev-only guard: SiteShell is the single source of navigation. If more than
  // one SiteShell mounts at once, a page is rendering a duplicate nav bar.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const w = window as unknown as { __siteShellCount?: number };
    w.__siteShellCount = (w.__siteShellCount ?? 0) + 1;
    if (w.__siteShellCount > 1) {
      console.error(
        `[SiteShell] ${w.__siteShellCount} navigation shells are mounted at once. ` +
          "A page is rendering its own nav in addition to the shared SiteShell. " +
          "Remove the duplicate layout wrapper.",
      );
    }
    return () => {
      w.__siteShellCount = (w.__siteShellCount ?? 1) - 1;
    };
  }, []);

  const headerInner = (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-background/85 px-4 backdrop-blur">
      <div className="flex min-w-0 items-center gap-3">
        {isAuthed && <SidebarTrigger />}
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-primary/15 ring-1 ring-primary/40">
            <span className="font-mono text-[11px] font-black text-primary">UX</span>
          </div>
          <div className="hidden text-[11px] font-bold uppercase tracking-[0.18em] text-foreground sm:block">
            UseCasesX™ <span className="text-muted-foreground">· AIgilityX AI Use Case Studio™</span>
          </div>
        </Link>
        {isAuthed && (
          <>
            <div className="hidden h-5 w-px bg-border md:block" />
            <AppBreadcrumb />
          </>
        )}
      </div>
      {/* Top nav is only shown to signed-out visitors. Once signed in, the
          sidebar is the single source of navigation to avoid duplicate menus. */}
      {!isAuthed && (
        <nav aria-label="Primary" className="hidden items-center gap-0.5 lg:flex">
          {TOP_NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to as never}
              activeOptions={{ exact: item.to === "/" }}
              activeProps={{ className: "bg-primary/10 text-primary" }}
              className="rounded-md px-2.5 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
      <div className="flex items-center gap-2">
        {isAuthed ? (
          <button
            onClick={() => supabase.auth.signOut()}
            className="hidden rounded-md border border-border px-3 py-1.5 text-[13px] font-medium hover:bg-secondary sm:inline-flex"
          >
            Sign out
          </button>
        ) : (
          <Link
            to="/auth"
            className="hidden rounded-md border border-border px-3 py-1.5 text-[13px] font-medium hover:bg-secondary sm:inline-flex"
          >
            Sign in
          </Link>
        )}
        <Link
          to="/pricing"
          className="rounded-md bg-primary px-3.5 py-1.5 text-[13px] font-bold text-primary-foreground hover:brightness-110"
        >
          {isAuthed ? "Plans" : "Get Pro — Free"}
        </Link>
      </div>
    </header>
  );

  if (!isAuthed) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
        <SkipToContent />
        {headerInner}
        <main id="main-content" tabIndex={-1} className="flex-1 outline-none">{children}</main>
        <UseCasesXFooter />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <SkipToContent />
        <div className="dark">
          <AppSidebar />
        </div>
        <SidebarInset className="flex min-w-0 flex-1 flex-col">
          {headerInner}
          <main id="main-content" tabIndex={-1} className="flex-1 outline-none">{children}</main>
          <UseCasesXFooter />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:outline-none focus:ring-2 focus:ring-ring"
    >
      Skip to main content
    </a>
  );
}
