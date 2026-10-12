import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Building2, Check, ChevronsUpDown, AlertTriangle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSidebar } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspaceContext } from "@/hooks/useWorkspaceContext";
import { useNavAnalyticsContext } from "@/hooks/useNavAnalyticsContext";
import { trackWorkspaceSwitched } from "@/lib/telemetry/navigation-analytics";
import { isOrgMembershipActive } from "@/lib/workspace-selection";
import { cn } from "@/lib/utils";

/**
 * Organization + workspace context control at the top of the enterprise sidebar.
 * Switching validates membership on the server; RLS remains authoritative.
 */
export function WorkspaceSwitcher({ className }: { className?: string }) {
  const { state, isMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;
  const { data, isLoading, isError, error, switchWorkspace, refetch } = useWorkspaceContext();
  const navAnalytics = useNavAnalyticsContext();
  const [switching, setSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);

  const orgName = data?.organization?.name ?? null;
  const workspaceName = data?.workspace?.name ?? null;
  const status = data?.status ?? (isLoading ? null : "no_workspace");
  const options = data?.availableWorkspaces ?? [];
  const selectable = options.filter((o) => isOrgMembershipActive(o.orgStatus));
  const canSwitch = selectable.length > 1;

  const onSelect = async (workspaceId: string) => {
    if (workspaceId === data?.workspace?.id) return;
    setSwitchError(null);
    setSwitching(true);
    try {
      await switchWorkspace(workspaceId);
      // Fire after success only. Payload is coarse enums — never workspace names/ids.
      trackWorkspaceSwitched(navAnalytics);
    } catch (e) {
      setSwitchError(e instanceof Error ? e.message : "Could not switch workspace.");
    } finally {
      setSwitching(false);
    }
  };

  if (collapsed) {
    return (
      <div
        className={cn("flex justify-center px-1 py-2", className)}
        title={workspaceName ?? orgName ?? "Workspace"}
        aria-label={
          workspaceName
            ? `Current workspace: ${workspaceName}${orgName ? `, organization ${orgName}` : ""}`
            : "Workspace"
        }
      >
        <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={cn("space-y-1.5 px-2 py-2", className)} aria-busy="true" aria-live="polite">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div
        className={cn(
          "mx-2 my-2 rounded-md border border-destructive/40 bg-destructive/10 px-2.5 py-2 text-xs",
          className,
        )}
        role="alert"
      >
        <p className="font-medium text-destructive">Could not load workspace</p>
        <p className="mt-1 text-muted-foreground">
          {error instanceof Error ? error.message : "Try again in a moment."}
        </p>
        <button
          type="button"
          className="mt-2 text-xs font-semibold text-primary underline-offset-2 hover:underline"
          onClick={() => void refetch()}
        >
          Retry
        </button>
      </div>
    );
  }

  if (status === "suspended") {
    return (
      <div
        className={cn(
          "mx-2 my-2 rounded-md border border-border bg-sidebar-accent/30 px-2.5 py-2 text-xs",
          className,
        )}
        role="status"
      >
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
          <div>
            <p className="font-medium text-sidebar-foreground">Membership suspended</p>
            <p className="mt-1 text-muted-foreground">
              Your organization access is suspended. Contact an organization admin.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "no_workspace" || !workspaceName) {
    return (
      <div
        className={cn(
          "mx-2 my-2 rounded-md border border-border bg-sidebar-accent/30 px-2.5 py-2 text-xs",
          className,
        )}
        role="status"
      >
        <p className="font-medium text-sidebar-foreground">No workspace yet</p>
        <p className="mt-1 text-muted-foreground">
          Join or create a workspace to start capturing opportunities.
        </p>
        <Link
          to="/account"
          className="mt-2 inline-block text-xs font-semibold text-primary underline-offset-2 hover:underline"
        >
          Open account
        </Link>
      </div>
    );
  }

  const triggerLabel = `Organization ${orgName ?? "Unknown"}, workspace ${workspaceName}`;

  const trigger = (
    <div
      className={cn(
        "flex w-full items-center gap-2 rounded-md border border-sidebar-border bg-sidebar-accent/40 px-2.5 py-2 text-left outline-none ring-sidebar-ring",
        canSwitch && "hover:bg-sidebar-accent focus-visible:ring-2",
        switching && "opacity-70",
      )}
    >
      <Building2 className="h-4 w-4 shrink-0 text-primary" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium text-muted-foreground">
          {orgName ?? "Organization"}
        </div>
        <div className="truncate text-sm font-semibold text-sidebar-foreground">
          {workspaceName}
        </div>
      </div>
      {canSwitch && (
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
      )}
    </div>
  );

  return (
    <div className={cn("px-2 py-2", className)}>
      {canSwitch ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            className="w-full outline-none"
            aria-label={triggerLabel}
            disabled={switching}
          >
            {trigger}
          </DropdownMenuTrigger>
          <DropdownMenuContent side={isMobile ? "bottom" : "right"} align="start" className="w-64">
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              Switch workspace
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {options.map((opt) => {
              const active = opt.id === data?.workspace?.id;
              const suspended = !isOrgMembershipActive(opt.orgStatus);
              return (
                <DropdownMenuItem
                  key={opt.id}
                  disabled={suspended || switching}
                  onSelect={() => {
                    void onSelect(opt.id);
                  }}
                  className="flex items-start gap-2"
                  aria-current={active ? "true" : undefined}
                >
                  <Check
                    className={cn(
                      "mt-0.5 h-3.5 w-3.5 shrink-0",
                      active ? "opacity-100" : "opacity-0",
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{opt.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {opt.organizationName ?? "Organization"}
                      {suspended ? " · Suspended" : ""}
                      {opt.role ? ` · ${opt.role}` : ""}
                    </span>
                  </span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <div role="status" aria-live="polite" aria-label={triggerLabel}>
          {trigger}
        </div>
      )}
      {switchError && (
        <p className="mt-1.5 px-1 text-xs text-destructive" role="alert">
          {switchError}
        </p>
      )}
    </div>
  );
}
