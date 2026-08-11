import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useRouterState } from "@tanstack/react-router";

import { submitPilotCheckpointFn } from "@/lib/pilot/pilot.functions";
import { WILLINGNESS_OPTIONS, type PilotCheckpoint } from "@/lib/pilot/pilot.model";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SCALE = [1, 2, 3, 4, 5];

/**
 * Journey-anchored feedback checkpoint. The route the participant is on and the
 * journey stage of the checkpoint travel with the answer, so feedback is always
 * readable in context rather than as an unattributed comment.
 */
export function PilotCheckpointForm({ checkpoint }: { checkpoint: PilotCheckpoint }) {
  const submit = useServerFn(submitPilotCheckpointFn);
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const [rating, setRating] = useState<number | null>(null);
  const [effort, setEffort] = useState<number | null>(null);
  const [value, setValue] = useState<number | null>(null);
  const [willingness, setWillingness] = useState<string>("");
  const [advisory, setAdvisory] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [comment, setComment] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      submit({
        data: {
          checkpoint: checkpoint.key as "welcome" | "scoring" | "final",
          journeyStage: checkpoint.stage,
          contextRoute: pathname,
          rating,
          effortRating: effort,
          valueRating: checkpoint.asksValue ? value : null,
          willingness: checkpoint.asksWillingness && willingness ? (willingness as never) : null,
          advisoryInterest: advisory,
          blocked,
          comment: comment.trim() ? comment.trim() : null,
        },
      }),
    onSuccess: () => {
      toast.success("Checkpoint recorded", {
        description: "Thank you — this is linked to where you are in the journey.",
      });
      void queryClient.invalidateQueries({ queryKey: ["my-pilot"] });
    },
    onError: (error: unknown) =>
      toast.error("Could not record your answer", {
        description: error instanceof Error ? error.message : "Please try again.",
      }),
  });

  const scaleRow = (
    label: string,
    current: number | null,
    set: (n: number) => void,
    lowLabel: string,
    highLabel: string,
  ) => (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="flex items-center gap-2" role="radiogroup" aria-label={label}>
        {SCALE.map((n) => (
          <Button
            key={n}
            type="button"
            size="sm"
            variant={current === n ? "default" : "outline"}
            role="radio"
            aria-checked={current === n}
            aria-label={`${label}: ${n} of 5`}
            onClick={() => set(n)}
          >
            {n}
          </Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        1 = {lowLabel} · 5 = {highLabel}
      </p>
    </fieldset>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{checkpoint.title}</CardTitle>
        <p className="text-sm text-muted-foreground">{checkpoint.prompt}</p>
      </CardHeader>
      <CardContent className="space-y-5">
        {scaleRow("Clarity", rating, setRating, "confusing", "completely clear")}
        {scaleRow("Effort required", effort, setEffort, "very hard", "effortless")}
        {checkpoint.asksValue &&
          scaleRow("Value of the output", value, setValue, "no value", "board-ready")}

        {checkpoint.asksWillingness && (
          <div className="space-y-2">
            <Label htmlFor={`willingness-${checkpoint.key}`}>
              If Founding Access ended, how would you fund this?
            </Label>
            <Select value={willingness} onValueChange={setWillingness}>
              <SelectTrigger id={`willingness-${checkpoint.key}`}>
                <SelectValue placeholder="Choose an answer" />
              </SelectTrigger>
              <SelectContent>
                {WILLINGNESS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor={`comment-${checkpoint.key}`}>What should we change? (optional)</Label>
          <Textarea
            id={`comment-${checkpoint.key}`}
            value={comment}
            maxLength={2000}
            rows={3}
            placeholder="Be blunt — this is what shapes the 14 August release."
            onChange={(event) => setComment(event.target.value)}
          />
        </div>

        <div className="flex items-start gap-2">
          <Checkbox
            id={`blocked-${checkpoint.key}`}
            checked={blocked}
            onCheckedChange={(checked) => setBlocked(checked === true)}
          />
          <Label htmlFor={`blocked-${checkpoint.key}`} className="text-sm font-normal">
            I was blocked and could not complete this step
          </Label>
        </div>

        <div className="flex items-start gap-2">
          <Checkbox
            id={`advisory-${checkpoint.key}`}
            checked={advisory}
            onCheckedChange={(checked) => setAdvisory(checked === true)}
          />
          <Label htmlFor={`advisory-${checkpoint.key}`} className="text-sm font-normal">
            I would like to talk to an advisor about our AI portfolio
          </Label>
        </div>

        <Button
          type="button"
          disabled={mutation.isPending || rating == null}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? "Recording…" : "Submit checkpoint"}
        </Button>
        {rating == null && (
          <p className="text-xs text-muted-foreground">Pick a clarity score to submit.</p>
        )}
      </CardContent>
    </Card>
  );
}
