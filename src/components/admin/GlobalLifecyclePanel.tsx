import { useEffect, useState } from "react";
import { Archive, CheckCircle2, History, RotateCcw, Star, XCircle } from "lucide-react";
import * as adminRepo from "@/lib/domain/admin.repository";
import { toUserMessage } from "@/lib/domain/errors";
import { usePlatformAdmin } from "@/lib/admin/platform-admin";
import type { AdminUseCase } from "@/lib/usecasex.admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui-kit/ConfirmDialog";

type LifecycleAction = "publish" | "unpublish" | "archive" | "restore" | "rollback";

const COPY: Record<LifecycleAction, { title: string; description: string; confirm: string }> = {
  publish: {
    title: "Publish to the global catalogue?",
    description:
      "The record becomes visible to everyone allowed by its visibility setting. A restorable snapshot is stored in the audit trail.",
    confirm: "Publish",
  },
  unpublish: {
    title: "Unpublish this use case?",
    description: "It leaves the public catalogue immediately. Nothing is deleted.",
    confirm: "Unpublish",
  },
  archive: {
    title: "Archive this use case?",
    description: "It is hidden from authors and readers. You can restore it to draft at any time.",
    confirm: "Archive",
  },
  restore: {
    title: "Restore to draft?",
    description: "The record returns to the authoring queue without becoming public.",
    confirm: "Restore",
  },
  rollback: {
    title: "Roll back to the last published version?",
    description:
      "Editorial content is restored from the last published snapshot and the record is unpublished for review. Ownership and tenancy are never changed.",
    confirm: "Roll back",
  },
};

/**
 * Single lifecycle control surface for one global catalogue record.
 * Every state transition (publish / unpublish / archive / restore / feature /
 * rollback) is gated on `canPublishGlobal` so workspace admins can never change
 * global content.
 */
export function GlobalLifecyclePanel({
  useCase,
  onChanged,
}: {
  useCase: AdminUseCase;
  onChanged: () => void | Promise<void>;
}) {
  const { canPublishGlobal } = usePlatformAdmin();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<LifecycleAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshotAt, setSnapshotAt] = useState<string | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setSnapshotLoading(true);
    adminRepo
      .getLastPublishedSnapshot(useCase.id)
      .then((snap) => {
        if (!cancelled) setSnapshotAt(snap?.createdAt ?? null);
      })
      .catch(() => {
        if (!cancelled) setSnapshotAt(null);
      })
      .finally(() => {
        if (!cancelled) setSnapshotLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, useCase.id]);

  const run = async (action: LifecycleAction) => {
    setBusy(true);
    setError(null);
    try {
      if (action === "publish") await adminRepo.publishGlobalUseCase(useCase.id);
      else if (action === "unpublish") await adminRepo.unpublishGlobalUseCase(useCase.id);
      else if (action === "archive") await adminRepo.archiveGlobalUseCase(useCase.id);
      else if (action === "restore") await adminRepo.restoreGlobalUseCase(useCase.id);
      else await adminRepo.rollbackToLastPublished(useCase.id);
      setPending(null);
      setOpen(false);
      await onChanged();
    } catch (e) {
      setError(toUserMessage(e, "We could not apply that lifecycle change."));
    } finally {
      setBusy(false);
    }
  };

  const toggleFeatured = async () => {
    setBusy(true);
    setError(null);
    try {
      await adminRepo.setGlobalUseCaseFeatured(useCase.id, !useCase.featured);
      await onChanged();
    } catch (e) {
      setError(toUserMessage(e, "We could not change the featured flag."));
    } finally {
      setBusy(false);
    }
  };

  if (!canPublishGlobal) return null;

  const isPublished = useCase.status === "Published";
  const isArchived = useCase.status === "Archived";

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" title="Lifecycle actions" aria-label="Lifecycle">
            <History className="w-4 h-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Lifecycle — {useCase.title || "Untitled"}</DialogTitle>
            <DialogDescription>
              Platform-admin controls for the global catalogue record{" "}
              <code className="text-xs">/{useCase.slug}</code>.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="outline">{useCase.status}</Badge>
            <Badge variant="outline">{useCase.visibility}</Badge>
            {useCase.featured && <Badge variant="secondary">Featured</Badge>}
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            {!isPublished && (
              <Button disabled={busy} onClick={() => setPending("publish")}>
                <CheckCircle2 className="w-4 h-4 mr-2" /> Publish
              </Button>
            )}
            {isPublished && (
              <Button variant="outline" disabled={busy} onClick={() => setPending("unpublish")}>
                <XCircle className="w-4 h-4 mr-2" /> Unpublish
              </Button>
            )}
            {!isArchived && (
              <Button variant="outline" disabled={busy} onClick={() => setPending("archive")}>
                <Archive className="w-4 h-4 mr-2" /> Archive
              </Button>
            )}
            {isArchived && (
              <Button variant="outline" disabled={busy} onClick={() => setPending("restore")}>
                <RotateCcw className="w-4 h-4 mr-2" /> Restore to draft
              </Button>
            )}
            <Button variant="outline" disabled={busy} onClick={() => void toggleFeatured()}>
              <Star className="w-4 h-4 mr-2" />
              {useCase.featured ? "Remove from featured" : "Mark as featured"}
            </Button>
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              {snapshotLoading
                ? "Checking published history…"
                : snapshotAt
                  ? `Last published version captured ${new Date(snapshotAt).toLocaleString()}.`
                  : "No published snapshot recorded yet — rollback becomes available after the next publish."}
            </p>
            <Button
              variant="secondary"
              className="w-full"
              disabled={busy || !snapshotAt}
              onClick={() => setPending("rollback")}
            >
              <RotateCcw className="w-4 h-4 mr-2" /> Unpublish &amp; roll back to last published
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(next) => !next && setPending(null)}
        title={pending ? COPY[pending].title : ""}
        description={pending ? COPY[pending].description : ""}
        confirmLabel={pending ? COPY[pending].confirm : "Confirm"}
        destructive={pending === "archive" || pending === "rollback"}
        busy={busy}
        onConfirm={() => (pending ? run(pending) : undefined)}
      />
    </>
  );
}
