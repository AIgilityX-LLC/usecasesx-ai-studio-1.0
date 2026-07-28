import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listUseCases } from "@/lib/use-cases.functions";
import { getSector, SECTORS, SEGMENTS } from "@/lib/segments";
import { UseCaseCard, type UseCaseCardData } from "@/components/UseCaseCard";
import { PageHero } from "@/components/usecasex/PageHero";
import { CtaTriad } from "@/components/usecasex/CtaTriad";
import { MissingDataFallback } from "@/components/MissingDataFallback";
import { CardSkeleton } from "@/components/LoadingSkeleton";

export const Route = createFileRoute("/_app/sectors/$sector")({
  head: ({ params }) => {
    const sec = getSector(params.sector);
    const title = sec ? `${sec.name} AI Use Cases — UseCasesX™` : "Sector — UseCasesX™";
    const desc = sec?.blurb ?? "AI use cases by sector.";
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
    if (!getSector(params.sector)) throw notFound();
  },
  component: SectorPage,
  errorComponent: ({ error }) => (
    <MissingDataFallback title="Sector failed to load" reason={error.message} />
  ),
  notFoundComponent: () => <MissingDataFallback title="Sector not found" />,
});

function SectorPage() {
  const { sector } = Route.useParams();
  const sec = getSector(sector)!;
  const parentSegments = SEGMENTS.filter((s) => s.industries.includes(sec.slug));

  const { data, isLoading } = useQuery({
    queryKey: ["sector-cases", sec.slug],
    queryFn: () => listUseCases({ data: { industries: [sec.slug], limit: 30, sort: "impact" } }),
    staleTime: 60_000,
  });

  const cases = (data?.cases ?? []) as UseCaseCardData[];

  return (
    <article>
      <PageHero
        tone="dark"
        eyebrow="Sector"
        title={`${sec.name} AI Use Cases`}
        description={sec.blurb}
        actions={
          <>
            <Link
              to="/repository"
              className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:brightness-110"
            >
              Explore all use cases →
            </Link>
            <Link
              to="/quick-wins"
              className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary"
            >
              See Quick Wins matrix
            </Link>
          </>
        }
      />

      <div className="mx-auto max-w-[1200px] px-6 py-12">
        {parentSegments.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Part of:
            </span>
            {parentSegments.map((s) => (
              <Link
                key={s.slug}
                to="/segments/$segment"
                params={{ segment: s.slug }}
                className="rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-secondary"
              >
                {s.name}
              </Link>
            ))}
          </div>
        )}

        <h2 className="mt-10 text-2xl font-bold tracking-tight text-foreground">
          Use cases in {sec.name}
        </h2>
        {isLoading ? (
          <div className="mt-6">
            <CardSkeleton />
          </div>
        ) : cases.length === 0 ? (
          <p className="mt-6 text-muted-foreground">No published use cases in this sector yet.</p>
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
        <h2 className="text-sm font-bold uppercase tracking-widest text-primary">
          Browse other sectors
        </h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {SECTORS.filter((s) => s.slug !== sec.slug).map((s) => (
            <Link
              key={s.slug}
              to="/sectors/$sector"
              params={{ sector: s.slug }}
              className="rounded-md border border-border bg-card px-3 py-1.5 text-sm font-semibold text-foreground hover:bg-secondary"
            >
              {s.name}
            </Link>
          ))}
        </div>
      </div>
    </article>
  );
}
