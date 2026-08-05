/**
 * Roadmap item editor — the portfolio-specific delivery intent for one use case.
 * Writes only to the membership record; the source use case is never touched.
 */

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DELIVERY_STAGES,
  DELIVERY_STAGE_LABELS,
  type DeliveryStage,
  type PortfolioEntry,
  type PortfolioRoadmapPatch,
} from "@/lib/portfolio-model";

export function RoadmapItemDialog({
  open,
  onOpenChange,
  entry,
  candidates,
  saving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: PortfolioEntry | null;
  /** Other entries in the same portfolio, offered as dependencies. */
  candidates: PortfolioEntry[];
  saving: boolean;
  onSave: (patch: PortfolioRoadmapPatch & { nextAction?: string | null }) => Promise<unknown>;
}) {
  const [stage, setStage] = useState<DeliveryStage>("unscheduled");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [milestone, setMilestone] = useState("");
  const [owner, setOwner] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [blocked, setBlocked] = useState("");
  const [deps, setDeps] = useState<string[]>([]);

  useEffect(() => {
    if (!entry) return;
    setStage(entry.deliveryStage ?? "unscheduled");
    setStart(entry.plannedStartDate ?? "");
    setEnd(entry.plannedEndDate ?? "");
    setMilestone(entry.milestone ?? "");
    setOwner(entry.deliveryOwner ?? "");
    setNextAction(entry.nextAction ?? "");
    setBlocked(entry.blockedReason ?? "");
    setDeps(entry.dependsOn ?? []);
  }, [entry]);

  const submit = async () => {
    if (start && end && end < start) {
      toast.error("Planned end date cannot be before the planned start date");
      return;
    }
    try {
      await onSave({
        deliveryStage: stage,
        plannedStartDate: start || null,
        plannedEndDate: end || null,
        milestone: milestone || null,
        deliveryOwner: owner || null,
        nextAction: nextAction || null,
        blockedReason: blocked || null,
        dependsOn: deps,
      });
      toast.success("Roadmap updated");
      onOpenChange(false);
    } catch {
      toast.error("Could not save the roadmap change");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{entry?.useCaseTitle ?? "Roadmap item"}</DialogTitle>
          <DialogDescription>
            Delivery intent for this portfolio only. Tasks and sprints stay in your PPM tool.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="roadmap-stage">Delivery stage</Label>
            <Select value={stage} onValueChange={(v) => setStage(v as DeliveryStage)}>
              <SelectTrigger id="roadmap-stage">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DELIVERY_STAGES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {DELIVERY_STAGE_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="roadmap-start">Planned start</Label>
              <Input
                id="roadmap-start"
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="roadmap-end">Planned end</Label>
              <Input
                id="roadmap-end"
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="roadmap-milestone">Milestone</Label>
            <Input
              id="roadmap-milestone"
              value={milestone}
              placeholder="e.g. Pilot go-live"
              onChange={(e) => setMilestone(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="roadmap-owner">Delivery owner</Label>
            <Input
              id="roadmap-owner"
              value={owner}
              placeholder="Accountable person or team"
              onChange={(e) => setOwner(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="roadmap-next-action">Next action</Label>
            <Input
              id="roadmap-next-action"
              value={nextAction}
              placeholder="The single next step"
              onChange={(e) => setNextAction(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="roadmap-blocked">Blocker (optional)</Label>
            <Textarea
              id="roadmap-blocked"
              rows={2}
              value={blocked}
              placeholder="What is holding this back?"
              onChange={(e) => setBlocked(e.target.value)}
            />
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Depends on</legend>
            {candidates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Add more use cases to this portfolio to record dependencies.
              </p>
            ) : (
              <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border p-3">
                {candidates.map((c) => (
                  <label key={c.useCaseId} className="flex items-start gap-2 text-sm">
                    <Checkbox
                      checked={deps.includes(c.useCaseId)}
                      onCheckedChange={(v) =>
                        setDeps((prev) =>
                          v === true
                            ? [...prev, c.useCaseId]
                            : prev.filter((x) => x !== c.useCaseId),
                        )
                      }
                    />
                    <span>{c.useCaseTitle ?? c.useCaseSlug ?? c.useCaseId}</span>
                  </label>
                ))}
              </div>
            )}
          </fieldset>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Saving…" : "Save roadmap"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
