/**
 * Supporting documents for one Sovereign Public Value Canvas™ section.
 *
 * Files are uploaded to a private bucket and recorded against the section they
 * evidence; every attach and removal is audit-logged server-side, and links are
 * short-lived signed URLs minted on demand rather than stored.
 */

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Loader2, Paperclip, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { CANVAS_BUCKET } from "@/lib/storage/buckets";
import {
  acceptAttribute,
  humanBytes,
  safeObjectName,
  validateUpload,
} from "@/lib/storage/storage-policy";
import { documentsBySection, type CanvasDocument } from "@/lib/workshops.canvas-evidence";
import type { CanvasSection } from "@/lib/workshops.public-value";
import {
  canvasDocumentUrlFn,
  deleteCanvasDocumentFn,
  listCanvasDocumentsFn,
  recordCanvasDocumentFn,
} from "@/lib/workshops.functions";

export function useCanvasDocuments(workshopId: string) {
  return useQuery({
    queryKey: ["workshop-canvas-documents", workshopId],
    queryFn: () => listCanvasDocumentsFn({ data: { workshopId } }),
  });
}

export function CanvasDocumentPanel({
  workshopId,
  section,
  sectionLabel,
  documents,
  canEdit,
}: {
  workshopId: string;
  section: CanvasSection;
  sectionLabel: string;
  documents: readonly CanvasDocument[];
  canEdit: boolean;
}) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const mine = documentsBySection(documents)[section] ?? [];

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["workshop-canvas-documents", workshopId] });

  const upload = async (file: File) => {
    const decision = validateUpload(CANVAS_BUCKET, {
      name: file.name,
      size: file.size,
      type: file.type,
    });
    if (!decision.allowed) {
      toast.error("That file was not accepted", { description: decision.reason });
      return;
    }
    setBusy(true);
    try {
      const path = `${workshopId}/${section}/${Date.now()}-${safeObjectName(file.name)}`;
      const stored = await supabase.storage.from(CANVAS_BUCKET).upload(path, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
      if (stored.error) throw new Error(stored.error.message);
      await recordCanvasDocumentFn({
        data: {
          workshopId,
          section,
          label: file.name.slice(0, 160),
          storagePath: path,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          note: null,
        },
      });
      await refresh();
      toast.success("Document attached", { description: `${file.name} → ${sectionLabel}` });
    } catch (error) {
      toast.error("Upload failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const open = useMutation({
    mutationFn: (path: string) => canvasDocumentUrlFn({ data: { path } }),
    onSuccess: (result) => {
      if (result.ok) window.open(result.url, "_blank", "noopener,noreferrer");
      else toast.error("Link unavailable", { description: result.reason });
    },
    onError: (error) =>
      toast.error("Link unavailable", {
        description: error instanceof Error ? error.message : "Please try again.",
      }),
  });

  const remove = useMutation({
    mutationFn: (documentId: string) =>
      deleteCanvasDocumentFn({ data: { workshopId, documentId } }),
    onSuccess: async () => {
      await refresh();
      toast.success("Document removed");
    },
    onError: (error) =>
      toast.error("Document not removed", {
        description: error instanceof Error ? error.message : "Please try again.",
      }),
  });

  return (
    <div className="space-y-2 rounded-md border border-dashed border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Paperclip className="h-3.5 w-3.5" aria-hidden /> Supporting documents ({mine.length})
        </span>
        {canEdit && (
          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              type="file"
              className="h-8 w-56 text-xs"
              accept={acceptAttribute(CANVAS_BUCKET)}
              aria-label={`Attach a document to ${sectionLabel}`}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void upload(file);
              }}
            />
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              {busy ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Upload className="mr-2 h-3.5 w-3.5" aria-hidden />
              )}
              {busy ? "Uploading…" : "Attach"}
            </Button>
          </div>
        )}
      </div>

      {mine.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No mandate, baseline or policy file attached to this section yet.
        </p>
      ) : (
        <ul className="space-y-1">
          {mine.map((document) => (
            <li
              key={document.id}
              className="flex flex-wrap items-center gap-2 rounded border border-border px-2 py-1.5 text-xs"
            >
              <span className="min-w-0 flex-1 truncate font-medium">{document.label}</span>
              <span className="tabular-nums text-muted-foreground">
                {humanBytes(document.sizeBytes)}
              </span>
              <time dateTime={document.createdAt} className="text-muted-foreground">
                {new Date(document.createdAt).toLocaleDateString()}
              </time>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2"
                disabled={open.isPending}
                onClick={() => open.mutate(document.storagePath)}
              >
                <ExternalLink className="mr-1 h-3.5 w-3.5" aria-hidden /> Open
              </Button>
              {canEdit && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-destructive"
                  disabled={remove.isPending}
                  aria-label={`Remove ${document.label}`}
                  onClick={() => remove.mutate(document.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
