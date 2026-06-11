import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { AppBreadcrumb } from "./AppBreadcrumb";
import { UseCasesXFooter } from "./UseCasesXFooter";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { supabase } from "@/integrations/supabase/client";

export function SiteShell({ children }: { children: ReactNode }) {
  const session = useSupabaseSession();
  const isAuthed = !!session;

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
        {headerInner}
        <main className="flex-1">{children}</main>
        <UseCasesXFooter />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <div className="dark">
          <AppSidebar />
        </div>
        <SidebarInset className="flex min-w-0 flex-1 flex-col">
          {headerInner}
          <main className="flex-1">{children}</main>
          <UseCasesXFooter />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
