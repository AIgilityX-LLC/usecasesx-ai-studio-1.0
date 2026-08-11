import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listMyContributions } from "@/lib/submissions.functions";
import { statusBadgeClass, statusLabel, type SubmissionStatus } from "@/lib/submissions";

type Row = {
  key: string;
  title: string;
  summary: string | null;
  state: SubmissionStatus | "published";
  when: string | null;
  reviewNotes?: string | null;
  slug?: string;
};

const PUBLISHED_CLASS = "bg-primary/15 text-primary";

function label(state: Row["state"]): string {
  return state === "published" ? "Published" : statusLabel(state);
}

function badgeClass(state: Row["state"]): string {
  return state === "published" ? PUBLISHED_CLASS : statusBadgeClass(state);
}

/**
 * Real contribution history for the signed-in user: every submission in its
 * current review state, plus the repository records approved submissions became.
 */
export function MyContributions() {
  const fetchContributions = useServerFn(listMyContributions);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["my-contributions"],
    queryFn: () => fetchContributions(),
    staleTime: 30 * 1000,
  });

  const rows = useMemo<Row[]>(() => {
    if (!data) return [];
    const publishedTitles = new Set(data.published.map((p) => p.title));
    const submissionRows: Row[] = data.submissions
      // An approved submission is represented by its published record instead,
      // so the same contribution is never listed twice.
      .filter((s) => !(s.status === "approved" && publishedTitles.has(s.title)))
      .map((s) => ({
        key: `sub-${s.id}`,
        title: s.title,
        summary: s.summary,
        state: s.status as SubmissionStatus,
        when: s.updated_at ?? s.created_at,
        reviewNotes: s.review_notes,
      }));
    const publishedRows: Row[] = data.published.map((p) => ({
      key: `pub-${p.id}`,
      title: p.title,
      summary: p.summary,
      state: "published",
      when: p.published_at,
      slug: p.slug,
    }));
    return [...publishedRows, ...submissionRows].sort((a, b) =>
      (b.when ?? "").localeCompare(a.when ?? ""),
    );
  }, [data]);

  const counts = useMemo(() => {
    const map = new Map<Row["state"], number>();
    for (const row of rows) map.set(row.state, (map.get(row.state) ?? 0) + 1);
    return map;
  }, [rows]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-foreground">
            My contributions
          </h2>
          <p className="text-xs text-muted-foreground">
            Every use case you have submitted, with its live review status.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[...counts.entries()].map(([state, count]) => (
            <span
              key={state}
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${badgeClass(state)}`}
            >
              {label(state)} · {count}
            </span>
          ))}
          <Button asChild size="sm" variant="outline">
            <Link to="/submit">Submit a use case</Link>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            Loading your contributions…
          </CardContent>
        </Card>
      ) : isError ? (
        <Card className="border-destructive/40">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-6">
            <p className="text-sm text-destructive">Could not load your contributions.</p>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : rows.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="space-y-3 py-10 text-center">
            <p className="text-sm font-medium">You have not submitted a use case yet</p>
            <p className="text-xs text-muted-foreground">
              Share one from your own organisation — reviewers publish approved submissions into the
              repository.
            </p>
            <Button asChild size="sm">
              <Link to="/submit">Submit a use case</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {rows.map((row) => (
            <li key={row.key} className="flex flex-wrap items-start gap-3 p-4">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  {row.slug ? (
                    <Link
                      to="/use-cases/$slug"
                      params={{ slug: row.slug }}
                      className="text-sm font-semibold hover:underline"
                    >
                      {row.title}
                    </Link>
                  ) : (
                    <span className="text-sm font-semibold">{row.title}</span>
                  )}
                  <Badge
                    variant="secondary"
                    className={`text-[10px] uppercase tracking-wider ${badgeClass(row.state)}`}
                  >
                    {label(row.state)}
                  </Badge>
                </div>
                {row.summary && (
                  <p className="line-clamp-2 text-xs text-muted-foreground">{row.summary}</p>
                )}
                {row.reviewNotes && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Reviewer note:</span>{" "}
                    {row.reviewNotes}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                {row.when && (
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(row.when).toLocaleDateString()}
                  </span>
                )}
                {row.state === "draft" && (
                  <Button asChild size="sm" variant="outline">
                    <Link to="/submit">Finish draft</Link>
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
