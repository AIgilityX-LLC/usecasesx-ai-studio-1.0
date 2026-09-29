import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AiSafetyNotice } from "@/components/ai/AiSafetyNotice";
import { useServerFn } from "@tanstack/react-start";
import { recordAiFeedbackFn } from "@/lib/ai.functions";
import type { AiTask } from "@/lib/ai/prompts";

/**
 * A single AI suggestion shown as a drafted proposal.
 * Never auto-applies — the user must click Apply (FR-02 / FR-14).
 * Optional Dismiss / Feedback are redacted telemetry only.
 */
export function AiDraftSuggestion({
  title,
  body,
  reason,
  source,
  onApply,
  onDismiss,
  applyLabel = "Apply",
  task,
  promptVersion,
  entityType,
  entityId,
  correlationId,
  confidenceCaveat,
}: {
  title: string;
  body: string;
  reason?: string | null;
  source?: string | null;
  onApply: () => void;
  onDismiss?: () => void;
  applyLabel?: string;
  task?: AiTask;
  promptVersion?: string;
  entityType?: string;
  entityId?: string;
  correlationId?: string;
  confidenceCaveat?: string;
}) {
  const recordFeedback = useServerFn(recordAiFeedbackFn);

  const send = (action: "apply" | "dismiss" | "helpful" | "unhelpful") => {
    if (!task || !promptVersion) return;
    void recordFeedback({
      data: {
        task,
        action,
        promptVersion,
        entityType,
        entityId,
        correlationId,
      },
    }).catch(() => {
      /* feedback must never block Apply */
    });
  };

  return (
    <div className="space-y-2 rounded-md border border-dashed border-border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
          AI draft
        </Badge>
        <p className="text-sm font-medium text-foreground">{title}</p>
      </div>
      <p className="whitespace-pre-wrap text-sm text-muted-foreground">{body}</p>
      {(reason || source) && (
        <p className="text-xs text-muted-foreground">
          {reason ? <span>Reason: {reason}</span> : null}
          {reason && source ? " · " : null}
          {source ? <span>Source: {source}</span> : null}
        </p>
      )}
      {confidenceCaveat ? (
        <p className="text-xs text-muted-foreground">{confidenceCaveat}</p>
      ) : null}
      <AiSafetyNotice variant="inline" what="This draft" />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => {
            send("apply");
            onApply();
          }}
        >
          {applyLabel}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            send("dismiss");
            onDismiss?.();
          }}
        >
          Dismiss
        </Button>
        {task && promptVersion ? (
          <>
            <Button type="button" size="sm" variant="ghost" onClick={() => send("helpful")}>
              Helpful
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => send("unhelpful")}>
              Not helpful
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
