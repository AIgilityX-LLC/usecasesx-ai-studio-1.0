import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, Crown, Search, X } from "lucide-react";

import { privateHead } from "@/lib/seo";
import { RequireRoles } from "@/components/RequireRoles";
import { PLATFORM_ADMIN_ROLES } from "@/lib/admin/platform-admin";
import {
  approveFoundingAccessRequestFn,
  listFoundingAccessRequestsFn,
  rejectFoundingAccessRequestFn,
} from "@/lib/founding-access.functions";
import type { FoundingAccessRequestRow } from "@/lib/founding-access.server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminDataTable, type Column } from "@/components/AdminDataTable";

export const Route = createFileRoute("/_app/platform-admin/founding-access")({
  head: () => privateHead("Founding Access requests"),
  component: FoundingAccessRoute,
});

function FoundingAccessRoute() {
  return (
    <RequireRoles anyOf={PLATFORM_ADMIN_ROLES} action="review Founding Access requests">
      <FoundingAccessQueue />
    </RequireRoles>
  );
}

function statusBadge(status: string) {
  switch (status) {
    case "approved":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
    case "rejected":
      return "bg-destructive/15 text-destructive";
    default:
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
  }
}

function FoundingAccessQueue() {
  const listFn = useServerFn(listFoundingAccessRequestsFn);
  const approveFn = useServerFn(approveFoundingAccessRequestFn);
  const rejectFn = useServerFn(rejectFoundingAccessRequestFn);
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<"pending" | "approved" | "rejected" | "all">(
    "pending",
  );
  const [q, setQ] = useState("");

  const requests = useQuery({
    queryKey: ["founding-access-requests", statusFilter],
    queryFn: () => listFn({ data: { status: statusFilter } }),
  });

  const approve = useMutation({
    mutationFn: (id: string) => approveFn({ data: { requestId: id } }),
    onSuccess: () => {
      toast.success("Approved — invitation email sent");
      void queryClient.invalidateQueries({ queryKey: ["founding-access-requests"] });
    },
    onError: (e: Error) => toast.error(e.message || "Approve failed"),
  });

  const reject = useMutation({
    mutationFn: (id: string) => rejectFn({ data: { requestId: id } }),
    onSuccess: () => {
      toast.success("Request rejected");
      void queryClient.invalidateQueries({ queryKey: ["founding-access-requests"] });
    },
    onError: (e: Error) => toast.error(e.message || "Reject failed"),
  });

  const rows = useMemo(() => {
    const list = (requests.data ?? []) as FoundingAccessRequestRow[];
    if (!q.trim()) return list;
    const t = q.toLowerCase();
    return list.filter(
      (r) =>
        r.full_name.toLowerCase().includes(t) ||
        r.work_email.toLowerCase().includes(t) ||
        r.organization.toLowerCase().includes(t),
    );
  }, [requests.data, q]);

  const stats = useMemo(() => {
    const list = (requests.data ?? []) as FoundingAccessRequestRow[];
    return {
      showing: list.length,
      pending: list.filter((r) => r.status === "pending").length,
    };
  }, [requests.data]);

  const busyId =
    approve.isPending || reject.isPending
      ? ((approve.variables as string | undefined) ?? (reject.variables as string | undefined))
      : null;

  const columns: Column<FoundingAccessRequestRow>[] = [
    {
      key: "requester",
      header: "Requester",
      render: (r) => (
        <div>
          <div className="font-medium">{r.full_name}</div>
          <div className="text-xs text-muted-foreground">{r.work_email}</div>
        </div>
      ),
    },
    {
      key: "organization",
      header: "Organization",
      render: (r) => (
        <div>
          <div>{r.organization}</div>
          {r.role_title ? (
            <div className="text-xs text-muted-foreground">{r.role_title}</div>
          ) : null}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <Badge variant="secondary" className={statusBadge(r.status)}>
          {r.status}
        </Badge>
      ),
    },
    {
      key: "requested",
      header: "Submitted",
      render: (r) => (
        <span className="text-xs text-muted-foreground">
          {new Date(r.requested_at).toLocaleString()}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (r) => (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            disabled={r.status !== "pending" || busyId === r.id}
            onClick={() => {
              if (
                !window.confirm(
                  `Approve ${r.full_name} (${r.work_email})? This creates their account and emails a one-time invite link — no password.`,
                )
              ) {
                return;
              }
              approve.mutate(r.id);
            }}
          >
            <Check className="mr-1 h-3 w-3" /> Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            disabled={r.status !== "pending" || busyId === r.id}
            onClick={() => {
              if (!window.confirm(`Reject request from ${r.full_name}?`)) return;
              reject.mutate(r.id);
            }}
          >
            <X className="mr-1 h-3 w-3" /> Reject
          </Button>
        </div>
      ),
    },
  ];

  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-[1400px] px-6 py-10 space-y-6">
        <header>
          <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight">
            <Crown className="h-7 w-7 text-primary" aria-hidden />
            Founding Access requests
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review Early Gratis (Pro) Access requests. Approve sends a secure invite link — never a
            password. Newest first.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Showing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.showing}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Pending in view</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search name, email, organization…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {requests.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading requests…</p>
        ) : (
          <AdminDataTable
            columns={columns}
            rows={rows}
            empty={
              <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No Founding Access requests match this filter.
              </p>
            }
          />
        )}
      </div>
    </section>
  );
}
