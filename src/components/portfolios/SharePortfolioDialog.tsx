import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  createPortfolioShare,
  isShareLive,
  listPortfolioShares,
  revokePortfolioShare,
  type PortfolioShare,
} from "@/lib/domain/portfolio-shares.repository";
import { AUDIT_EVENTS, recordAuditEvent } from "@/lib/telemetry";

function shareUrl(token: string) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}/p/${token}`;
}

export function SharePortfolioDialog({
  portfolioId,
  portfolioName,
}: {
  portfolioId: string;
  portfolioName: string;
}) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const queryClient = useQueryClient();

  const shares = useQuery({
    queryKey: ["portfolio", portfolioId, "shares"],
    queryFn: () => listPortfolioShares(portfolioId),
    enabled: open,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["portfolio", portfolioId, "shares"] });

  const create = useMutation({
    mutationFn: () =>
      createPortfolioShare({
        portfolioId,
        label: label || undefined,
        expiresAt: expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : null,
      }),
    onSuccess: async (share) => {
      setLabel("");
      setExpiresAt("");
      await invalidate();
      void recordAuditEvent({
        event: AUDIT_EVENTS.exportGenerated,
        entity: { type: "portfolio", id: portfolioId },
        next: { share_link_created: true, expires_at: share.expiresAt },
      });
      void copy(share.token);
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Could not create the link"),
  });

  const revoke = useMutation({
    mutationFn: (id: string) => revokePortfolioShare(id),
    onSuccess: async () => {
      await invalidate();
      toast.success("Link revoked");
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Could not revoke the link"),
  });

  const copy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(shareUrl(token));
      toast.success("View-only link copied");
    } catch {
      toast.message(shareUrl(token));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Share “{portfolioName}” view-only</DialogTitle>
          <DialogDescription>
            Anyone with the link can read decisions, target periods and funding state. They cannot
            edit anything or see internal notes.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_170px]">
          <div className="space-y-1.5">
            <Label htmlFor="share-label" className="text-xs">
              Label (optional)
            </Label>
            <Input
              id="share-label"
              value={label}
              placeholder="e.g. Exec review"
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="share-expiry" className="text-xs">
              Expires (optional)
            </Label>
            <Input
              id="share-expiry"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>
        </div>

        <Button size="sm" onClick={() => create.mutate()} disabled={create.isPending}>
          {create.isPending ? "Creating…" : "Create view-only link"}
        </Button>

        <div className="space-y-2">
          {shares.isLoading && <p className="text-sm text-muted-foreground">Loading links…</p>}
          {shares.error && (
            <p className="text-sm text-muted-foreground">Share links could not be loaded.</p>
          )}
          {shares.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">No share links yet.</p>
          )}
          {shares.data?.map((share: PortfolioShare) => {
            const live = isShareLive(share);
            return (
              <div
                key={share.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-2.5"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-foreground">
                      {share.label || "Untitled link"}
                    </span>
                    <Badge variant={live ? "secondary" : "outline"} className="text-[10px]">
                      {share.revokedAt ? "Revoked" : live ? "Active" : "Expired"}
                    </Badge>
                  </div>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {share.expiresAt
                      ? `Expires ${new Date(share.expiresAt).toLocaleDateString()}`
                      : "No expiry"}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={!live}
                    onClick={() => copy(share.token)}
                  >
                    Copy link
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={!!share.revokedAt || revoke.isPending}
                    onClick={() => revoke.mutate(share.id)}
                  >
                    Revoke
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
