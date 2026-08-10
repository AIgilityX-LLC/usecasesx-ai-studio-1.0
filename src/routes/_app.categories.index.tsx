import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { listAllCategories } from "@/lib/public-catalog.functions";
import { PageHero } from "@/components/usecasex/PageHero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { breadcrumbJsonLd, publicHead } from "@/lib/seo";

const categoriesQ = queryOptions({
  queryKey: ["public-categories"],
  queryFn: () => listAllCategories(),
  staleTime: 10 * 60 * 1000,
});

export const Route = createFileRoute("/_app/categories/")({
  head: () =>
    publicHead({
      path: "/categories",
      title: "AI Use Case Categories — UseCasesX™",
      description:
        "Browse published AI use cases by industry and AI capability. Every category page is shareable and lists only provenance-labelled, published records.",
      jsonLd: [breadcrumbJsonLd([{ name: "Categories", path: "/categories" }])],
    }),
  loader: ({ context }) => context.queryClient.ensureQueryData(categoriesQ),
  component: CategoriesIndex,
});

function CategoryGrid({
  type,
  items,
}: {
  type: "industry" | "capability";
  items: { slug: string; name: string; count: number }[];
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No published categories yet.</p>;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <Link
          key={item.slug}
          to="/categories/$type/$slug"
          params={{ type, slug: item.slug }}
          className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium text-foreground">{item.name}</span>
            <Badge variant="secondary">{item.count}</Badge>
          </div>
        </Link>
      ))}
    </div>
  );
}

function CategoriesIndex() {
  const { data } = useSuspenseQuery(categoriesQ);

  return (
    <>
      <PageHero
        eyebrow="Repository"
        title="AI use case categories"
        subtitle="Every category is a shareable, indexable page listing published use cases only."
      />
      <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>By industry</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryGrid type="industry" items={data.industry} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>By AI capability</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryGrid type="capability" items={data.capability} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
