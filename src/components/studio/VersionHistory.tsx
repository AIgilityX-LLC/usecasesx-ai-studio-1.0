/**
 * Version history for a use case. Lists every completed version and lets the
 * author inspect what changed between that snapshot and the working draft.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { History, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DiffView } from "@/components/studio/DiffView";
import { getWizardVersionFn } from "@/lib/studio-wizard.functions";
import { diffWizardState, type WizardState } from "@/lib/studio-wizard";

export type VersionRow = {
  id: string;
  version: number;
  note: string | null;
  created_at: string;
};

export function VersionHistory({
  useCaseId,
  versions,
  currentState,
}: {
  useCaseId: string;
  versions: VersionRow[];
  currentState: WizardState;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const loadVersion = useServerFn(getWizardVersionFn);

  const snapshot = useQuery({
    queryKey: ["studio-wizard-version", useCaseId, selected],
    queryFn: () => loadVersion({ data: { id: useCaseId, version: selected as number } }),
    enabled: open && selected !== null,
  });

  const diff = snapshot.data ? diffWizardState(snapshot.data.wizardState, currentState) : [];

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setSelected(null);
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="w-full justify-start">
          <History className="mr-2 h-4 w-4" aria-hidden />
          Version history ({versions.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Version history</DialogTitle>
          <DialogDescription>
            Each completed version is an immutable snapshot. Select one to see what has changed
            since, compared with the draft you are editing now.
          </DialogDescription>
        </DialogHeader>

        {versions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No versions yet. Completing the use case records version 1.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-[200px_1fr]">
            <ul className="space-y-1">
              {versions.map((v) => (
                <li key={v.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(v.version)}
                    aria-pressed={selected === v.version}
                    className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                      selected === v.version
                        ? "bg-secondary font-medium"
                        : "text-muted-foreground hover:bg-secondary/60"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Badge variant="outline">v{v.version}</Badge>
                      <span className="truncate">
                        {new Date(v.created_at).toLocaleDateString()}
                      </span>
                    </span>
                    {v.note && <span className="mt-1 block truncate text-xs">{v.note}</span>}
                  </button>
                </li>
              ))}
            </ul>

            <div className="min-w-0">
              {selected === null && (
                <p className="text-sm text-muted-foreground">
                  Select a version on the left to compare it with the current draft.
                </p>
              )}
              {selected !== null && snapshot.isLoading && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading snapshot…
                </p>
              )}
              {selected !== null && snapshot.isError && (
                <p className="text-sm text-destructive">We could not load that version.</p>
              )}
              {snapshot.data && (
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Comparing v{snapshot.data.version} (
                    {new Date(snapshot.data.createdAt).toLocaleString()}) with the current draft.
                  </p>
                  {diff.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nothing has changed since this version.
                    </p>
                  ) : (
                    diff.map((d) => (
                      <div key={`${d.stepId}-${d.key}`} className="rounded-md border p-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          {d.stepTitle}
                        </p>
                        <p className="text-sm font-medium">{d.label}</p>
                        <DiffView changes={d.changes} className="mt-2" />
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
