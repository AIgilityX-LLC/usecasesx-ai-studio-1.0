import { Link } from "@tanstack/react-router";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-foreground/5 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link to="/" className="text-lg font-bold tracking-tight text-foreground">
            AI<span className="text-primary">HUB</span>
          </Link>
          <nav className="hidden space-x-6 text-sm font-medium text-muted-foreground md:flex">
            <Link
              to="/"
              activeOptions={{ exact: true }}
              activeProps={{ className: "text-foreground underline decoration-primary decoration-2 underline-offset-4" }}
            >
              Repository
            </Link>
            <span className="opacity-50">Governance</span>
            <span className="opacity-50">Benchmarks</span>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/auth" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Log in
          </Link>
          <Link
            to="/submit"
            className="rounded-full bg-foreground px-5 py-2 text-sm font-semibold text-background transition-colors hover:bg-primary"
          >
            Submit Case
          </Link>
        </div>
      </div>
    </header>
  );
}
