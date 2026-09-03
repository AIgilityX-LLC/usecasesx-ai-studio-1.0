/**
 * Launch waiver panel.
 *
 * Pilot seats and pilot evidence are the two gates holding the go-live
 * decision. Until real participants are enrolled, a named, expiring waiver
 * lets the decision proceed as a *conditional* go without pretending the
 * evidence exists. Everything shown here is a recorded row: approver, reason,
 * expiry, and a one-click retirement once real evidence lands.
 */
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertCircle, ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { grantLaunchWaiverFn, revokeLaunchWaiverFn } from "@/lib/pilot/pilot.functions";
import { waiverAdvice, type WaiverEvidence } from "@/lib/release/waiver-advice";

export type ActiveWaiverView = {
  id: string;
  scope: string;
  reason: string;
  approverName: string;
  approverRole: string;
  expiresAt: string | null;
  createdAt: string;
};

function formatDate(value: string | null): string {
  if (!value) return "no expiry";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "no expiry" : date.toUTCString().slice(0, 16);
}

/** Default expiry: 30 days out, so a waiver cannot silently become permanent. */
function defaultExpiry(): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 30);
  return date.toISOString().slice(0, 10);
}

export function ReadinessWaiverPanel({
  waiver,
  evidence,
  onChanged,
}: {
  waiver: ActiveWaiverView | null;
  evidence: WaiverEvidence;
  onChanged?: () => void;
}) {
  const queryClient = useQueryClient();
  const grant = useServerFn(grantLaunchWaiverFn);
  const revoke = useServerFn(revokeLaunchWaiverFn);

  const [approverName, setApproverName] = useState("");
  const [approverRole, setApproverRole] = useState("");
  const [reason, setReason] = useState("");
  const [expiresOn, setExpiresOn] = useState(defaultExpiry());
  const [revokeReason, setRevokeReason] = useState("");

  const advice = waiverAdvice(evidence, Boolean(waiver));

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["launch-readiness"] });
    onChanged?.();
  };

  const grantMutation = useMutation({
    mutationFn: async () =>
      grant({
        data: {
          reason: reason.trim(),
          approverName: approverName.trim(),
          approverRole: approverRole.trim(),
          ...(expiresOn ? { expiresAt: new Date(`${expiresOn}T23:59:59Z`).toISOString() } : {}),
        },
      }),
    onSuccess: () => {
      toast.success("Waiver recorded", {
        description: "The pilot gates now read as conditional, with the approver on record.",
      });
      setReason("");
      refresh();
    },
    onError: (error: unknown) =>
      toast.error("Waiver not recorded", {
        description: error instanceof Error ? error.message : "Please try again.",
      }),
  });

  const revokeMutation = useMutation({
    mutationFn: async () => {
      if (!waiver) throw new Error("No active waiver to retire.");
      return revoke({
        data: {
          waiverId: waiver.id,
          ...(revokeReason.trim() ? { reason: revokeReason.trim() } : {}),
        },
      });
    },
    onSuccess: () => {
      toast.success("Waiver retired", {
        description: "The pilot gates are scored on measured evidence again.",
      });
      setRevokeReason("");
      refresh();
    },
    onError: (error: unknown) =>
      toast.error("Waiver not retired", {
        description: error instanceof Error ? error.message : "Please try again.",
      }),
  });

  const canGrant =
    approverName.trim().length >= 2 &&
    approverRole.trim().length >= 2 &&
    reason.trim().length >= 20 &&
    !grantMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-3">
          <span>Pilot evidence waiver</span>
          {waiver ? (
            <Badge variant="secondary">Active</Badge>
          ) : (
            <Badge variant="outline">None in force</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{advice.headline}</p>

        {advice.shouldRetire && (
          <Alert>
            <AlertCircle className="h-4 w-4" aria-hidden />
            <AlertTitle>Retire this waiver</AlertTitle>
            <AlertDescription>
              {evidence.seats} seat(s) and {evidence.checkpointResponses} checkpoint response(s) are
              now recorded. The board should stand on that evidence, not the override.
            </AlertDescription>
          </Alert>
        )}

        {waiver ? (
          <div className="space-y-3 rounded-md border p-3">
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Approver</dt>
                <dd>
                  {waiver.approverName} · {waiver.approverRole}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Scope</dt>
                <dd>{waiver.scope}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Granted</dt>
                <dd>{formatDate(waiver.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Expires</dt>
                <dd>{formatDate(waiver.expiresAt)}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Reason</dt>
                <dd>{waiver.reason}</dd>
              </div>
            </dl>
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[16rem] flex-1 space-y-1">
                <Label htmlFor="waiver-revoke-reason">Retirement note (optional)</Label>
                <Input
                  id="waiver-revoke-reason"
                  value={revokeReason}
                  onChange={(event) => setRevokeReason(event.target.value)}
                  placeholder="Real cohort evidence recorded"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => revokeMutation.mutate()}
                disabled={revokeMutation.isPending}
              >
                <ShieldOff className="mr-2 h-4 w-4" aria-hidden />
                {revokeMutation.isPending ? "Retiring…" : "Retire waiver"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 rounded-md border p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="waiver-approver-name">Approver name</Label>
                <Input
                  id="waiver-approver-name"
                  value={approverName}
                  onChange={(event) => setApproverName(event.target.value)}
                  placeholder="Full name of the accountable approver"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="waiver-approver-role">Approver role</Label>
                <Input
                  id="waiver-approver-role"
                  value={approverRole}
                  onChange={(event) => setApproverRole(event.target.value)}
                  placeholder="e.g. Managing Director"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="waiver-reason">Reason (min 20 characters)</Label>
                <Textarea
                  id="waiver-reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  rows={3}
                  placeholder="Why the launch decision may proceed before pilot evidence is complete."
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="waiver-expires">Expires on</Label>
                <Input
                  id="waiver-expires"
                  type="date"
                  value={expiresOn}
                  onChange={(event) => setExpiresOn(event.target.value)}
                />
              </div>
            </div>
            <Button onClick={() => grantMutation.mutate()} disabled={!canGrant}>
              <ShieldCheck className="mr-2 h-4 w-4" aria-hidden />
              {grantMutation.isPending ? "Recording…" : "Record approved waiver"}
            </Button>
            <p className="text-xs text-muted-foreground">
              A waiver only softens the two pilot gates to “attention”. It can never clear a P0
              finding, and every grant and retirement is written to the audit trail.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
