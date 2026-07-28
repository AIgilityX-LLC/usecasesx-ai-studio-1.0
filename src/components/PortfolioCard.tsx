import type { Portfolio } from "@/lib/usecasex.data";

export function PortfolioCard({ p, onOpen }: { p: Portfolio; onOpen?: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="group block w-full rounded-xl border border-border bg-card p-5 text-left shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--shadow-elegant)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
            {p.objective}
          </div>
          <h3 className="mt-2 text-base font-bold text-foreground group-hover:text-primary">
            {p.name}
          </h3>
        </div>
        <div className="rounded-full bg-primary/10 px-3 py-1 font-mono text-sm font-bold text-primary">
          {p.avgScore}
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-border pt-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        <span>{p.itemCount} use cases</span>
        <span>Updated {p.updatedAt}</span>
      </div>
    </button>
  );
}
