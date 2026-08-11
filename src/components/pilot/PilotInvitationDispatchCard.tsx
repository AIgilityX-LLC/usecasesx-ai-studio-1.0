/**
 * Invitation delivery for the pilot cohort.
 *
 * Sends the real invitation message to every enrolled seat and always returns
 * the personal claim links, so a facilitator can hand a seat over directly when
 * email cannot leave the platform yet. Links are admin-only output: they are
 * shown here and downloadable, never written to the dispatch log.
 */

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy, Download, MailCheck, Send } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { dispatchPilotInvitesFn } from "@/lib/pilot/pilot.functions";
import {
  describeDispatch,
  invitationLinksCsv,
  type InviteDispatchResult,
} from "@/lib/pilot/pilot.invites";

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function PilotInvitationDispatchCard({
  cohort,
  seatsEnrolled,
  onDispatched,
}: {
  cohort: string;
  seatsEnrolled: number;
  onDispatched?: () => void;
}) {
  const dispatch = useServerFn(dispatchPilotInvitesFn);
  const [result, setResult] = useState<InviteDispatchResult | null>(null);

  const send = useMutation({
    mutationFn: (input: { resend: boolean }) => dispatch({ data: input }),
    onSuccess: (value) => {
      setResult(value);
      toast.success(value.sent > 0 ? "Invitations sent" : "Invitation links ready", {
        description: describeDispatch(value),
      });
      onDispatched?.();
    },
    onError: (error: unknown) =>
      toast.error("Invitations not sent", {
        description: error instanceof Error ? error.message : "Please try again.",
      }),
  });

  const links = result?.links ?? [];

  return (
    <Card>
      <CardHeader className="gap-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MailCheck className="h-4 w-4" aria-hidden /> Send invitations
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Each enrolled seat gets its own claim link. Opening it while signed in attaches the seat
          to that account, so a participant whose sign-in address differs from the invited address
          still lands in cohort {cohort} — no placeholder identities.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={send.isPending || seatsEnrolled === 0}
            onClick={() => send.mutate({ resend: false })}
          >
            <Send className="mr-2 h-4 w-4" aria-hidden />
            {send.isPending ? "Sending…" : "Send to unclaimed seats"}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={send.isPending || seatsEnrolled === 0}
            onClick={() => send.mutate({ resend: true })}
          >
            Re-send to every seat
          </Button>
          {links.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                download(
                  `pilot-invitation-links-${cohort}.csv`,
                  invitationLinksCsv(links),
                  "text/csv;charset=utf-8",
                )
              }
            >
              <Download className="mr-2 h-4 w-4" aria-hidden /> Download claim links
            </Button>
          )}
        </div>

        {seatsEnrolled === 0 && (
          <p className="text-sm text-muted-foreground">
            Enrol participants first — there are no seats to invite yet.
          </p>
        )}

        {result?.blockedReason && (
          <Alert>
            <AlertTitle>Email could not be sent</AlertTitle>
            <AlertDescription>{result.blockedReason}</AlertDescription>
          </Alert>
        )}

        {result && <p className="text-sm text-muted-foreground">{describeDispatch(result)}</p>}

        {result && result.skipped.length > 0 && (
          <ul className="space-y-1 text-xs text-muted-foreground">
            {result.skipped.map((skip) => (
              <li key={`${skip.email}-${skip.reason}`}>
                <span className="font-medium">{skip.email}</span> — {skip.reason}
              </li>
            ))}
          </ul>
        )}

        {links.length > 0 && (
          <ul className="space-y-2">
            {links.map((row) => (
              <li
                key={row.email}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{row.fullName ?? row.email}</span>
                  <span className="block truncate text-xs text-muted-foreground">{row.email}</span>
                </span>
                <span className="flex items-center gap-2">
                  <Badge variant="outline">Claim link ready</Badge>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Copy claim link for ${row.email}`}
                    onClick={() => {
                      void navigator.clipboard
                        .writeText(row.link)
                        .then(() => toast.success("Claim link copied"))
                        .catch(() => toast.info(row.link));
                    }}
                  >
                    <Copy className="h-4 w-4" aria-hidden />
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
