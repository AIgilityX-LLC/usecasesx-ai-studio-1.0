import { Link } from "@tanstack/react-router";
import { INDUSTRIES } from "@/lib/usecasex.data";

export function IndustryFocusedSection() {
  return (
    <section className="border-b border-border bg-secondary/40">
      <div className="mx-auto max-w-[1400px] px-6 py-16">
        <div className="max-w-2xl">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Explore by industry</div>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">18+ industries. One repository.</h2>
          <p className="mt-2 text-muted-foreground">Jump straight to the AI use cases that move the needle in your sector — from banking risk to citizen services.</p>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {INDUSTRIES.map((ind) => (
            <Link
              key={ind.slug}
              to="/ai-hub/usecasex/explore"
              search={{ industries: [ind.slug] }}
              className="group flex flex-col justify-between rounded-lg border border-border bg-card p-4 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--shadow-elegant)]"
            >
              <span className="text-sm font-bold text-foreground transition-colors group-hover:text-primary">{ind.name}</span>
              <span className="mt-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">View cases →</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
