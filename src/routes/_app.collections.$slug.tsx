import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getPublicCollectionPage } from "@/lib/public-catalog.functions";
import { PageHero } from "@/components/usecasex/PageHero";
import { Card, CardContent } from "@/components/ui/card";
import { breadcrumbJsonLd, publicHead, SITE_URL } from "@/lib/seo";

const collectionQ = (slug: string) =>
  queryOptions({
    queryKey: ["public-collection", slug],
    queryFn: () => getPublicCollectionPage({ data: { slug } }),
    staleTime: 10 * 60 * 1000,
  });

export const Route = createFileRoute("/_app/collections/$slug")({
  loader: async ({ params, context }) => {
    const page = await context.queryClient.ensureQueryData(collectionQ(params.slug));
    if (!page) throw notFound();
    return page;
  },
  head: ({ params, loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Collection not found — UseCasesX™" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    return publicHead({
      path: `/collections/${params.slug}`,
      title: `${loaderData.name} — UseCasesX™`.slice(0, 60),
      description: (
        loaderData.description ??
        `A curated collection of ${loaderData.itemCount} published AI use cases from the UseCasesX™ repository.`
      ).slice(0, 158),
      jsonLd: [
        breadcrumbJsonLd([
          { name: "Collections", path: "/collections" },
          { name: loaderData.name, path: `/collections/${params.slug}` },
        ]),
        {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: loaderData.name,
          url: `${SITE_URL}/collections/${params.slug}`,
          hasPart: loaderData.items.slice(0, 50).map((item) => ({
            "@type": "Article",
            headline: item.title,
            url: `${SITE_URL}/use-cases/${item.slug}`,
          })),
        },
      ],
    });
  },
  component: CollectionPage,
  notFoundComponent: () => (
    <div className="p-12 text-center text-muted-foreground">This collection is not public.</div>
  ),
});

function CollectionPage() {
  const params = Route.useParams();
  const { data } = useSuspenseQuery(collectionQ(params.slug));
  if (!data) return null;

  return (
    <>
      <PageHero
        eyebrow="Collection"
        title={data.name}
        description={data.description ?? `${data.itemCount} published use cases.`}
      />
      <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-10">
        <Link to="/collections" className="text-sm text-muted-foreground hover:text-foreground">
          ← All collections
        </Link>
        {data.items.map((item) => (
          <Card key={item.slug}>
            <CardContent className="p-5">
              <Link
                to="/use-cases/$slug"
                params={{ slug: item.slug }}
                className="font-semibold text-foreground hover:text-primary"
              >
                {item.title}
              </Link>
              {item.summary ? (
                <p className="mt-2 text-sm text-muted-foreground">{item.summary}</p>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
