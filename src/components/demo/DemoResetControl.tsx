/**
 * Demo reset control — confirmation flow, scope selection and status feedback.
 *
 * Destructive for demonstration data only: templates are resolved by
 * `demo_scenario_key` in labelled demo workspaces, and sample copies are
 * scoped to the caller's own workspace.
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AlertTriangle, Loader2, RotateCcw } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEMO_SCENARIOS } from "@/lib/demo/demo-scenarios";
import { listDemoResetLogFn, resetDemoScenariosFn } from "@/lib/demo/demo-scenarios.functions";

type ResetLogRow = {
  id: string;
  actor_label: string | null;
  scope: string;
  scenario_key: string | null;
  status: string;
  created_at: string;
};

export function DemoResetControl() {
  const runReset = useServerFn(resetDemoScenariosFn);
  const listLog = useServerFn(listDemoResetLogFn);
  const queryClient = useQueryClient();

  const [scope, setScope] = useState<string>("all");
  const [includeSamples, setIncludeSamples] = useState(true);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const logQuery = useQuery({
    queryKey: ["demo-reset-log"],
    queryFn: async () => (await listLog()) as ResetLogRow[],
  });

  const mutation = useMutation({
    mutationFn: () =>
      runReset({
        data: {
          scenarioKeys: scope === "all" ? undefined : [scope],
          includeSampleCopies: includeSamples,
        },
      }),
    onSuccess: (result) => {
      setFailure(null);
      const templates = result.results.length
        ? result.results.map((r) => `${r.label}: ${r.status}`).join(" · ")
        : (result.note ?? "no templates re-seeded");
      const samples = result.samples
        ? ` · sample copies removed: ${result.samples.removed.lineageRecords}`
        : "";
      setStatus(`Reset ${new Date(result.resetAt).toLocaleTimeString()} — ${templates}${samples}`);
      toast.success("Demo data reset");
      void queryClient.invalidateQueries({ queryKey: ["demo-reset-log"] });
      void queryClient.invalidateQueries({ queryKey: ["demo-sample-copies"] });
    },
    onError: (error: Error) => {
      setStatus(null);
      setFailure(error.message || "Demo reset failed.");
      toast.error(error.message || "Demo reset failed.");
    },
    onSettled: () => setOpen(false),
  });

  const scopeLabel =
    scope === "all"
      ? "all four demonstration scenarios"
      : (DEMO_SCENARIOS.find((s) => s.key === scope)?.label ?? scope);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Reset demonstration data</CardTitle>
        <CardDescription>
          Re-seeds labelled demo template workspaces and can clear your own sample copies. Tenant
          data is never touched, and a cooldown prevents repeated resets.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="demo-reset-scope">Scope</Label>
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger id="demo-reset-scope">
                <SelectValue placeholder="All scenarios" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All scenarios</SelectItem>
                {DEMO_SCENARIOS.map((s) => (
                  <SelectItem key={s.key} value={s.key}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2 pb-1">
            <Checkbox
              id="demo-reset-samples"
              checked={includeSamples}
              onCheckedChange={(v) => setIncludeSamples(v === true)}
            />
            <Label htmlFor="demo-reset-samples" className="font-normal">
              Also delete my sample copies for this scope
            </Label>
          </div>
        </div>

        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={mutation.isPending} data-testid="demo-reset">
              {mutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="mr-2 h-4 w-4" />
              )}
              Reset demo data
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset {scopeLabel}?</AlertDialogTitle>
              <AlertDialogDescription>
                This deletes and re-creates the demonstration template records for {scopeLabel}
                {includeSamples
                  ? ", and permanently deletes your own sample copies for that scope"
                  : ""}
                . Records in other workspaces are not affected. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(event) => {
                  event.preventDefault();
                  mutation.mutate();
                }}
                data-testid="demo-reset-confirm"
              >
                Yes, reset demo data
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {status && (
          <p role="status" className="text-xs text-muted-foreground">
            {status}
          </p>
        )}
        {failure && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-md border border-destructive/40 p-2 text-xs text-destructive"
          >
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {failure}
          </p>
        )}

        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Recent resets</p>
          {logQuery.isLoading ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : (logQuery.data ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">No resets recorded yet.</p>
          ) : (
            <ul className="space-y-1">
              {(logQuery.data ?? []).slice(0, 5).map((row) => (
                <li key={row.id} className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant="outline">{row.scope}</Badge>
                  <span className="text-muted-foreground">
                    {new Date(row.created_at).toLocaleString()} · {row.actor_label ?? "system"} ·{" "}
                    {row.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
