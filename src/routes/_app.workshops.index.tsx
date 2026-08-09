import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { PageHeader, EmptyState, ErrorState, CardSkeleton } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STAGE_META, WORKSHOP_STATUS_LABEL } from "@/lib/workshops";
import { createWorkshopFn, listWorkshopsFn } from "@/lib/workshops.functions";

export const Route = createFileRoute("/_app/workshops")({
  head: () => ({
    meta: [
      { title: "Workshops — AI Discovery & Value Design" },
      {
        name: "description",
        content:
          "Run advisory-led AI discovery and value design sessions: context, pain points, opportunity capture, scoring, shortlist and outcome summary.",
      },
      { property: "og:title", content: "Workshops — AI Discovery & Value Design" },
      {
        property: "og:description",
        content: "Structured, facilitator-led AI discovery sessions from context to outcome summary.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WorkshopsPage,
});

function WorkshopsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [objective, setObjective] = useState("");
  const [functions, setFunctions] = useState("");
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");

  const list = useQuery({ queryKey: ["workshops"], queryFn: () => listWorkshopsFn() });

  const create = useMutation({
    mutationFn: () =>
      createWorkshopFn({
        data: {
          title: title.trim(),
          clientName: clientName.trim(),
          objective: objective.trim(),
          businessFunctions: functions
            .split(",")
            .map((f) => f.trim())
            .filter(Boolean),
          startsOn: startsOn || null,
          endsOn: endsOn || null,
        },
      }),
    onSuccess: (workshop) => {
      toast.success("Workshop created");
      void qc.invalidateQueries({ queryKey: ["workshops"] });
      void navigate({ to: "/workshops/$id", params: { id: workshop.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <PageHeader
        title="Workshops"
        description="Facilitator-led AI discovery and value design sessions. Structured collaboration, traceable votes, and outcomes that flow into Capture, Studio and Portfolio."
        actions={
          <Button onClick={() => setOpen((v) => !v)}>
            <Plus className="mr-2 h-4 w-4" /> New workshop
          </Button>
        }
      />

      {open && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Set up a session</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (title.trim().length < 3) {
                  toast.error("Give the session a name");
                  return;
                }
                create.mutate();
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="ws-title">Session name</Label>
                <Input id="ws-title" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ws-client">Client / workspace</Label>
                <Input
                  id="ws-client"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="ws-objective">Objective</Label>
                <Textarea
                  id="ws-objective"
                  rows={3}
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="ws-functions">Business functions in scope</Label>
                <Input
                  id="ws-functions"
                  placeholder="Finance, Supply Chain, Customer Service"
                  value={functions}
                  onChange={(e) => setFunctions(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ws-start">Starts</Label>
                <Input
                  id="ws-start"
                  type="date"
                  value={startsOn}
                  onChange={(e) => setStartsOn(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ws-end">Ends</Label>
                <Input
                  id="ws-end"
                  type="date"
                  value={endsOn}
                  onChange={(e) => setEndsOn(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={create.isPending}>
                  {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create workshop
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {list.isLoading ? (
        <CardSkeleton />
      ) : list.isError ? (
        <ErrorState
          title="Could not load workshops"
          description="Please try again in a moment."
          onRetry={() => void list.refetch()}
        />
      ) : (list.data ?? []).length === 0 ? (
        <EmptyState
          title="No workshops yet"
          description="Create a session to run Discover → Capture → Score → Shortlist with a client team."
        />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {(list.data ?? []).map((w) => (
            <li key={w.id}>
              <Link
                to="/workshops/$id"
                params={{ id: w.id }}
                className="block rounded-lg border border-border p-4 transition-colors hover:bg-secondary"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{w.title}</span>
                  <Badge variant={w.status === "live" ? "default" : "secondary"}>
                    {WORKSHOP_STATUS_LABEL[w.status]}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {w.clientName || "No client recorded"} · {STAGE_META[w.stage].label}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
