/**
 * Evidence editor for one benefit.
 *
 * Two kinds of proof are supported: an external link (a dashboard, a finance
 * report, a signed memo) and an uploaded file held in the private evidence
 * bucket. Uploads are never public — opening one issues a short-lived signed
 * URL scoped to the signed-in user.
 */

import { useState } from "react";
import { toast } from "sonner";
import { ExternalLink, Loader2, Paperclip, Plus, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toUserMessage } from "@/lib/domain/errors";
import {
  getEvidenceUrl,
  newEvidenceId,
  removeEvidenceFile,
  uploadEvidenceFile,
} from "@/lib/domain/benefit-evidence.repository";
import type { BenefitEvidenceItem } from "@/lib/value/benefits.model";

export function BenefitEvidenceEditor({
  useCaseId,
  items,
  onChange,
  disabled,
}: {
  useCaseId: string;
  items: BenefitEvidenceItem[];
  onChange: (next: BenefitEvidenceItem[]) => void;
  disabled?: boolean;
}) {
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);

  const addLink = () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;
    if (!/^https?:\/\//i.test(trimmedUrl)) {
      toast.error("Evidence links must start with http:// or https://");
      return;
    }
    onChange([
      ...items,
      {
        id: newEvidenceId(),
        kind: "link",
        label: label.trim() || trimmedUrl,
        url: trimmedUrl,
        addedAt: new Date().toISOString(),
      },
    ]);
    setLabel("");
    setUrl("");
  };

  const addFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const item = await uploadEvidenceFile(useCaseId, file);
      onChange([...items, item]);
      toast.success("Evidence uploaded");
    } catch (err) {
      toast.error(toUserMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const open = async (item: BenefitEvidenceItem) => {
    if (item.kind === "link" && item.url) {
      window.open(item.url, "_blank", "noopener,noreferrer");
      return;
    }
    if (!item.path) return;
    setOpening(item.id);
    try {
      const signed = await getEvidenceUrl(item.path);
      window.open(signed, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(toUserMessage(err));
    } finally {
      setOpening(null);
    }
  };

  const remove = async (item: BenefitEvidenceItem) => {
    onChange(items.filter((i) => i.id !== item.id));
    if (item.kind === "file" && item.path) {
      try {
        await removeEvidenceFile(item.path);
      } catch {
        // The reference is gone from the benefit either way; the orphaned
        // object stays in the user's own private folder.
      }
    }
  };

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
          Evidence attachments
        </Label>
        <Badge variant="outline">{items.length} attached</Badge>
      </div>

      {items.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">
          Attach the measurement behind this benefit so a reviewer can check it rather than take it
          on trust.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-2 py-1.5"
            >
              <span className="flex min-w-0 items-center gap-2 text-xs">
                {item.kind === "file" ? (
                  <Paperclip className="h-3.5 w-3.5 shrink-0" aria-hidden />
                ) : (
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
                )}
                <span className="truncate">{item.label}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={opening === item.id}
                  onClick={() => void open(item)}
                >
                  {opening === item.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    "Open"
                  )}
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={`Remove evidence ${item.label}`}
                  disabled={disabled}
                  onClick={() => void remove(item)}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]">
        <Input
          aria-label="Evidence label"
          placeholder="Label (optional)"
          value={label}
          disabled={disabled}
          onChange={(e) => setLabel(e.target.value)}
        />
        <Input
          aria-label="Evidence link"
          placeholder="https://…"
          value={url}
          disabled={disabled}
          onChange={(e) => setUrl(e.target.value)}
        />
        <Button
          type="button"
          variant="outline"
          onClick={addLink}
          disabled={disabled || !url.trim()}
        >
          <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
          Add link
        </Button>
      </div>

      <div>
        <Label
          htmlFor="benefit-evidence-file"
          className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Upload className="h-3.5 w-3.5" aria-hidden />
          )}
          {busy ? "Uploading…" : "Upload evidence file"}
        </Label>
        <input
          id="benefit-evidence-file"
          type="file"
          className="sr-only"
          disabled={disabled || busy}
          onChange={(e) => {
            void addFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <p className="mt-1 text-[11px] text-muted-foreground">
          Files stay private to your account and open through a short-lived link. Max 10 MB.
        </p>
      </div>
    </div>
  );
}
