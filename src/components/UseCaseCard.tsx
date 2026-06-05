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
  complexity?: string | null;
  risk_level?: string | null;
  visibility?: string | null;
  use_case_industries?: Array<{ industries?: Tag | null }> | null;
  use_case_capabilities?: Array<{ ai_capabilities?: Tag | null }> | null;
  use_case_business_functions?: Array<{ business_functions?: Tag | null }> | null;
}

function accessTier(v?: string | null) {
  if (v === "pro") return { label: "Pro", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" };
  if (v === "both") return { label: "Pro + Lite", cls: "bg-primary/10 text-primary" };
  return { label: "Free", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" };
}

export function UseCaseCard({
  c,
  onSave,
  saved,
  onAddToBoard,
  locked,
}: {
  c: UseCaseCardData;
  onSave?: () => void;
  saved?: boolean;
  onAddToBoard?: (c: UseCaseCardData) => void;
  locked?: boolean;
}) {
  const industryEntries = (c.use_case_industries ?? [])
    .map((x) => ({ slug: x.industries?.slug, name: x.industries?.name }))
    .filter((x) => x.slug && x.name) as { slug: string; name: string }[];
  const functionEntries = (c.use_case_business_functions ?? [])
    .map((x) => ({ slug: x.business_functions?.slug, name: x.business_functions?.name }))
    .filter((x) => x.slug && x.name) as { slug: string; name: string }[];

  const primaryIndustry = industryEntries[0];
  const primaryFunction = functionEntries[0];
  const capabilities = (c.use_case_capabilities ?? []).map((x) => x.ai_capabilities?.name).filter(Boolean) as string[];
  const aiType = capabilities[0];
  const tier = accessTier(c.visibility);

  // Forward both Industry (primary) and Department (= business function) context
  // through navigation so breadcrumbs and back-links can restore the active filter.
  const detailSearch =
    primaryIndustry || primaryFunction
      ? ({
          ...(primaryIndustry ? { dept: primaryIndustry.slug } : {}),
          ...(primaryFunction ? { func: primaryFunction.slug } : {}),
        } as any)
      : undefined;

  return (
    <div className="group relative flex flex-col rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--shadow-elegant)]">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {primaryIndustry && (
            <span
              className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary"
              title="Industry"
            >
              {primaryIndustry.name}
            </span>
          )}
          {primaryFunction && (
            <span
              className="rounded-md bg-violet-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400"
              title="Department"
            >
              {primaryFunction.name}
            </span>
          )}
          {aiType && (
            <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {aiType}
            </span>
          )}
        </div>
        <span className={"inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest " + tier.cls}>
          {tier.label}
        </span>
      </div>

      <Link to="/use-cases/$slug" params={{ slug: c.slug }} search={detailSearch} className="block">
        <h3 className="text-base font-bold leading-snug text-foreground transition-colors group-hover:text-primary">{c.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-3">{c.summary}</p>
      </Link>

      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        <div>Value<div className="mt-0.5 text-primary">{c.value_potential ?? "—"}</div></div>
        <div>Complexity<div className="mt-0.5 text-foreground/80">{c.complexity ?? "—"}</div></div>
        <div>Risk<div className="mt-0.5 text-foreground/80">{c.risk_level ?? "—"}</div></div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
        <Link
          to="/use-cases/$slug"
          params={{ slug: c.slug }}
          search={detailSearch}
          className="text-[11px] font-bold uppercase tracking-widest text-primary hover:underline"
        >
          View Pattern →
        </Link>
        {onAddToBoard ? (
          <button
            onClick={() => onAddToBoard(c)}
            className={
              "rounded-md px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest transition-colors " +
              (locked
                ? "border border-amber-500/40 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400"
                : "bg-primary text-primary-foreground hover:brightness-110")
            }
          >
            {locked ? "Upgrade to Add" : "+ Add to Studio Board"}
          </button>
        ) : onSave ? (
          <button onClick={onSave} className={"text-[11px] font-bold uppercase tracking-widest " + (saved ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
            {saved ? "★ Saved" : "☆ Save"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
