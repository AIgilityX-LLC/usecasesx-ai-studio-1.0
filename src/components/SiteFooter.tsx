export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-foreground/5 bg-white py-12">
      <div className="mx-auto max-w-7xl px-6 text-center">
        <h2 className="mb-4 text-2xl font-bold">Shape the future of public AI</h2>
        <p className="mx-auto mb-8 max-w-md text-muted-foreground">
          Join government bodies and enterprises sharing real AI deployment benchmarks.
        </p>
        <a
          href="/submit"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-4 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:scale-105"
        >
          Request Contributor Access
          <span className="h-2 w-2 rounded-full bg-primary-foreground" />
        </a>
      </div>
    </footer>
  );
}
