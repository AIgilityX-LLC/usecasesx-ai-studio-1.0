import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { signInHref } from "@/lib/auth-errors";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader, EmptyState, ErrorState, CardSkeleton, StatusChip } from "@/components/ui-kit";
import { listOpportunitiesFn } from "@/lib/opportunities.functions";
import { OPPORTUNITY_STATUSES, STATUS_META, type OpportunityStatus } from "@/lib/opportunities";

export const Route = createFileRoute("/_app/opportunities/")({
  head: () => ({
    meta: [
      { title: "Opportunity Capture — UseCasesX™" },
      {
        name: "description",
        content:
          "Capture the business problem before proposing an AI solution: pain point, process, baseline, desired outcome, owner and evidence.",
      },
      { property: "og:title", content: "Opportunity Capture — UseCasesX™" },
      {
        property: "og:description",
        content: "Record and qualify business problems before any AI solution is designed.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OpportunitiesPage,
});

function OpportunitiesPage() {
  const [status, setStatus] = useState<OpportunityStatus | "all">("all");
  const [search, setSearch] = useState("");
  const session = useSupabaseSession();
  const signedOut = session === null;

  const query = useQuery({
    queryKey: ["opportunities", status],
    queryFn: () => listOpportunitiesFn({ data: { status } }),
    enabled: !!session,
  });


  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = query.data ?? [];
    return term ? list.filter((r) => r.title.toLowerCase().includes(term)) : list;
  }, [query.data, search]);

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <PageHeader
        eyebrow="Capture"
        title="Opportunities"
        description="The business problem comes first. Record it here, qualify it, then design a use case from it."
        actions={
          <Button asChild>
            <Link to="/opportunities/new">
              <Plus className="mr-2 h-4 w-4" /> Capture opportunity
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by problem name"
          aria-label="Search opportunities"
          className="sm:max-w-xs"
        />
        <Select value={status} onValueChange={(v) => setStatus(v as OpportunityStatus | "all")}>
          <SelectTrigger className="sm:w-56" aria-label="Filter by stage">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stages</SelectItem>
            {OPPORTUNITY_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_META[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {signedOut ? (
        <EmptyState
          title="Sign in to see your opportunities"
          description="Opportunities are private to your workspace. You can still start capturing one now — the draft stays on this device until you sign in."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild>
                <a href={signInHref("/opportunities")}>Sign in or register</a>
              </Button>
              <Button asChild variant="outline">
                <Link to="/opportunities/new">Start a draft</Link>
              </Button>
            </div>
          }
        />
      ) : query.isLoading || session === undefined ? (
        <div className="grid gap-4 md:grid-cols-2">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : query.isError ? (

        <ErrorState
          title="Could not load your opportunities"
          description="Please try again in a moment."
          onRetry={() => void query.refetch()}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No opportunities captured yet"
          description="Start with the problem — a name and what is going wrong today is enough."
          action={
            <Button asChild>
              <Link to="/opportunities/new">Capture opportunity</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((row) => (
            <Card key={row.id} className="transition-colors hover:border-primary/40">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <Link
                    to="/opportunities/$id"
                    params={{ id: row.id }}
                    className="font-medium hover:underline"
                  >
                    {row.title}
                  </Link>
                  <StatusChip tone={STATUS_META[row.status].tone}>
                    {STATUS_META[row.status].label}
                  </StatusChip>
                </div>
                {row.painPoint ? (
                  <p className="line-clamp-2 text-sm text-muted-foreground">{row.painPoint}</p>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  Updated {new Date(row.updatedAt).toLocaleDateString()}
                  {row.aiAssisted ? " · AI assisted" : ""}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
