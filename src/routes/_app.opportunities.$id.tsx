import { CollaborationPanel } from "@/components/collab/CollaborationPanel";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PageHeader,
  ErrorState,
  CardSkeleton,
  StatusChip,
  ConfirmDialog,
} from "@/components/ui-kit";
import { OpportunityForm } from "@/components/opportunities/OpportunityForm";
import {
  convertOpportunityFn,
  deleteOpportunityFn,
  getOpportunityFn,
  setOpportunityStatusFn,
} from "@/lib/opportunities.functions";
import {
  ALLOWED_TRANSITIONS,
  isConvertible,
  STATUS_META,
  type OpportunityStatus,
} from "@/lib/opportunities";

export const Route = createFileRoute("/_app/opportunities/$id")({
  head: () => ({
    meta: [
      { title: "Opportunity Detail — UseCasesX™" },
      {
        name: "description",
        content:
          "Review, qualify and convert a captured business problem into an AI use case draft in the Studio.",
      },
      { property: "og:title", content: "Opportunity Detail — UseCasesX™" },
      {
        property: "og:description",
        content: "Qualify a captured business problem and convert it into a use case.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OpportunityDetailPage,
});

function OpportunityDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const setStatus = useServerFn(setOpportunityStatusFn);
  const convert = useServerFn(convertOpportunityFn);
  const remove = useServerFn(deleteOpportunityFn);

  const [busy, setBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const query = useQuery({
    queryKey: ["opportunity", id],
    queryFn: () => getOpportunityFn({ data: { id } }),
  });

  if (query.isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <CardSkeleton />
      </div>
    );
  }
  if (query.isError || !query.data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorState
          title="Opportunity not available"
          description="It may have been removed, or it belongs to another workspace."
          onRetry={() => void query.refetch()}
        />
      </div>
    );
  }

  const opp = query.data;
  const meta = STATUS_META[opp.status as OpportunityStatus];
  const transitions = ALLOWED_TRANSITIONS[opp.status as OpportunityStatus];

  async function changeStatus(next: string) {
    setBusy(true);
    try {
      await setStatus({ data: { id, status: next as OpportunityStatus } });
      await query.refetch();
      toast.success(`Moved to ${STATUS_META[next as OpportunityStatus].label}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not change the stage.");
    } finally {
      setBusy(false);
    }
  }

  async function runConvert() {
    setBusy(true);
    try {
      const result = await convert({ data: { id } });
      toast.success(result.reused ? "Opening the existing use case" : "Use case draft created");
      navigate({ to: "/studio/use-case/$id/wizard", params: { id: result.draftId } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not convert this opportunity.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <PageHeader
        eyebrow={
          <span className="flex items-center gap-2">
            <Link to="/opportunities" className="hover:underline">
              Opportunities
            </Link>
            <StatusChip tone={meta.tone}>{meta.label}</StatusChip>
          </span>
        }
        title={opp.title}
        description={meta.description}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value="" onValueChange={(v) => void changeStatus(v)} disabled={busy}>
              <SelectTrigger className="w-44" aria-label="Change stage">
                <SelectValue placeholder="Change stage" />
              </SelectTrigger>
              <SelectContent>
                {transitions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_META[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {opp.convertedUseCaseId ? (
              <Button asChild variant="secondary">
                <Link to="/studio/use-case/$id/wizard" params={{ id: opp.convertedUseCaseId }}>
                  Continue design <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button onClick={() => void runConvert()} disabled={busy || !isConvertible(opp)}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Design a use case
              </Button>
            )}
            <Button variant="ghost" onClick={() => setDeleteOpen(true)}>
              Delete
            </Button>
          </div>
        }
      />

      <OpportunityForm
        opportunityId={opp.id}
        initial={opp}
        serverUpdatedAt={opp.updatedAt ?? null}
        onSaved={() => void query.refetch()}
      />

      <CollaborationPanel entityType="opportunity" entityId={opp.id} />


      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        destructive
        title="Delete this opportunity?"
        description="The captured problem will be removed. Any use case already created from it is kept."
        confirmLabel="Delete"
        onConfirm={async () => {
          await remove({ data: { id } });
          toast.success("Opportunity deleted");
          navigate({ to: "/opportunities" });
        }}
      />
    </div>
  );
}
