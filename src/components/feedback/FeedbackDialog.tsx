import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";
import { CheckCircle2, MessageSquarePlus } from "lucide-react";

import { submitFeedback } from "@/lib/feedback/feedback.functions";
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_MESSAGE_MAX,
  FEEDBACK_MESSAGE_MIN,
  FEEDBACK_SEVERITIES,
  SUPPORT_EXPECTATIONS,
  type FeedbackCategory,
  type FeedbackSeverity,
} from "@/lib/feedback/feedback.model";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Props {
  /** Optional record the feedback is about (e.g. a use case). */
  entityType?: string | null;
  entityId?: string | null;
  triggerLabel?: string;
  variant?: "default" | "outline" | "secondary";
}

/**
 * In-app feedback capture. Structured fields land in the internal queue; the
 * free-text message is stored on the feedback record only and never copied
 * into analytics payloads.
 */
export function FeedbackDialog({
  entityType = null,
  entityId = null,
  triggerLabel = "Send feedback",
  variant = "outline",
}: Props) {
  const send = useServerFn(submitFeedback);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<FeedbackCategory>("usability");
  const [severity, setSeverity] = useState<FeedbackSeverity>("normal");
  const [message, setMessage] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [allowContact, setAllowContact] = useState(false);
  const [contactEmail, setContactEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Set once the submission is persisted — drives the in-dialog receipt. */
  const [receipt, setReceipt] = useState<{
    id: string;
    createdAt: string;
    status: string;
    category: string;
    severity: string;
  } | null>(null);

  const tooShort = message.trim().length < FEEDBACK_MESSAGE_MIN;

  async function handleSubmit() {
    if (tooShort) {
      setError(`Please add at least ${FEEDBACK_MESSAGE_MIN} characters.`);
      return;
    }
    if (allowContact && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contactEmail.trim())) {
      setError("Add a valid email address, or turn off the contact option.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const record = await send({
        data: {
          category,
          severity,
          message: message.trim().slice(0, FEEDBACK_MESSAGE_MAX),
          contextRoute: pathname,
          entityType,
          entityId,
          evidenceUrl: evidenceUrl.trim() ? evidenceUrl.trim() : null,
          allowContact,
          contactEmail: allowContact ? contactEmail.trim() : null,
        },
      });
      const createdAt = record?.createdAt ?? new Date().toISOString();
      setReceipt({
        id: String(record?.id ?? ""),
        createdAt,
        status: String(record?.status ?? "new"),
        category: String(record?.category ?? category),
        severity: String(record?.severity ?? severity),
      });
      toast.success("Feedback received — reference recorded.");
      setMessage("");
      setEvidenceUrl("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not send feedback. Try again.");
    } finally {
      setBusy(false);
    }
  }

  /** Clears the receipt so the dialog reopens as a blank form next time. */
  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setReceipt(null);
      setError(null);
    }
  }

  const reference = receipt ? receipt.id.slice(0, 8).toUpperCase() : "";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant={variant} size="sm">
          <MessageSquarePlus className="mr-2 h-4 w-4" aria-hidden="true" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {receipt ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden="true" />
                Request received
              </DialogTitle>
              <DialogDescription>
                It is in the internal triage queue. You can track its status on the support page at
                any time.
              </DialogDescription>
            </DialogHeader>

            <div role="status" className="space-y-3 rounded-md border border-border p-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">Reference {reference}</Badge>
                <Badge variant="secondary">Status: {receipt.status}</Badge>
                <Badge variant="outline">{receipt.category}</Badge>
                <Badge variant="outline">{receipt.severity}</Badge>
              </div>
              <p className="text-muted-foreground">
                Submitted{" "}
                <time dateTime={receipt.createdAt}>
                  {new Date(receipt.createdAt).toLocaleString()}
                </time>
              </p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {SUPPORT_EXPECTATIONS.map((item) => (
                  <li key={item.title}>
                    <span className="font-medium text-foreground">{item.title}:</span> {item.detail}
                  </li>
                ))}
              </ul>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setReceipt(null)}>
                Send another
              </Button>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
        <DialogHeader>
          <DialogTitle>Send product feedback</DialogTitle>
          <DialogDescription>
            Goes to the internal launch queue. We store the page you were on, not your work content.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="feedback-category">Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as FeedbackCategory)}>
                <SelectTrigger id="feedback-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FEEDBACK_CATEGORIES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="feedback-severity">Severity</Label>
              <Select value={severity} onValueChange={(v) => setSeverity(v as FeedbackSeverity)}>
                <SelectTrigger id="feedback-severity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FEEDBACK_SEVERITIES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback-message">What happened?</Label>
            <Textarea
              id="feedback-message"
              rows={5}
              value={message}
              maxLength={FEEDBACK_MESSAGE_MAX}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Describe what you expected and what you saw."
            />
            <p className="text-xs text-muted-foreground">
              Context: <span className="font-mono">{pathname}</span>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback-evidence">Evidence link (optional)</Label>
            <Input
              id="feedback-evidence"
              type="url"
              value={evidenceUrl}
              onChange={(event) => setEvidenceUrl(event.target.value)}
              placeholder="https://…"
            />
          </div>

          <div className="space-y-3 rounded-md border border-border p-3">
            <div className="flex items-start gap-2">
              <Checkbox
                id="feedback-consent"
                checked={allowContact}
                onCheckedChange={(value) => setAllowContact(value === true)}
              />
              <Label htmlFor="feedback-consent" className="text-sm font-normal leading-snug">
                You may contact me about this feedback.
              </Label>
            </div>
            {allowContact ? (
              <Input
                type="email"
                aria-label="Contact email"
                value={contactEmail}
                onChange={(event) => setContactEmail(event.target.value)}
                placeholder="you@company.com"
              />
            ) : null}
            <ul className="space-y-1 text-xs text-muted-foreground">
              {SUPPORT_EXPECTATIONS.map((item) => (
                <li key={item.title}>
                  <span className="font-medium text-foreground">{item.title}:</span> {item.detail}
                </li>
              ))}
            </ul>
          </div>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={busy || tooShort}>
            {busy ? "Sending…" : "Send feedback"}
          </Button>
        </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
