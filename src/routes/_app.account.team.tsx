import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy, Loader2, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { INVITE_ROLES, INVITE_ROLE_LABELS, type InviteRole } from "@/lib/collab";
import {
  changeMemberRoleFn,
  getTeamFn,
  inviteMemberFn,
  removeMemberFn,
  revokeInvitationFn,
} from "@/lib/collab.functions";

export const Route = createFileRoute("/_app/account/team")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "Team & invitations — UseCasesX™" },
      {
        name: "description",
        content: "Invite teammates to your workspace, set their role, and remove access instantly.",
      },
      { property: "og:title", content: "Team & invitations — UseCasesX™" },
      {
        property: "og:description",
        content:
          "Manage workspace members, roles and invitations within your plan's fair-use team size.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TeamPage,
});

function TeamPage() {
  const session = useSupabaseSession();
  const queryClient = useQueryClient();
  const load = useServerFn(getTeamFn);
  const invite = useServerFn(inviteMemberFn);
  const revoke = useServerFn(revokeInvitationFn);
  const remove = useServerFn(removeMemberFn);
  const changeRole = useServerFn(changeMemberRoleFn);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InviteRole>("contributor");
  const [lastLink, setLastLink] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["team"],
    queryFn: () => load(),
    enabled: Boolean(session),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["team"] });

  const inviteMutation = useMutation({
    mutationFn: () => invite({ data: { email: email.trim(), role, expiresInDays: 14 } }),
    onSuccess: (result) => {
      setEmail("");
      setLastLink(`${window.location.origin}/invite/${result.token}`);
      toast.success("Invitation created");
      void refresh();
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Could not create the invitation."),
  });

  if (session === undefined) {
    return (
      <div className="mx-auto max-w-[1200px] px-6 py-10">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-[1200px] space-y-4 px-6 py-10">
        <h2 className="text-xl font-semibold">Team &amp; invitations</h2>
        <p className="text-sm text-muted-foreground">Sign in to manage your workspace team.</p>
        <Button asChild>
          <Link to="/auth">Sign in</Link>
        </Button>
      </div>
    );
  }

  if (query.isLoading) {
    return (
      <div className="mx-auto max-w-[1200px] px-6 py-10">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="mx-auto max-w-[1200px] space-y-4 px-6 py-10">
        <p className="text-sm text-muted-foreground">
          {query.error instanceof Error ? query.error.message : "Could not load your team."}
        </p>
        <Button variant="secondary" onClick={() => void query.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const { members, invitations, seats, canManage } = query.data;
  const pending = invitations.filter(
    (i) => !i.revokedAt && i.useCount < i.maxUses && new Date(i.expiresAt) > new Date(),
  );

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 px-6 py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team size</CardTitle>
          <CardDescription>
            {seats.limit == null
              ? "Your Enterprise agreement sets the team size."
              : `${seats.used} of ${seats.limit} seats used${
                  seats.pending ? ` · ${seats.pending} invitation(s) pending` : ""
                }.`}
          </CardDescription>
        </CardHeader>
        {seats.atLimit && (
          <CardContent className="rounded-md border border-border bg-muted/40 p-4 text-sm">
            <p className="font-medium">You have reached your plan&apos;s fair-use team size.</p>
            <p className="mt-1 text-muted-foreground">
              Remove a member to free a seat, or talk to us about an Enterprise Design Partner
              engagement for larger teams and workflow orchestration.
            </p>
            <Button asChild size="sm" className="mt-3">
              <Link to="/pricing">Talk to us about Enterprise</Link>
            </Button>
          </CardContent>
        )}
      </Card>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invite a teammate</CardTitle>
            <CardDescription>
              Send an email-scoped invitation, or create a share link. Invitations expire after 14
              days and give access to this workspace only.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_240px_auto] sm:items-end">
              <div className="space-y-1.5">
                <Label htmlFor="invite-email">Email (optional for a share link)</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={email}
                  placeholder="colleague@company.com"
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invite-role">Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as InviteRole)}>
                  <SelectTrigger id="invite-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INVITE_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {INVITE_ROLE_LABELS[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => inviteMutation.mutate()}
                disabled={inviteMutation.isPending || seats.atLimit}
              >
                {inviteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create invitation
              </Button>
            </div>

            {lastLink && (
              <div className="flex flex-wrap items-center gap-2 rounded-md border border-border p-3 text-sm">
                <code className="truncate">{lastLink}</code>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    void navigator.clipboard.writeText(lastLink);
                    toast.success("Invitation link copied");
                  }}
                >
                  <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy link
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Members ({members.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {members.map((m) => (
            <div
              key={m.userId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {m.displayName}
                  {m.isSelf && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                </p>
                <p className="truncate text-xs text-muted-foreground">{m.email ?? "—"}</p>
              </div>
              <div className="flex items-center gap-2">
                {canManage && !m.isSelf ? (
                  <Select
                    value={
                      (INVITE_ROLES as readonly string[]).includes(m.role) ? m.role : "contributor"
                    }
                    onValueChange={async (v) => {
                      try {
                        await changeRole({ data: { userId: m.userId, role: v as InviteRole } });
                        toast.success("Role updated");
                        void refresh();
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Could not change the role.");
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 w-40" aria-label={`Role for ${m.displayName}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INVITE_ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="secondary">{m.role}</Badge>
                )}
                {canManage && !m.isSelf && (
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Remove ${m.displayName}`}
                    onClick={async () => {
                      try {
                        await remove({ data: { userId: m.userId } });
                        toast.success("Member removed — their access ended immediately");
                        void refresh();
                      } catch (e) {
                        toast.error(
                          e instanceof Error ? e.message : "Could not remove the member.",
                        );
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending invitations ({pending.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pending.length === 0 ? (
              <p className="text-sm text-muted-foreground">No invitations are waiting.</p>
            ) : (
              pending.map((i) => (
                <div
                  key={i.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{i.email ?? "Share link"}</p>
                    <p className="text-xs text-muted-foreground">
                      {i.role} · expires {new Date(i.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        void navigator.clipboard.writeText(
                          `${window.location.origin}/invite/${i.token}`,
                        );
                        toast.success("Invitation link copied");
                      }}
                    >
                      <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy link
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        try {
                          await revoke({ data: { id: i.id } });
                          toast.success("Invitation revoked");
                          void refresh();
                        } catch (e) {
                          toast.error(
                            e instanceof Error ? e.message : "Could not revoke the invitation.",
                          );
                        }
                      }}
                    >
                      Revoke
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
