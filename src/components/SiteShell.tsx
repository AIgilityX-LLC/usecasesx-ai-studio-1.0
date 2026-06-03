import type { ReactNode } from "react";
import { TopNav } from "./TopNav";
import { UseCasesXFooter } from "./UseCasesXFooter";

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <TopNav />
      <main className="flex-1">{children}</main>
      <UseCasesXFooter />
    </div>
  );
}
