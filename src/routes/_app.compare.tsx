import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import React, { useEffect, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import {
  Download,
  Share2,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { compareStore } from "@/lib/usecasex.compare.store";
import { getUseCase } from "@/lib/use-cases.functions";
import { trackModuleEvent } from "@/lib/module-analytics";
import { MissingDataFallback } from "@/components/MissingDataFallback";
import { PageHero } from "@/components/usecasex/PageHero";

const searchSchema = z.object({
  ids: z.string().optional(),
});

export const Route = createFileRoute("/_app/compare")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "Compare AI Use Cases — UseCasesX™" },
      {
        name: "description",
        content:
          "Side-by-side comparison of selected AI use cases across outcomes, risk class, and evidence.",
      },
    ],
  }),
  validateSearch: searchSchema,
  component: ComparePage,
  errorComponent: ({ error }) => (
    <MissingDataFallback title="Compare view failed to load" reason={error.message} />
  ),
  notFoundComponent: () => <MissingDataFallback title="Nothing to compare" />,
});

type Row = Record<string, any>;

function ComparePage() {
  const search = Route.useSearch() as { ids?: string };
  const navigate = Route.useNavigate();
  const ROWS_PER_PAGE = 5;
  const [sortMode, setSortMode] = useState<"default" | "diff-first" | "alpha">("default");
  const [page, setPage] = useState(0);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const slugs: string[] = (search.ids ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, compareStore.MAX);

  // Keep the local compare selection in sync with the shareable URL so the
  // selection restores on refresh and stays consistent across the app.
  useEffect(() => {
    const current = compareStore.get();
    if (slugs.join(",") !== current.join(",")) {
      compareStore.set(slugs);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.ids]);

  const removeSlug = (slug: string) => {
    const next = slugs.filter((s) => s !== slug);
    compareStore.set(next);
    navigate({ search: { ids: next.join(",") || undefined } as never, replace: true });
    void trackModuleEvent("compare", "click", {
      interaction: "remove_from_compare",
      slug,
      remaining: next.length,
    });
  };

  const results = useQueries({
    queries: slugs.map((slug) => ({
      queryKey: ["use-case", slug],
      queryFn: () => getUseCase({ data: { slug } }),
      staleTime: 60 * 1000,
      retry: false,
    })),
  });

  const items = results.map((r) => r.data as Row | undefined).filter((x): x is Row => Boolean(x));
  const loading = results.some((r) => r.isLoading);
  const allSettled = results.every((r) => !r.isLoading);

  if (slugs.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h1 className="text-3xl font-bold text-foreground">Nothing to compare yet</h1>
        <p className="mt-3 text-muted-foreground">
          Open the Explore page and click <strong>Add to compare</strong> on any use cases to start.
        </p>
        <Link
          to="/repository"
          className="mt-6 inline-block rounded-md bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110"
        >
          Browse use cases →
        </Link>
      </div>
    );
  }

  if (loading && items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-20 text-center text-muted-foreground">
        Loading comparison…
      </div>
    );
  }

  // All queries have resolved but none returned a use case — the slugs in the
  // URL are invalid or unpublished. Show a graceful fallback instead of an
  // empty table.
  if (allSettled && items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h1 className="text-3xl font-bold text-foreground">These use cases aren't available</h1>
        <p className="mt-3 text-muted-foreground">
          The comparison link points to use cases that no longer exist or aren't published. Pick
          some from the Explore page to build a fresh comparison.
        </p>
        <button
          onClick={() => {
            compareStore.clear();
            navigate({ search: { ids: undefined } as never, replace: true });
            void trackModuleEvent("compare", "click", {
              interaction: "clear_comparison",
              source: "unavailable_fallback",
            });
          }}
          className="mt-6 mr-2 inline-block rounded-md border border-border px-5 py-2.5 text-sm font-bold text-foreground hover:bg-secondary"
        >
          Clear comparison
        </button>
        <Link
          to="/repository"
          className="mt-6 inline-block rounded-md bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110"
        >
          Browse use cases →
        </Link>
      </div>
    );
  }

  const ind = (c: Row) => c.use_case_industries?.[0]?.industries?.name ?? "—";
  const fn = (c: Row) => c.use_case_business_functions?.[0]?.business_functions?.name ?? "—";
  const ai = (c: Row) => c.use_case_capabilities?.[0]?.ai_capabilities?.name ?? "—";
  const obj = (c: Row) => c.use_case_business_objectives?.[0]?.business_objectives?.name ?? "—";

  const riskTone: Record<string, string> = {
    Low: "bg-emerald-500/10 text-emerald-600",
    Medium: "bg-amber-500/10 text-amber-600",
    High: "bg-orange-500/10 text-orange-600",
    Critical: "bg-rose-500/10 text-rose-600",
  };

  const rows: { label: string; render: (c: Row) => React.ReactNode; diff?: boolean }[] = [
    { label: "Industry", render: ind, diff: true },
    { label: "Business function", render: fn, diff: true },
    { label: "AI type", render: ai, diff: true },
    { label: "Objective", render: obj, diff: true },
    { label: "Maturity", render: (c) => c.maturity ?? "—", diff: true },
    // Structured outcomes
    { label: "Value potential", render: (c) => c.value_potential ?? "—", diff: true },
    { label: "Complexity", render: (c) => c.complexity ?? "—", diff: true },
    { label: "Time to value", render: (c) => c.time_to_value ?? "—", diff: true },
    {
      label: "Risk class",
      diff: true,
      render: (c) =>
        c.risk_level ? (
          <span
            className={
              "rounded-full px-2 py-0.5 text-[11px] font-bold " +
              (riskTone[c.risk_level] ?? "bg-secondary text-foreground")
            }
          >
            {c.risk_level}
          </span>
        ) : (
          "—"
        ),
    },
  ];

  const diffSet = new Set(
    rows
      .filter((r) => r.diff)
      .filter(
        (r) =>
          new Set(
            items.map((c) => String(typeof r.render(c) === "object" ? c.risk_level : r.render(c))),
          ).size > 1,
      )
      .map((r) => r.label),
  );

  // --- Sorting / pagination / row-expansion of the attribute rows ---
  const orderedRows = [...rows];
  if (sortMode === "diff-first") {
    orderedRows.sort((a, b) => (diffSet.has(b.label) ? 1 : 0) - (diffSet.has(a.label) ? 1 : 0));
  } else if (sortMode === "alpha") {
    orderedRows.sort((a, b) => a.label.localeCompare(b.label));
  }
  const totalPages = Math.max(1, Math.ceil(orderedRows.length / ROWS_PER_PAGE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = orderedRows.slice(
    safePage * ROWS_PER_PAGE,
    safePage * ROWS_PER_PAGE + ROWS_PER_PAGE,
  );

  const changeSort = (mode: "default" | "diff-first" | "alpha") => {
    setSortMode(mode);
    setPage(0);
    void trackModuleEvent("compare", "click", { interaction: "sort_table", order: mode });
  };
  const goToPage = (p: number) => {
    const next = Math.max(0, Math.min(p, totalPages - 1));
    setPage(next);
    void trackModuleEvent("compare", "click", {
      interaction: "paginate_table",
      page: next + 1,
      total_pages: totalPages,
    });
  };
  const toggleRow = (label: string) => {
    setExpandedRows((prev) => {
      const nextSet = new Set(prev);
      const willExpand = !nextSet.has(label);
      if (willExpand) nextSet.add(label);
      else nextSet.delete(label);
      void trackModuleEvent("compare", "click", {
        interaction: "row_expand",
        row: label,
        expanded: willExpand,
      });
      return nextSet;
    });
  };

  const evidenceFor = (
    c: Row,
  ): { problem?: string; approach?: string; value?: string; metrics: Row[]; links: Row[] } => ({
    problem: c.business_problem ?? c.summary ?? undefined,
    approach: c.ai_solution_concept ?? undefined,
    value: c.business_value ?? undefined,
    metrics: (c.use_case_metrics ?? []) as Row[],
    links: (c.use_case_links ?? []) as Row[],
  });

  const exportPdf = () => {
    if (typeof window === "undefined") return;
    void trackModuleEvent("compare", "click", {
      interaction: "export_pdf",
      count: items.length,
      slugs: items.map((c) => c.slug),
    });
    const esc = (v: unknown) =>
      String(v ?? "—")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    const origin = window.location.origin;
    const col = (c: Row) => {
      const e = evidenceFor(c);
      const sources = e.links
        .map((l: Row) => `<li><a href="${esc(l.url)}">${esc(l.label ?? l.url)}</a></li>`)
        .join("");
      const metrics = e.metrics
        .map(
          (m: Row) =>
            `<li><strong>${esc(m.value)}${esc(m.unit ?? "")}</strong> ${esc(m.label)}</li>`,
        )
        .join("");
      return `<section>
        <h2><a href="${origin}/use-cases/${esc(c.slug)}">${esc(c.title)}</a></h2>
        <table class="kv">
          <tr><th>Industry</th><td>${esc(ind(c))}</td></tr>
          <tr><th>Business function</th><td>${esc(fn(c))}</td></tr>
          <tr><th>AI type</th><td>${esc(ai(c))}</td></tr>
          <tr><th>Value potential</th><td>${esc(c.value_potential)}</td></tr>
          <tr><th>Complexity</th><td>${esc(c.complexity)}</td></tr>
          <tr><th>Time to value</th><td>${esc(c.time_to_value)}</td></tr>
          <tr><th>Risk class</th><td>${esc(c.risk_level)}</td></tr>
        </table>
        ${e.problem ? `<h3>Problem</h3><p>${esc(e.problem)}</p>` : ""}
        ${e.approach ? `<h3>Approach</h3><p>${esc(e.approach)}</p>` : ""}
        ${e.value ? `<h3>Outcome / value</h3><p>${esc(e.value)}</p>` : ""}
        ${metrics ? `<h3>Metrics</h3><ul>${metrics}</ul>` : ""}
        ${sources ? `<h3>Evidence &amp; sources</h3><ul>${sources}</ul>` : ""}
      </section>`;
    };
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>AI Use Case Comparison</title>
      <style>
        body{font-family:system-ui,sans-serif;margin:40px;color:#111;line-height:1.5}
        h1{font-size:22px} .meta{color:#777;font-size:12px;margin-bottom:18px}
        section{border-top:2px solid #1a5fd0;padding-top:14px;margin-top:24px;page-break-inside:avoid}
        h2{font-size:18px;margin:0 0 8px} h2 a{color:#111;text-decoration:none}
        h3{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#555;margin:14px 0 4px}
        table.kv{border-collapse:collapse;margin:6px 0} table.kv th{text-align:left;color:#666;font-weight:600;padding:2px 18px 2px 0;font-size:12px;vertical-align:top}
        table.kv td{padding:2px 0;font-size:13px}
        a{color:#1a5fd0;word-break:break-all} ul{margin:4px 0;padding-left:18px} li{margin-bottom:4px;font-size:13px}
      </style></head><body>
      <h1>AI Use Case Comparison</h1>
      <div class="meta">${items.length} use case${items.length === 1 ? "" : "s"} · exported ${new Date().toLocaleString()} · UseCasesX™</div>
      ${items.map(col).join("")}
      <script>window.onload=function(){window.print();}</script>
      </body></html>`;
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
    }
  };

  const shareComparison = async () => {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    void trackModuleEvent("compare", "click", {
      interaction: "share_comparison",
      count: items.length,
      slugs: items.map((c) => c.slug),
    });
    try {
      if (navigator.share) {
        await navigator.share({ title: "AI Use Case Comparison — UseCasesX™", url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      /* user cancelled share or clipboard blocked — non-fatal */
    }
  };

  return (
    <article className="bg-background">
      <PageHero
        tone="dark"
        eyebrow="Compare"
        title="Compare AI Use Cases"
        description={`Side-by-side view of ${items.length} use case${items.length === 1 ? "" : "s"} across outcomes, risk class, and evidence. Differences are highlighted. This view is saved in the URL — bookmark or share it.`}
        actions={
          <>
            <Link
              to="/repository"
              className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary"
            >
              ← Back to Explore
            </Link>
            <button
              onClick={shareComparison}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary"
            >
              <Share2 className="h-3.5 w-3.5" /> Share
            </button>
            <button
              onClick={exportPdf}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:brightness-110"
            >
              <Download className="h-3.5 w-3.5" /> Export PDF
            </button>
          </>
        }
      />

      <div className="mx-auto max-w-[1400px] px-6 py-10">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            <ArrowUpDown className="h-3.5 w-3.5" /> Sort rows
          </span>
          {(
            [
              { key: "default", label: "Default" },
              { key: "diff-first", label: "Differences first" },
              { key: "alpha", label: "A–Z" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.key}
              onClick={() => changeSort(opt.key)}
              className={
                "rounded-md border px-3 py-1.5 text-xs font-semibold transition " +
                (sortMode === opt.key
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-secondary")
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-card/60">
                <th className="w-44 px-4 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Attribute
                </th>
                {items.map((c) => (
                  <th key={c.slug} className="px-4 py-4 text-left align-top">
                    <Link
                      to="/use-cases/$slug"
                      params={{ slug: c.slug }}
                      className="block text-base font-bold text-foreground hover:text-primary"
                    >
                      {c.title}
                    </Link>
                    <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-primary">
                      {ind(c)}
                    </div>
                    <button
                      onClick={() => removeSlug(c.slug)}
                      className="mt-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-destructive"
                    >
                      Remove
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => {
                const expanded = expandedRows.has(r.label);
                return (
                  <React.Fragment key={r.label}>
                    <tr
                      className={
                        "border-b border-border " +
                        (diffSet.has(r.label) ? "bg-primary/[0.03]" : "")
                      }
                    >
                      <td className="px-4 py-3 align-top text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                        <button
                          onClick={() => toggleRow(r.label)}
                          className="flex items-start gap-1 text-left hover:text-foreground"
                          aria-expanded={expanded}
                        >
                          {expanded ? (
                            <ChevronDown className="mt-0.5 h-3 w-3 shrink-0" />
                          ) : (
                            <ChevronRight className="mt-0.5 h-3 w-3 shrink-0" />
                          )}
                          <span>
                            {r.label}
                            {diffSet.has(r.label) && (
                              <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-primary">
                                DIFFERS
                              </span>
                            )}
                          </span>
                        </button>
                      </td>
                      {items.map((c) => (
                        <td key={c.slug} className="px-4 py-3 align-top text-sm text-foreground">
                          {r.render(c)}
                        </td>
                      ))}
                    </tr>
                    {expanded && (
                      <tr className="border-b border-border bg-secondary/40">
                        <td colSpan={items.length + 1} className="px-4 py-3">
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {items.map((c) => (
                              <div
                                key={c.slug}
                                className="rounded-md border border-border bg-card px-3 py-2"
                              >
                                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                  {c.title}
                                </div>
                                <div className="mt-1 text-sm text-foreground">{r.render(c)}</div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              <tr>
                <td className="px-4 py-4 align-top text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  Evidence
                </td>
                {items.map((c) => {
                  const e = evidenceFor(c);
                  return (
                    <td key={c.slug} className="px-4 py-4 align-top">
                      <div className="space-y-3 text-[13px]">
                        {e.problem && (
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                              Problem
                            </div>
                            <p className="mt-0.5 text-foreground/80">{e.problem}</p>
                          </div>
                        )}
                        {e.approach && (
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                              Approach
                            </div>
                            <p className="mt-0.5 text-foreground/80">{e.approach}</p>
                          </div>
                        )}
                        {e.value && (
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                              Outcome / value
                            </div>
                            <p className="mt-0.5 text-foreground/80">{e.value}</p>
                          </div>
                        )}
                        {e.metrics.length > 0 && (
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                              Metrics
                            </div>
                            <ul className="mt-1 space-y-0.5">
                              {e.metrics.map((m) => (
                                <li key={m.id} className="text-foreground/80">
                                  <span className="font-bold text-primary">
                                    {m.value}
                                    {m.unit ?? ""}
                                  </span>{" "}
                                  {m.label}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {e.links.length > 0 && (
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                              Sources
                            </div>
                            <ul className="mt-1 space-y-0.5">
                              {e.links.map((l) => (
                                <li key={l.id}>
                                  <a
                                    href={l.url}
                                    target="_blank"
                                    rel="noreferrer noopener"
                                    className="text-primary hover:underline"
                                  >
                                    {l.label ?? l.url}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {!e.problem &&
                          !e.approach &&
                          !e.value &&
                          e.metrics.length === 0 &&
                          e.links.length === 0 && (
                            <span className="text-muted-foreground">
                              No structured evidence recorded.
                            </span>
                          )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              Showing rows {safePage * ROWS_PER_PAGE + 1}–
              {Math.min((safePage + 1) * ROWS_PER_PAGE, orderedRows.length)} of {orderedRows.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPage(safePage - 1)}
                disabled={safePage === 0}
                className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-40 hover:bg-secondary"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </button>
              <span className="text-xs font-semibold text-foreground">
                {safePage + 1} / {totalPages}
              </span>
              <button
                onClick={() => goToPage(safePage + 1)}
                disabled={safePage >= totalPages - 1}
                className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-40 hover:bg-secondary"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
