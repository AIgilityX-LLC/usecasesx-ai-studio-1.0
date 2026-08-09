/**
 * Lightweight Pro collaboration panel: review status, assignments,
 * review notes and an activity timeline for one item.
 *
 * Enterprise workflow orchestration (gates, approvals with regulatory
 * meaning, routing) is deliberately out of scope here.
 */

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2, Loader2, MessageSquare, RotateCcw, UserPlus, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import {
import {
  ACTIVITY_CATEGORIES,
  ACTIVITY_CATEGORY_LABELS,
  ACTIVITY_PAGE_SIZE,
  activityCategory,
  ASSIGNMENT_ROLES,
  ASSIGNMENT_ROLE_LABELS,
  type ActivityCategory,
  REVIEW_STATUSES,
  REVIEW_STATUS_META,
  type AssignmentRole,
  type CollabEntityType,
  type ReviewStatus,
} from "@/lib/collab";
import {
  addCommentFn,
  assignCollaboratorFn,
  getCollaborationFn,
  removeMemberFn as _removeMemberFn,
  resolveCommentFn,
  setReviewStatusFn,
  unassignCollaboratorFn,
} from "@/lib/collab.functions";

void _removeMemberFn;

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString();
}

export function CollaborationPanel({
  entityType,
  entityId,
  className,
}: {
  entityType: CollabEntityType;
  entityId: string;
  className?: string;
}) {
  const session = useSupabaseSession();
  const sessionLoading = session === undefined;
  const queryClient = useQueryClient();
  const load = useServerFn(getCollaborationFn);
  const addComment = useServerFn(addCommentFn);
  const resolveComment = useServerFn(resolveCommentFn);
  const assign = useServerFn(assignCollaboratorFn);
  const unassign = useServerFn(unassignCollaboratorFn);
  const setStatus = useServerFn(setReviewStatusFn);

  const [draft, setDraft] = useState("");
  const [assignRole, setAssignRole] = useState<AssignmentRole>("owner");
  const [activityFilter, setActivityFilter] = useState<ActivityCategory>("all");
  const [activityPages, setActivityPages] = useState(1);

  const queryKey = ["collaboration", entityType, entityId];
  const query = useQuery({
    queryKey,
    queryFn: () => load({ data: { entityType, entityId } }),
    enabled: Boolean(session) && Boolean(entityId),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey });

  const commentMutation = useMutation({
    mutationFn: (body: string) => addComment({ data: { entityType, entityId, body } }),
    onSuccess: () => {
      setDraft("");
      toast.success("Review note added");
      void refresh();
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Could not add the note."),
  });

  const statusMutation = useMutation({
    mutationFn: (status: ReviewStatus) => setStatus({ data: { entityType, entityId, status } }),
    onSuccess: () => {
      toast.success("Review state updated");
      void refresh();
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Could not change the review state."),
  });

  const assignMutation = useMutation({
    mutationFn: (userId: string) =>
      assign({ data: { entityType, entityId, userId, assignmentRole: assignRole } }),
    onSuccess: () => {
      toast.success("Assignment saved");
      void refresh();
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Could not save the assignment."),
  });

  if (sessionLoading) return <Skeleton className="h-64 w-full" />;

  if (!session) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base">Collaboration</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Sign in to leave review notes, assign an owner and see the activity timeline.
          <div className="mt-3">
            <Button asChild size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (query.isLoading) return <Skeleton className={`h-64 w-full ${className ?? ""}`} />;

  if (query.isError) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base">Collaboration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            {query.error instanceof Error ? query.error.message : "Could not load collaboration."}
          </p>
          <Button size="sm" variant="secondary" onClick={() => void query.refetch()}>
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const data = query.data!;
  const status = data.reviewState?.status ?? "draft";
  const meta = REVIEW_STATUS_META[status];
  const owner = data.assignments.find((a) => a.assignmentRole === "owner");
  const contributors = data.assignments.filter((a) => a.assignmentRole === "contributor");
  const assignable = data.members.filter(
    (m) => !data.assignments.some((a) => a.userId === m.userId && a.assignmentRole === assignRole),
  );
  const canWrite = data.seats.edition !== "lite" || data.canManage;
  const filteredActivity = data.activity.filter(
    (a) => activityFilter === "all" || activityCategory(a.event) === activityFilter,
  );
  const visibleActivity = filteredActivity.slice(0, activityPages * ACTIVITY_PAGE_SIZE);

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">Collaboration</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">{meta.description}</p>
        </div>
        <Badge variant={meta.tone === "positive" ? "default" : "secondary"}>{meta.label}</Badge>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Review state
          </span>
          <Select
            value={status}
            onValueChange={(v) => statusMutation.mutate(v as ReviewStatus)}
            disabled={statusMutation.isPending || !canWrite}
          >
            <SelectTrigger className="h-8 w-56" aria-label="Review state">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REVIEW_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {REVIEW_STATUS_META[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {data.reviewState && (
            <span className="text-xs text-muted-foreground">
              by {data.reviewState.updatedByName} · {timeAgo(data.reviewState.updatedAt)}
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">
          These states record internal team agreement. They are not a regulatory approval.
        </p>

        <Tabs defaultValue="notes">
          <TabsList>
            <TabsTrigger value="notes">
              <MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Notes ({data.comments.length})
            </TabsTrigger>
            <TabsTrigger value="people">
              <UserPlus className="mr-1.5 h-3.5 w-3.5" /> People
            </TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="notes" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Leave a review note for your team…"
                aria-label="Review note"
                rows={3}
                disabled={!canWrite}
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  disabled={!draft.trim() || commentMutation.isPending || !canWrite}
                  onClick={() => commentMutation.mutate(draft.trim())}
                >
                  {commentMutation.isPending && (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  )}
                  Add note
                </Button>
              </div>
            </div>

            {data.comments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No review notes yet. The first note starts the review trail.
              </p>
            ) : (
              <ul className="space-y-3">
                {data.comments.map((c) => (
                  <li key={c.id} className="rounded-md border border-border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-sm">
                        <span className="font-medium">{c.authorName}</span>{" "}
                        <span className="text-xs text-muted-foreground">
                          {timeAgo(c.createdAt)}
                        </span>
                        {c.resolvedAt && (
                          <Badge variant="outline" className="ml-2">
                            Resolved
                          </Badge>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={c.resolvedAt ? "Reopen note" : "Resolve note"}
                        onClick={async () => {
                          try {
                            await resolveComment({
                              data: { id: c.id, resolved: !c.resolvedAt },
                            });
                            void refresh();
                          } catch (e) {
                            toast.error(e instanceof Error ? e.message : "Could not update note.");
                          }
                        }}
                      >
                        {c.resolvedAt ? (
                          <RotateCcw className="h-3.5 w-3.5" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm">{c.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="people" className="space-y-4 pt-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Owner
              </p>
              <p className="mt-1 text-sm">{owner ? owner.displayName : "Not assigned yet"}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Contributors
              </p>
              {contributors.length === 0 ? (
                <p className="mt-1 text-sm text-muted-foreground">None yet</p>
              ) : (
                <ul className="mt-1 flex flex-wrap gap-2">
                  {contributors.map((c) => (
                    <li key={c.id}>
                      <Badge variant="secondary" className="gap-1">
                        {c.displayName}
                        <button
                          type="button"
                          aria-label={`Remove ${c.displayName}`}
                          onClick={async () => {
                            try {
                              await unassign({ data: { id: c.id } });
                              void refresh();
                            } catch (e) {
                              toast.error(
                                e instanceof Error ? e.message : "Could not remove assignment.",
                              );
                            }
                          }}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {canWrite && (
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={assignRole}
                  onValueChange={(v) => setAssignRole(v as AssignmentRole)}
                >
                  <SelectTrigger className="h-8 w-40" aria-label="Assignment role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSIGNMENT_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {ASSIGNMENT_ROLE_LABELS[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value="" onValueChange={(v) => assignMutation.mutate(v)}>
                  <SelectTrigger className="h-8 w-56" aria-label="Assign teammate">
                    <SelectValue placeholder="Assign a teammate" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignable.map((m) => (
                      <SelectItem key={m.userId} value={m.userId}>
                        {m.displayName}
                        {m.isSelf ? " (you)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button asChild size="sm" variant="ghost">
                  <Link to="/account/team">Manage team</Link>
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="activity" className="space-y-3 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Select
                value={activityFilter}
                onValueChange={(v) => {
                  setActivityFilter(v as ActivityCategory);
                  setActivityPages(1);
                }}
              >
                <SelectTrigger className="h-8 w-48" aria-label="Activity filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {ACTIVITY_CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground" data-testid="activity-count">
                Showing {visibleActivity.length} of {filteredActivity.length} events
              </p>
            </div>
            {filteredActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {data.activity.length === 0
                  ? "No recorded activity yet."
                  : "No activity matches this filter."}
              </p>
            ) : (
              <>
                <ol className="space-y-3 border-l border-border pl-4">
                  {visibleActivity.map((a) => (
                    <li key={a.id} className="relative text-sm" data-event={a.event}>
                      <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                      <span className="font-medium">{a.actorName}</span> {a.summary}
                      <span className="ml-2 text-xs text-muted-foreground">{timeAgo(a.at)}</span>
                    </li>
                  ))}
                </ol>
                {visibleActivity.length < filteredActivity.length && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActivityPages((p) => p + 1)}
                  >
                    Show more activity
                  </Button>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
