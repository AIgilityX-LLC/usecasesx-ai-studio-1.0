import { Link } from "@tanstack/react-router";
import { Crown, LayoutDashboard, LogOut, Settings, Shield, UserRound } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSidebar } from "@/components/ui/sidebar";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { useNavCapabilities } from "@/hooks/useNavCapabilities";
import { accountAvatarLabel } from "@/components/AuthNavActions";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

/**
 * Sidebar footer account menu. Capability-aware Admin entry (platform.manage).
 */
export function UserMenu({ className }: { className?: string }) {
  const session = useSupabaseSession();
  const { state, isMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;
  const nav = useNavCapabilities();
  const user = session?.user;
  if (!user) return null;

  const isPlatformAdmin = nav.has("platform.manage");
  const fullName =
    (typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null) ??
    null;
  const label = accountAvatarLabel({
    isPlatformAdmin,
    fullName,
    email: user.email,
  });
  const displayName = fullName || user.email || "Signed in";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Account menu for ${displayName}`}
        className={cn(
          "flex w-full items-center gap-2 rounded-md border border-sidebar-border bg-sidebar-accent/30 px-2.5 py-2 text-left outline-none ring-sidebar-ring hover:bg-sidebar-accent focus-visible:ring-2",
          collapsed && "justify-center px-0",
          className,
        )}
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border bg-secondary text-[11px] font-bold tracking-wide">
          {label}
        </span>
        {!collapsed && (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{displayName}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {isPlatformAdmin ? "Platform admin" : "Account"}
            </span>
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent side={collapsed ? "right" : "top"} align="start" className="w-56">
        <DropdownMenuLabel className="space-y-0.5 font-normal">
          <div className="truncate text-sm font-semibold">{displayName}</div>
          <div className="truncate text-xs text-muted-foreground">{user.email}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/dashboard">
            <LayoutDashboard />
            Dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/account">
            <UserRound />
            Account settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/account/security">
            <Settings />
            Security
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/entitlement">
            <Crown />
            My plan
          </Link>
        </DropdownMenuItem>
        {isPlatformAdmin && (
          <DropdownMenuItem asChild>
            <Link to="/platform-admin">
              <Shield />
              Platform Administration
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            void supabase.auth.signOut();
          }}
        >
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
