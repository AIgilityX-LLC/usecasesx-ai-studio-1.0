import { Layers, Building2, Target, Workflow } from "lucide-react";

export interface FacetOption {
  slug: string;
  name: string;
  count: number;
}

export interface RepositoryFacets {
  industries: FacetOption[];
  capabilities: FacetOption[];
  businessFunctions: FacetOption[];
  objectives: FacetOption[];
  processes: FacetOption[];
}

type CollectionKey = "industries" | "capabilities" | "businessFunctions" | "objectives";

const GROUPS: {
  key: CollectionKey;
  label: string;
  blurb: string;
  icon: typeof Layers;
}[] = [
  {
    key: "industries",
    label: "By industry",
    blurb: "Sector-specific AI opportunity packs.",
    icon: Building2,
  },
  {
    key: "capabilities",
    label: "By AI pattern",
    blurb: "Reusable solution archetypes.",
    icon: Layers,
  },
  {
    key: "businessFunctions",
    label: "By business function",
    blurb: "Where the value lands operationally.",
    icon: Workflow,
  },
  {
    key: "objectives",
    label: "By objective",
    blurb: "Outcomes the business is buying.",
    icon: Target,
  },
];

/**
 * Curated entry points built from real taxonomy links and real published
 * counts. Rendered only on the unfiltered repository view so first-time and
 * search-engine visitors land on meaningful, crawlable collections instead of
 * an undifferentiated list. Groups with no linked content are omitted.
 */
export function CuratedCollections({
  facets,
  onSelect,
  perGroup = 6,
}: {
  facets: RepositoryFacets;
  onSelect: (key: CollectionKey, slug: string, name: string) => void;
  perGroup?: number;
}) {
  const groups = GROUPS.map((g) => ({ ...g, options: (facets[g.key] ?? []).slice(0, perGroup) }))
    .filter((g) => g.options.length > 0);

  if (groups.length === 0) return null;

  return (
    <section aria-labelledby="curated-collections" className="mb-10">
      <h2
        id="curated-collections"
        className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground"
      >
        Start with a collection
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {groups.map((g) => {
          const Icon = g.icon;
          return (
            <div key={g.key} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <h3 className="text-sm font-bold text-foreground">{g.label}</h3>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{g.blurb}</p>
              <ul className="mt-3 space-y-1.5">
                {g.options.map((o) => (
                  <li key={o.slug}>
                    <button
                      type="button"
                      onClick={() => onSelect(g.key, o.slug, o.name)}
                      className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-[13px] font-medium text-foreground transition-colors hover:bg-secondary"
                    >
                      <span className="truncate">{o.name}</span>
                      <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                        {o.count}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
