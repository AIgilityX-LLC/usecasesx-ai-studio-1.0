import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";

import { getUseCase } from "@/lib/use-cases.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

const useCaseQuery = (slug: string) =>
  queryOptions({
    queryKey: ["use-case", slug],
    queryFn: () => getUseCase({ data: { slug } }),
  });

export const Route = createFileRoute("/cases/$slug")({
  head: ({ loaderData }: { loaderData?: { title: string; summary: string } }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.title} — AigilityX Hub` },
          { name: "description", content: loaderData.summary },
          { property: "og:title", content: loaderData.title },
          { property: "og:description", content: loaderData.summary },
        ]
      : [{ title: "Use case — AigilityX Hub" }],
  }),
  loader: async ({ context, params }) => {
    try {
      return await context.queryClient.ensureQueryData(useCaseQuery(params.slug));
    } catch {
      throw notFound();
    }
  },
  component: CaseDetail,
  notFoundComponent: () => (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="flex-1 p-16 text-center">
        <h1 className="text-3xl font-bold">Use case not found</h1>
        <p className="mt-2 text-muted-foreground">It may have been unpublished or moved.</p>
        <Link to="/" className="mt-6 inline-block text-primary underline">
          ← Back to repository
        </Link>
      </div>
      <SiteFooter />
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="p-12 text-center text-destructive">{error.message}</div>
  ),
});

function CaseDetail() {
  const { slug } = Route.useParams();
  const { data: c } = useSuspenseQuery(useCaseQuery(slug));

  const metrics = (c.use_case_metrics ?? []).sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
  );
  const links = c.use_case_links ?? [];
  const industries = (c.use_case_industries ?? [])
    .map((x) => x.industries?.name)
    .filter(Boolean) as string[];
  const capabilities = (c.use_case_capabilities ?? [])
    .map((x) => x.ai_capabilities?.name)
    .filter(Boolean) as string[];

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-6 py-12">
        <Link
          to="/"
          className="mb-8 inline-block text-sm text-muted-foreground hover:text-foreground"
        >
          ← Repository
        </Link>

        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.15]"
            style={{
              backgroundImage:
                "linear-gradient(oklch(0.82 0.13 210 / 0.5) 1px, transparent 1px), linear-gradient(90deg, oklch(0.82 0.13 210 / 0.5) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
          <div className="relative grid gap-0 md:grid-cols-5">
            <div className="p-10 md:col-span-3">
              <div className="mb-6 flex items-center gap-3">
                <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                  Featured Deployment
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <h1 className="mb-4 text-3xl font-bold leading-tight md:text-4xl">{c.title}</h1>
              {c.organization ? (
                <p className="mb-6 text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
                  {c.organization}
                  {c.organization_type ? ` · ${c.organization_type}` : ""}
                  {c.region ? ` · ${c.region}` : ""}
                </p>
              ) : null}
              <p className="mb-8 max-w-2xl text-foreground/80">{c.summary}</p>

              {metrics.length > 0 && (
                <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
                  {metrics.slice(0, 4).map((m) => (
                    <div key={m.id} className="border-l-2 border-primary/40 pl-3">
                      <span className="block font-mono text-2xl font-bold text-primary">
                        {m.value}
                        {m.unit ?? ""}
                      </span>
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        {m.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-border md:col-span-2 md:border-l md:border-t-0">
              <div className="grid h-full grid-cols-2 gap-px bg-border">
                {(["maturity", "impact", "effort", "risk"] as const).map((k) => {
                  const score = c[`${k}_score` as const] as number | null;
                  return (
                    <div key={k} className="bg-card p-5">
                      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                        {k}
                      </div>
                      <div className="mt-3 flex items-end gap-1">
                        <span className="font-mono text-3xl font-bold text-primary">
                          {score ?? "—"}
                        </span>
                        {score ? (
                          <span className="pb-1 text-xs text-muted-foreground">/5</span>
                        ) : null}
                      </div>
                      {score ? (
                        <div className="mt-3 flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div
                              key={i}
                              className={
                                "h-1 flex-1 rounded-sm " +
                                (i < score ? "bg-primary" : "bg-border")
                              }
                            />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="mt-12 grid gap-10 lg:grid-cols-3">
          <div className="space-y-10 lg:col-span-2">
            <Section title="Problem">{c.problem ?? "—"}</Section>
            <Section title="Solution">{c.solution ?? "—"}</Section>
            <Section title="Outcomes">{c.outcomes ?? "—"}</Section>
          </div>

          <aside className="space-y-8">
            {industries.length > 0 && (
              <TagBlock title="Industries" items={industries} />
            )}
            {capabilities.length > 0 && (
              <TagBlock title="AI Capabilities" items={capabilities} />
            )}
            {links.length > 0 && (
              <div>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Evidence
                </h3>
                <ul className="space-y-2">
                  {links.map((l) => (
                    <li key={l.id}>
                      <a
                        href={l.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-sm text-primary underline-offset-4 hover:underline"
                      >
                        {l.label} ↗
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        {title}
      </h2>
      <div className="whitespace-pre-line text-base leading-relaxed text-foreground">
        {children}
      </div>
    </section>
  );
}

function TagBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        {title}
      </h3>
      <div className="flex flex-wrap gap-2">
        {items.map((t) => (
          <span
            key={t}
            className="rounded border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground/80"
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
