import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { UseCasesXFooter } from "./UseCasesXFooter";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { supabase } from "@/integrations/supabase/client";

export function SiteShell({ children }: { children: ReactNode }) {
  const session = useSupabaseSession();
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <AppSidebar />
        <SidebarInset className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-background/85 px-4 backdrop-blur">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <div className="hidden text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground sm:block">
                Global AI Use Cases Repository
              </div>
            </div>
            <div className="flex items-center gap-2">
              {session ? (
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
                to="/pro"
                className="rounded-md bg-primary px-3.5 py-1.5 text-[13px] font-bold text-primary-foreground hover:brightness-110"
              >
                Get Pro — Free
              </Link>
            </div>
          </header>
          <main className="flex-1">{children}</main>
          <UseCasesXFooter />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
