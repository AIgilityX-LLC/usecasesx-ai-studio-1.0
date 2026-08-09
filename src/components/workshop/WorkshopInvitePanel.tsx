/**
 * Facilitator invitation panel — share link or email invite, workspace-scoped
 * on join. Tokens are only ever shown to the facilitator who created them.
 */

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Link2, Loader2, Mail, Ban } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { invitationState, invitationUrl, type WorkshopInvitation } from "@/lib/workshops.collab";
import {
  createWorkshopInvitationFn,
  listWorkshopInvitationsFn,
  revokeWorkshopInvitationFn,
} from "@/lib/workshops.functions";

type Role = "participant" | "observer" | "facilitator";

const STATE_LABEL = {
  open: "Open",
  used: "Accepted",
  expired: "Expired",
  revoked: "Revoked",
} as const;

export function WorkshopInvitePanel({ workshopId }: { workshopId: string }) {
  const qc = useQueryClient();
  const key = ["workshop-invitations", workshopId];
  const invitations = useQuery({
    queryKey: key,
    queryFn: () => listWorkshopInvitationsFn({ data: { workshopId } }),
  });
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("participant");

  const create = useMutation({
    mutationFn: (input: { email?: string; role: Role; maxUses: number }) =>
      createWorkshopInvitationFn({ data: { workshopId, ...input } }),
    onSuccess: (invite) => {
      void qc.invalidateQueries({ queryKey: key });
      setEmail("");
      void copy(invite);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revoke = useMutation({
    mutationFn: (id: string) => revokeWorkshopInvitationFn({ data: { workshopId, id } }),
    onSuccess: () => {
      toast.success("Invitation revoked");
      void qc.invalidateQueries({ queryKey: key });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function copy(invite: WorkshopInvitation) {
    const url = invitationUrl(window.location.origin, invite.token);
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Invitation link copied to your clipboard");
    } catch {
      toast.info(url);
    }
  }

  const rows = invitations.data ?? [];

  return (
    <section className="space-y-3" aria-labelledby="workshop-invites-heading">
      <h3 id="workshop-invites-heading" className="flex items-center gap-2 text-sm font-semibold">
        <Link2 className="h-4 w-4" /> Invitations
      </h3>
      <p className="text-xs text-muted-foreground">
        A share link works for anyone already in this workspace. Invite by email to bring in a
        named guest — they get access to this workspace only, after they sign in.
      </p>

      <form
        className="space-y-2 rounded-md border border-dashed border-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate({ email: email.trim() || undefined, role, maxUses: 25 });
        }}
      >
        <Label htmlFor="invite-email">Invite</Label>
        <Input
          id="invite-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email (leave blank for a workspace share link)"
        />
        <div className="flex flex-wrap gap-2">
          <Select value={role} onValueChange={(v) => setRole(v as Role)}>
            <SelectTrigger aria-label="Invitation role" className="min-w-44 flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="participant">Participant — submits and votes</SelectItem>
              <SelectItem value="observer">Observer — read only</SelectItem>
              <SelectItem value="facilitator">Co-facilitator</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : email.trim() ? (
              <Mail className="mr-2 h-4 w-4" />
            ) : (
              <Link2 className="mr-2 h-4 w-4" />
            )}
            {email.trim() ? "Create email invite" : "Create share link"}
          </Button>
        </div>
      </form>

      {invitations.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading invitations…</p>
      ) : invitations.isError ? (
        <p className="text-sm text-destructive">Invitations could not be loaded.</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No invitations yet.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((invite) => {
            const state = invitationState(invite);
            return (
              <li
                key={invite.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {invite.email ?? "Workspace share link"}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {invite.role} · expires {new Date(invite.expiresAt).toLocaleDateString()} ·{" "}
                    {invite.useCount}/{invite.maxUses} used
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <Badge variant={state === "open" ? "secondary" : "outline"}>
                    {STATE_LABEL[state]}
                  </Badge>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Copy invitation link"
                    onClick={() => void copy(invite)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  {state === "open" && (
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Revoke invitation"
                      onClick={() => revoke.mutate(invite.id)}
                    >
                      <Ban className="h-4 w-4" />
                    </Button>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
