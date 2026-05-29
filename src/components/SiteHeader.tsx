import { Link } from "@tanstack/react-router";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-6">
        <div className="flex items-center gap-10">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-primary/15 ring-1 ring-primary/40">
              <span className="font-mono text-[13px] font-black text-primary">UX</span>
            </div>
            <div className="leading-tight">
              <div className="text-sm font-bold tracking-tight text-foreground">
                UseCaseX<span className="text-primary">™</span>
              </div>
              <div className="text-[9px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                AIgilityX AI Hub™
              </div>
            </div>
          </Link>
          <nav className="hidden items-center gap-1 text-sm font-medium md:flex">
            <Link
              to="/"
              activeOptions={{ exact: true }}
              activeProps={{ className: "bg-primary/10 text-primary" }}
              className="rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground"
            >
              Home
            </Link>
            <Link
              to="/explore"
              activeProps={{ className: "bg-primary/10 text-primary" }}
              className="rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground"
            >
              Explore Use Cases
            </Link>
            <a
              href="https://hub.aigilityx.com"
              target="_blank"
              rel="noreferrer"
              className="rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground"
            >
              AI Hub ↗
            </a>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary md:inline-flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            UseCaseX Free
          </span>
          <Link to="/auth" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Sign in
          </Link>
          <Link
            to="/auth"
            className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-[0_0_20px_oklch(0.82_0.13_210/0.35)] transition-all hover:shadow-[0_0_30px_oklch(0.82_0.13_210/0.6)]"
          >
            Create Free Pro Account →
          </Link>
        </div>
      </div>
    </header>
  );
}
