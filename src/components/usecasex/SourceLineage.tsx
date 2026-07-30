import { BadgeCheck, Users, Bot, Building2 } from "lucide-react";

export type LineageKind = "curated" | "community" | "workspace" | "ai_generated";

interface SourceLineageProps {
  /** `submitted_by` on the global record: null → curated by the AIgilityX team. */
  submittedBy?: string | null;
  organization?: string | null;
  region?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  /** Reference links attached to the record. */
  links?: { id?: string; label?: string | null; url: string; kind?: string | null }[];
}

const LINEAGE: Record<
  LineageKind,
  { label: string; description: string; icon: typeof BadgeCheck }
> = {
  curated: {
    label: "Curated global entry",
    description:
      "Maintained in the global UseCasesX™ repository by the AIgilityX editorial team. Read-only — customizing creates your own private copy.",
    icon: BadgeCheck,
  },
  community: {
    label: "Community contribution",
    description:
      "Contributed by a UseCasesX™ member and reviewed before publication. Read-only — customizing creates your own private copy.",
    icon: Users,
  },
  workspace: {
    label: "Private workspace draft",
    description: "Owned by your workspace. Only workspace members can see it.",
    icon: Building2,
  },
  ai_generated: {
    label: "AI-assisted content",
    description: "Generated with AI assistance and pending human validation.",
    icon: Bot,
  },
};

function formatDate(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/**
 * Source & provenance panel — makes the origin of every repository entry
 * explicit so readers know what is curated global content versus their own
 * private material.
 */
export function SourceLineage({
  submittedBy,
  organization,
  region,
  publishedAt,
  updatedAt,
  links = [],
}: SourceLineageProps) {
  const kind: LineageKind = submittedBy ? "community" : "curated";
  const meta = LINEAGE[kind];
  const Icon = meta.icon;
  const published = formatDate(publishedAt);
  const updated = formatDate(updatedAt);
  const externalLinks = links.filter((l) => !!l.url);

  const facts: { label: string; value: string }[] = [];
  if (organization) facts.push({ label: "Reference organization", value: organization });
  if (region) facts.push({ label: "Region", value: region });
  if (published) facts.push({ label: "Published", value: published });
  if (updated) facts.push({ label: "Last reviewed", value: updated });

  return (
    <section aria-labelledby="source-lineage-heading">
      <div className="text-[11px] font-bold uppercase tracking-widest text-primary">
        Source &amp; provenance
      </div>
      <h2 id="source-lineage-heading" className="mt-1 text-xl font-bold text-foreground">
        Where this entry comes from
      </h2>
      <div className="mt-4 rounded-2xl border border-border bg-card/60 p-5">
        <div className="flex items-start gap-3">
          <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground">{meta.label}</div>
            <p className="mt-1 text-sm text-muted-foreground">{meta.description}</p>
          </div>
        </div>

        {facts.length > 0 && (
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            {facts.map((f) => (
              <div key={f.label}>
                <dt className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {f.label}
                </dt>
                <dd className="mt-0.5 text-sm text-foreground">{f.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {externalLinks.length > 0 && (
          <div className="mt-5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              References
            </div>
            <ul className="mt-2 space-y-1.5">
              {externalLinks.map((l) => (
                <li key={l.id ?? l.url}>
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary underline underline-offset-4 hover:opacity-80"
                  >
                    {l.label || l.url}
                  </a>
                  {l.kind && (
                    <span className="ml-2 text-[11px] uppercase tracking-widest text-muted-foreground">
                      {l.kind}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
