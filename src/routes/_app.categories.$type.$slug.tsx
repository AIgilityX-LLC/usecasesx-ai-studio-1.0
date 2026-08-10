import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getCategoryPage } from "@/lib/public-catalog.functions";
import { PageHero } from "@/components/usecasex/PageHero";
import { Card, CardContent } from "@/components/ui/card";
import { breadcrumbJsonLd, publicHead, SITE_URL } from "@/lib/seo";

type CategoryType = "industry" | "capability";

const LABEL: Record<CategoryType, string> = {
  industry: "Industry",
  capability: "AI capability",
};

const categoryQ = (type: CategoryType, slug: string) =>
  queryOptions({
    queryKey: ["public-category", type, slug],
    queryFn: () => getCategoryPage({ data: { type, slug } }),
    staleTime: 10 * 60 * 1000,
  });

function parseType(value: string): CategoryType | null {
  return value === "industry" || value === "capability" ? value : null;
}

export const Route = createFileRoute("/_app/categories/$type/$slug")({
  loader: async ({ params, context }) => {
    const type = parseType(params.type);
    if (!type) throw notFound();
    const page = await context.queryClient.ensureQueryData(categoryQ(type, params.slug));
    if (!page) throw notFound();
    return page;
  },
  head: ({ params, loaderData }) => {
    const type = parseType(params.type);
    if (!loaderData || !type) {
      return {
        meta: [{ title: "Category not found — UseCasesX™" }, { name: "robots", content: "noindex" }],
      };
    }
    const label = LABEL[type];
    return publicHead({
      path: `/categories/${type}/${params.slug}`,
      title: `${loaderData.name} AI use cases — UseCasesX™`.slice(0, 60),
      description:
        `${loaderData.cases.length} published AI use cases in the ${loaderData.name} ${label.toLowerCase()} category — business problem, value and governance for each.`.slice(
          0,
          158,
        ),
      jsonLd: [
        breadcrumbJsonLd([
          { name: "Categories", path: "/categories" },
          { name: loaderData.name, path: `/categories/${type}/${params.slug}` },
        ]),
        {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `${loaderData.name} AI use cases`,
          url: `${SITE_URL}/categories/${type}/${params.slug}`,
          hasPart: loaderData.cases.slice(0, 50).map((c) => ({
            "@type": "Article",
            headline: c.title,
            url: `${SITE_URL}/use-cases/${c.slug}`,
          })),
        },
      ],
    });
  },
  component: CategoryPage,
  notFoundComponent: () => (
    <div className="p-12 text-center text-muted-foreground">This category has no published use cases.</div>
  ),
});

function CategoryPage() {
  const params = Route.useParams();
  const type = parseType(params.type) ?? "industry";
  const { data } = useSuspenseQuery(categoryQ(type, params.slug));
  if (!data) return null;

  return (
    <>
      <PageHero
        eyebrow={LABEL[type]}
        title={`${data.name} AI use cases`}
        description={`${data.cases.length} published, provenance-labelled use cases in this category.`}
      />
      <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-10">
        <Link to="/categories" className="text-sm text-muted-foreground hover:text-foreground">
          ← All categories
        </Link>
        {data.cases.map((useCase) => (
          <Card key={useCase.slug}>
            <CardContent className="p-5">
              <Link
                to="/use-cases/$slug"
                params={{ slug: useCase.slug }}
                className="font-semibold text-foreground hover:text-primary"
              >
                {useCase.title}
              </Link>
              {useCase.summary ? (
                <p className="mt-2 text-sm text-muted-foreground">{useCase.summary}</p>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
