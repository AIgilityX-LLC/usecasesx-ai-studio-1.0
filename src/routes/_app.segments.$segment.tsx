import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listUseCases } from "@/lib/use-cases.functions";
import { getSegment, sectorsForSegment, SEGMENTS } from "@/lib/segments";
import { UseCaseCard, type UseCaseCardData } from "@/components/UseCaseCard";
import { PageHero } from "@/components/usecasex/PageHero";
import { CtaTriad } from "@/components/usecasex/CtaTriad";
import { MissingDataFallback } from "@/components/MissingDataFallback";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";

export const Route = createFileRoute("/_app/segments/$segment")({
  head: ({ params }) => {
    const seg = getSegment(params.segment);
    const title = seg ? `${seg.name} — UseCasesX™` : "Segment — UseCasesX™";
    const desc = seg?.blurb ?? "AI use cases by market segment.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
      ],
    };
  },
  loader: ({ params }) => {
    if (!getSegment(params.segment)) throw notFound();
  },
  component: SegmentPage,
  errorComponent: ({ error }) => (
    <MissingDataFallback title="Segment failed to load" reason={error.message} />
  ),
  notFoundComponent: () => <MissingDataFallback title="Segment not found" />,
});

function SegmentPage() {
  const { segment } = Route.useParams();
  const seg = getSegment(segment)!;
  const sectors = sectorsForSegment(seg);

  const { data, isLoading } = useQuery({
    queryKey: ["segment-cases", seg.slug],
    queryFn: () =>
      listUseCases({ data: { industries: seg.industries, limit: 24, sort: "impact" } }),
    staleTime: 60_000,
  });

  const cases = (data?.cases ?? []) as UseCaseCardData[];

  return (
    <article>
      <PageHero
        tone="dark"
        eyebrow="Market Segment"
        title={seg.name}
        description={seg.hero}
        actions={
          <>
            <Link
              to="/repository"
              className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:brightness-110"
            >
              Explore all use cases →
            </Link>
            <Link
              to="/discover"
              className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary"
            >
              Find my use cases
            </Link>
          </>
        }
      />

      <div className="mx-auto max-w-[1200px] px-6 py-12">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <p className="text-base text-muted-foreground">{seg.blurb}</p>
            <h2 className="mt-8 text-sm font-bold uppercase tracking-widest text-primary">
              Representative themes
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {seg.themes.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-border bg-card px-3 py-1 text-sm text-foreground"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
          <aside className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-primary">
              What this segment cares about
            </h2>
            <ul className="mt-3 space-y-2">
              {seg.priorities.map((p) => (
                <li key={p} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {p}
                </li>
              ))}
            </ul>
            {sectors.length > 0 && (
              <>
                <h3 className="mt-6 text-sm font-bold uppercase tracking-widest text-primary">
                  Sectors
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {sectors.map((s) => (
                    <Link
                      key={s.slug}
                      to="/sectors/$sector"
                      params={{ sector: s.slug }}
                      className="rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-secondary"
                    >
                      {s.name}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </aside>
        </div>

        <h2 className="mt-14 text-2xl font-bold tracking-tight text-foreground">
          Curated use cases
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          High-impact AI use cases mapped to this segment.
        </p>

        {isLoading ? (
          <div className="mt-6">
            <LoadingSkeleton />
          </div>
        ) : cases.length === 0 ? (
          <p className="mt-6 text-muted-foreground">
            No published use cases mapped yet — explore the full repository.
          </p>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cases.map((c) => (
              <UseCaseCard key={c.id} c={c} showCompare={false} />
            ))}
          </div>
        )}
      </div>

      <CtaTriad />

      <div className="mx-auto max-w-[1200px] px-6 py-12">
        <h2 className="text-sm font-bold uppercase tracking-widest text-primary">Other segments</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SEGMENTS.filter((s) => s.slug !== seg.slug).map((s) => (
            <Link
              key={s.slug}
              to="/segments/$segment"
              params={{ segment: s.slug }}
              className="group rounded-2xl border border-border bg-card p-5 transition hover:shadow-[var(--shadow-gold)]"
            >
              <s.icon className="h-6 w-6 text-primary" />
              <div className="mt-2 font-bold text-foreground">{s.name}</div>
              <div className="mt-1 text-sm text-muted-foreground">{s.short}</div>
            </Link>
          ))}
        </div>
      </div>
    </article>
  );
}
