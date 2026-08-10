import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { listPublicCollectionPages } from "@/lib/public-catalog.functions";
import { PageHero } from "@/components/usecasex/PageHero";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { breadcrumbJsonLd, publicHead } from "@/lib/seo";

const collectionsQ = queryOptions({
  queryKey: ["public-collections"],
  queryFn: () => listPublicCollectionPages(),
  staleTime: 10 * 60 * 1000,
});

export const Route = createFileRoute("/_app/collections/")({
  head: () =>
    publicHead({
      path: "/collections",
      title: "Curated AI Use Case Collections — UseCasesX™",
      description:
        "Shareable curated collections of published AI use cases, grouped for a specific decision, sector or transformation theme.",
      jsonLd: [breadcrumbJsonLd([{ name: "Collections", path: "/collections" }])],
    }),
  loader: ({ context }) => context.queryClient.ensureQueryData(collectionsQ),
  component: CollectionsIndex,
});

function CollectionsIndex() {
  const { data } = useSuspenseQuery(collectionsQ);

  return (
    <>
      <PageHero
        eyebrow="Repository"
        title="Curated collections"
        description="Public collections group published use cases around one decision or theme."
      />
      <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-10">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No public collections have been published yet.
          </p>
        ) : (
          data.map((collection) => (
            <Card key={collection.slug}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <Link
                    to="/collections/$slug"
                    params={{ slug: collection.slug }}
                    className="font-semibold text-foreground hover:text-primary"
                  >
                    {collection.name}
                  </Link>
                  <Badge variant="secondary">{collection.itemCount} use cases</Badge>
                </div>
                {collection.description ? (
                  <p className="mt-2 text-sm text-muted-foreground">{collection.description}</p>
                ) : null}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </>
  );
}
