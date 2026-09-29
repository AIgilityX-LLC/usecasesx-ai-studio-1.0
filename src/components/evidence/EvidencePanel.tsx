/**
 * Reusable Evidence panel — link / note / file with status indicators.
 * Usable from Canvas, scores, reviews, value and exports.
 */

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  AlertTriangle,
  ExternalLink,
  FileText,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  ShieldAlert,
  StickyNote,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  createEvidenceFn,
  createEvidenceItemSignedUrlFn,
  listEvidenceFn,
  setEvidenceStatusFn,
} from "@/lib/evidence/evidence.functions";
import {
  evidenceIndicator,
  evidenceSetIndicators,
  type EvidenceItem,
  type EvidenceSubjectType,
} from "@/lib/evidence/model";
import { supabase } from "@/integrations/supabase/client";
import { EVIDENCE_ITEMS_BUCKET } from "@/lib/storage/buckets";
import {
  acceptAttribute,
  evidenceItemsObjectPath,
  validateUpload,
} from "@/lib/storage/storage-policy";
import {
  UploadConstraints,
  UploadError,
  uploadConstraintsText,
} from "@/components/storage/UploadConstraints";
import { EvidenceActivityView } from "@/components/evidence/EvidenceActivityView";

export function EvidencePanel({
  workspaceId,
  organizationId,
  subjectType,
  subjectId,
  recordVersionId,
  applicableFieldHint,
  readOnly,
  showActivity = true,
}: {
  workspaceId: string;
  organizationId?: string | null;
  subjectType: EvidenceSubjectType;
  subjectId: string;
  recordVersionId?: string | null;
  applicableFieldHint?: string;
  readOnly?: boolean;
  showActivity?: boolean;
}) {
  const listFn = useServerFn(listEvidenceFn);
  const createFn = useServerFn(createEvidenceFn);
  const statusFn = useServerFn(setEvidenceStatusFn);
  const signedUrlFn = useServerFn(createEvidenceItemSignedUrlFn);
  const qc = useQueryClient();
  const key = ["evidence", subjectType, subjectId];

  const query = useQuery({
    queryKey: key,
    queryFn: () => listFn({ data: { subjectType, subjectId } }),
  });

  const [kind, setKind] = useState<"link" | "note" | "file">("link");
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [source, setSource] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);

  const items = query.data ?? [];
  const summary = useMemo(() => evidenceSetIndicators(items), [items]);

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: key });
  };

  const add = async (extra: Record<string, unknown> = {}) => {
    setBusy(true);
    try {
      await createFn({
        data: {
          workspaceId,
          organizationId: organizationId ?? null,
          subjectType,
          subjectId,
          recordVersionId: recordVersionId ?? null,
          kind,
          label: label.trim() || (kind === "link" ? url.trim() : kind === "note" ? "Note" : "File"),
          url: kind === "link" ? url.trim() : null,
          note: kind === "note" ? note.trim() : null,
          source: source.trim() || null,
          applicableFields: applicableFieldHint ? [applicableFieldHint] : [],
          confidentiality: "internal",
          ...extra,
        },
      });
      setLabel("");
      setUrl("");
      setNote("");
      setSource("");
      setUploadError(null);
      toast.success("Evidence added.");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add evidence.");
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file || readOnly) return;
    const decision = validateUpload(EVIDENCE_ITEMS_BUCKET, {
      name: file.name,
      size: file.size,
      type: file.type,
    });
    if (!decision.allowed) {
      setUploadError(`${decision.reason} ${uploadConstraintsText(EVIDENCE_ITEMS_BUCKET)}`);
      return;
    }
    setBusy(true);
    setUploadError(null);
    try {
      const path = evidenceItemsObjectPath(workspaceId, subjectType, subjectId, file.name);
      const up = await supabase.storage
        .from(EVIDENCE_ITEMS_BUCKET)
        .upload(path, file, { upsert: false, contentType: file.type });
      if (up.error) throw new Error(up.error.message);
      await add({
        kind: "file",
        label: label.trim() || file.name,
        storagePath: path,
        mimeType: file.type,
        sizeBytes: file.size,
      });
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  const openFile = async (item: EvidenceItem) => {
    setOpening(item.id);
    try {
      const result = await signedUrlFn({ data: { evidenceId: item.id } });
      if (!result.ok) {
        toast.error(result.reason);
        return;
      }
      window.open(result.url, "_blank", "noopener,noreferrer");
    } finally {
      setOpening(null);
    }
  };

  const mark = async (id: string, status: "stale" | "conflict" | "revoked") => {
    try {
      await statusFn({ data: { id, status, statusNote: null } });
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="outline">{summary.total} items</Badge>
        {summary.stale > 0 && (
          <Badge variant="secondary" className="gap-1">
            <AlertTriangle className="h-3 w-3" /> {summary.stale} stale
          </Badge>
        )}
        {summary.conflict > 0 && (
          <Badge variant="destructive" className="gap-1">
            <ShieldAlert className="h-3 w-3" /> {summary.conflict} conflict
          </Badge>
        )}
        {summary.missing > 0 && (
          <Badge variant="secondary">{summary.missing} missing</Badge>
        )}
        <Button type="button" variant="ghost" size="sm" onClick={() => void refresh()}>
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {query.isLoading && (
        <p className="text-sm text-muted-foreground">Loading evidence…</p>
      )}
      {query.isError && (
        <p className="text-sm text-destructive">
          Evidence could not be loaded. Confirm the V2-05 migration is applied.
        </p>
      )}

      <ul className="space-y-2">
        {items.map((item) => {
          const ind = evidenceIndicator(item);
          return (
            <li
              key={item.id}
              className="rounded-md border border-border bg-card px-3 py-2 text-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2 font-medium">
                    {item.kind === "link" && <Link2 className="h-3.5 w-3.5 shrink-0" />}
                    {item.kind === "note" && <StickyNote className="h-3.5 w-3.5 shrink-0" />}
                    {item.kind === "file" && <FileText className="h-3.5 w-3.5 shrink-0" />}
                    <span className="truncate">{item.label}</span>
                    <Badge
                      variant={
                        ind.tone === "danger"
                          ? "destructive"
                          : ind.tone === "warning"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {ind.label}
                    </Badge>
                    <Badge variant="outline">{item.confidentiality}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{ind.reason}</p>
                  {item.source && (
                    <p className="text-xs text-muted-foreground">Source: {item.source}</p>
                  )}
                  {item.kind === "note" && item.note && (
                    <p className="text-xs whitespace-pre-wrap">{item.note}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {item.kind === "link" && item.url && (
                    <Button type="button" size="sm" variant="outline" asChild>
                      <a href={item.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" /> Open
                      </a>
                    </Button>
                  )}
                  {item.kind === "file" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={opening === item.id}
                      onClick={() => void openFile(item)}
                    >
                      {opening === item.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        "Open file"
                      )}
                    </Button>
                  )}
                  {!readOnly && (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => void mark(item.id, "stale")}
                      >
                        Stale
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => void mark(item.id, "conflict")}
                      >
                        Conflict
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => void mark(item.id, "revoked")}
                      >
                        Revoke
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </li>
          );
        })}
        {!query.isLoading && items.length === 0 && (
          <li className="text-sm text-muted-foreground">No evidence attached yet.</li>
        )}
      </ul>

      {!readOnly && (
        <div className="space-y-3 rounded-md border border-dashed border-border p-3">
          <div className="flex flex-wrap gap-2">
            {(["link", "note", "file"] as const).map((k) => (
              <Button
                key={k}
                type="button"
                size="sm"
                variant={kind === k ? "default" : "outline"}
                onClick={() => setKind(k)}
              >
                {k}
              </Button>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="ev-label">Label</Label>
              <Input
                id="ev-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Short title"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ev-source">Source</Label>
              <Input
                id="ev-source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="Owner system or origin"
              />
            </div>
          </div>
          {kind === "link" && (
            <div className="space-y-1">
              <Label htmlFor="ev-url">URL</Label>
              <Input
                id="ev-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://"
              />
              <Button type="button" size="sm" disabled={busy} onClick={() => void add()}>
                <Plus className="h-3.5 w-3.5" /> Add link
              </Button>
            </div>
          )}
          {kind === "note" && (
            <div className="space-y-1">
              <Label htmlFor="ev-note">Note</Label>
              <Textarea
                id="ev-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />
              <Button type="button" size="sm" disabled={busy} onClick={() => void add()}>
                <Plus className="h-3.5 w-3.5" /> Add note
              </Button>
            </div>
          )}
          {kind === "file" && (
            <div className="space-y-2">
              <UploadConstraints bucket={EVIDENCE_ITEMS_BUCKET} />
              {uploadError && <UploadError bucket={EVIDENCE_ITEMS_BUCKET} message={uploadError} />}
              <Label
                htmlFor="ev-file"
                className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
              >
                <Upload className="h-3.5 w-3.5" />
                {busy ? "Uploading…" : "Choose file"}
              </Label>
              <input
                id="ev-file"
                type="file"
                className="sr-only"
                accept={acceptAttribute(EVIDENCE_ITEMS_BUCKET)}
                disabled={busy}
                onChange={(e) => void onFile(e.target.files?.[0])}
              />
            </div>
          )}
        </div>
      )}

      {showActivity && (
        <EvidenceActivityView workspaceId={workspaceId} subjectId={subjectId} />
      )}
    </div>
  );
}
