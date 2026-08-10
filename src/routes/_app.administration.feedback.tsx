import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { privateHead } from "@/lib/seo";
import { RequireRoles } from "@/components/RequireRoles";
import { PLATFORM_ADMIN_ROLES } from "@/lib/admin/platform-admin";
import { getFeedbackQueue, updateFeedbackStatus } from "@/lib/feedback/feedback.functions";
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_STATUSES,
  type FeedbackStatus,
} from "@/lib/feedback/feedback.model";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_app/administration/feedback")({
  head: () => privateHead("Product feedback queue"),
  component: FeedbackQueueRoute,
});

const SEVERITY_TONE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  blocking: "destructive",
  high: "default",
  normal: "secondary",
  low: "outline",
};

function FeedbackQueue() {
  const load = useServerFn(getFeedbackQueue);
  const update = useServerFn(updateFeedbackStatus);
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [includeDemo, setIncludeDemo] = useState(false);

  const queue = useQuery({
    queryKey: ["feedback-queue", status, category, includeDemo],
    queryFn: () =>
      load({
        data: {
          status: status === "all" ? null : (status as FeedbackStatus),
          category: category === "all" ? null : category,
          includeDemo,
        },
      }),
  });

  const mutate = useMutation({
    mutationFn: (input: { id: string; status: FeedbackStatus }) =>
      update({ data: { id: input.id, status: input.status, resolutionNote: null } }),
    onSuccess: () => {
      toast.success("Feedback updated.");
      void queryClient.invalidateQueries({ queryKey: ["feedback-queue"] });
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Could not update feedback."),
  });

  const items = queue.data ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Product feedback queue</h1>
        <p className="text-sm text-muted-foreground">
          In-app feedback from Lite and Pro users. Demo and internal activity is excluded unless you
          include it explicitly.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <Label htmlFor="queue-status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="queue-status" className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {FEEDBACK_STATUSES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="queue-category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="queue-category" className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {FEEDBACK_CATEGORIES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 pb-2">
            <Checkbox
              id="queue-demo"
              checked={includeDemo}
              onCheckedChange={(value) => setIncludeDemo(value === true)}
            />
            <Label htmlFor="queue-demo" className="text-sm font-normal">
              Include demo / internal activity
            </Label>
          </div>
        </CardContent>
      </Card>

      {queue.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading queue…</p>
      ) : queue.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {queue.error instanceof Error ? queue.error.message : "Could not load the queue."}
        </p>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No feedback matches these filters yet.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id}>
              <Card>
                <CardContent className="space-y-3 pt-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={SEVERITY_TONE[item.severity] ?? "secondary"}>
                      {item.severity}
                    </Badge>
                    <Badge variant="outline">{item.category}</Badge>
                    <Badge variant="outline">{item.status}</Badge>
                    {!item.isRealActivity ? <Badge variant="secondary">demo</Badge> : null}
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm">{item.message}</p>
                  <p className="text-xs text-muted-foreground">
                    Context: <span className="font-mono">{item.contextRoute ?? "—"}</span>
                    {item.evidenceUrl ? (
                      <>
                        {" · "}
                        <a
                          className="underline"
                          href={item.evidenceUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          evidence
                        </a>
                      </>
                    ) : null}
                    {item.allowContact ? " · contact consented" : " · no contact consent"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {FEEDBACK_STATUSES.filter((value) => value !== item.status).map((value) => (
                      <Button
                        key={value}
                        size="sm"
                        variant="outline"
                        disabled={mutate.isPending}
                        onClick={() => mutate.mutate({ id: item.id, status: value })}
                      >
                        Mark {value}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FeedbackQueueRoute() {
  return (
    <RequireRoles anyOf={PLATFORM_ADMIN_ROLES} action="triage product feedback">
      <FeedbackQueue />
    </RequireRoles>
  );
}
