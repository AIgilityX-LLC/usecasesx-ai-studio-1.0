import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteShell } from "@/components/SiteShell";
import { PageHero } from "@/components/usecasex/PageHero";
import { Card, CardContent } from "@/components/ui/card";
import { getPublicCollection } from "@/lib/collections.functions";

export const Route = createFileRoute("/c/$token")({
  loader: async ({ params }) => {
    const col = await getPublicCollection({ data: { token: params.token } });
    if (!col) throw notFound();
    return col;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.name ?? "Shared collection"} — UseCasesX™` },
      { name: "description", content: loaderData?.description ?? "A shared collection of AI use cases on UseCasesX™." },
      { property: "og:title", content: `${loaderData?.name ?? "Shared collection"} — UseCasesX™` },
      { property: "og:description", content: loaderData?.description ?? "A shared collection of AI use cases." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: SharedCollectionPage,
  errorComponent: ({ error }) => (
    <SiteShell><div className="mx-auto max-w-2xl px-6 py-20 text-center text-sm text-muted-foreground" role="alert">{error.message}</div></SiteShell>
  ),
  notFoundComponent: () => (
    <SiteShell>
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <h1 className="text-2xl font-semibold">Collection not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">This collection is private or the link is invalid.</p>
        <Link to="/repository" className="mt-4 inline-block font-semibold text-primary hover:underline">Browse the repository →</Link>
      </div>
    </SiteShell>
  ),
});

function SharedCollectionPage() {
  const col = Route.useLoaderData();
  return (
    <SiteShell>
      <PageHero tone="dark" eyebrow="Shared collection" title={col.name} description={col.description ?? "A curated collection of AI use cases."} />
      <section className="bg-background">
        <div className="mx-auto max-w-[1000px] px-6 py-12">
          {col.items.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">This collection has no use cases yet.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {col.items.map((u) => (
                <Card key={u.slug}>
                  <CardContent className="py-5">
                    <Link to="/use-cases/$slug" params={{ slug: u.slug }} className="font-semibold text-foreground hover:text-primary">{u.title}</Link>
                    {u.summary && <p className="mt-1.5 line-clamp-3 text-sm text-muted-foreground">{u.summary}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    </SiteShell>
  );
}
