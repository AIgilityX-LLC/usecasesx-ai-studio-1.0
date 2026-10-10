/**
 * Workspace decision-gate review inbox (FR-08).
 */

import { createFileRoute } from "@tanstack/react-router";
import { privateHead } from "@/lib/seo";
import { useWorkspaceContext } from "@/hooks/useWorkspaceContext";
import { ReviewInbox } from "@/components/gates/ReviewInbox";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { RequireCapability } from "@/components/RequireCapability";

export const Route = createFileRoute("/_app/reviews")({
  head: () => privateHead("Review inbox"),
  component: () => (
    <RequireCapability capability="decision.read" action="open the review inbox">
      <ReviewsPage />
    </RequireCapability>
  ),
});

function ReviewsPage() {
  const { data: context, isLoading } = useWorkspaceContext();
  const workspaceId = context?.workspace?.id ?? null;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Review inbox</h1>
        <p className="text-sm text-muted-foreground">
          Decision gates awaiting human review — SLA, field-level change requests and open
          conditions. Segregation of duties applies when configured on the gate.
        </p>
      </header>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : !workspaceId ? (
        <EmptyState
          title="No workspace selected"
          description="Join or create a workspace to see submitted gate reviews."
        />
      ) : (
        <ReviewInbox workspaceId={workspaceId} />
      )}
    </div>
  );
}
