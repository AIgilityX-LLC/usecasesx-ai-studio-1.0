import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

/**
 * Signed-out mobile navigation. The desktop top nav is `hidden lg:flex`, so
 * without this, visitors below 1024px had no way to reach Explore, Insights,
 * Patterns, Studio or Resources. Signed-in users use the sidebar's own
 * off-canvas sheet instead.
 */
export function MobileNav({ items }: { items: { to: string; label: string }[] }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Open navigation menu"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
      >
        <Menu className="h-4 w-4" aria-hidden />
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <SheetHeader>
          <SheetTitle className="text-left text-sm font-bold uppercase tracking-[0.18em]">
            UseCasesX™
          </SheetTitle>
        </SheetHeader>
        <nav aria-label="Mobile" className="mt-4 flex flex-col gap-1">
          {items.map((item) => (
            <Link
              key={item.to}
              to={item.to as never}
              onClick={() => setOpen(false)}
              activeOptions={{ exact: item.to === "/" }}
              activeProps={{ className: "bg-primary/10 text-primary" }}
              className="rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {item.label}
            </Link>
          ))}
          <Link
            to="/auth"
            onClick={() => setOpen(false)}
            className="mt-3 rounded-md bg-primary px-3 py-2.5 text-center text-sm font-bold text-primary-foreground hover:brightness-110"
          >
            Sign in
          </Link>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
