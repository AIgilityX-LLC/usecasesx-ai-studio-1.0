import { Link } from "@tanstack/react-router";

type Tag = { slug?: string; name?: string };

export interface UseCaseCardData {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  organization?: string | null;
  region?: string | null;
  maturity?: string | null;
  impact_score?: number | null;
  maturity_score?: number | null;
  value_potential?: string | null;
  use_case_industries?: Array<{ industries?: Tag | null }> | null;
  use_case_capabilities?: Array<{ ai_capabilities?: Tag | null }> | null;
}

export function UseCaseCard({ c, onSave, saved }: { c: UseCaseCardData; onSave?: () => void; saved?: boolean }) {
  const industries = (c.use_case_industries ?? []).map((x) => x.industries?.name).filter(Boolean) as string[];
  const capabilities = (c.use_case_capabilities ?? []).map((x) => x.ai_capabilities?.name).filter(Boolean) as string[];
  const isLive = c.maturity === "scaled" || c.maturity === "production";
  const maturityLabel = c.maturity ? c.maturity.charAt(0).toUpperCase() + c.maturity.slice(1) : "—";

  return (
    <div className="group relative flex flex-col rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--shadow-elegant)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {industries.slice(0, 1).map((t) => (
            <span key={t} className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">{t}</span>
          ))}
        </div>
        <span className={"inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest " + (isLive ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground")}>
          <span className={"h-1.5 w-1.5 rounded-full " + (isLive ? "bg-primary" : "bg-muted-foreground/50")} />
          {maturityLabel}
        </span>
      </div>

      <Link to="/ai-hub/usecasex/$slug" params={{ slug: c.slug }} className="block">
        <h3 className="text-base font-bold leading-snug text-foreground transition-colors group-hover:text-primary">{c.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-3">{c.summary}</p>
      </Link>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {capabilities.slice(0, 3).map((t) => (
          <span key={t} className="rounded border border-border bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{t}</span>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-[11px]">
        <div className="flex gap-3 font-bold uppercase tracking-widest text-muted-foreground">
          {c.impact_score ? <span>Impact <span className="text-primary">{c.impact_score}/5</span></span> : null}
          {c.maturity_score ? <span>Maturity <span className="text-primary">{c.maturity_score}/5</span></span> : null}
        </div>
        {onSave ? (
          <button onClick={onSave} className={"text-[11px] font-bold uppercase tracking-widest " + (saved ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
            {saved ? "★ Saved" : "☆ Save"}
          </button>
        ) : (
          <Link to="/ai-hub/usecasex/$slug" params={{ slug: c.slug }} className="text-[11px] font-bold uppercase tracking-widest text-primary opacity-0 transition-opacity group-hover:opacity-100">View →</Link>
        )}
      </div>
    </div>
  );
}
