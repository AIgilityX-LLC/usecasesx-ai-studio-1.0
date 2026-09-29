import { Link } from "@tanstack/react-router";
import { Crown, LayoutDashboard, LogOut, Settings, UserRound } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { PLATFORM_ADMIN_ROLES } from "@/lib/admin/platform-admin";
import { useRoles } from "@/lib/usecasex.roles";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

/** Initials for the signed-in avatar. Platform admins show "PA". */
export function accountAvatarLabel(input: {
  isPlatformAdmin: boolean;
  fullName?: string | null;
  email?: string | null;
}): string {
  if (input.isPlatformAdmin) return "PA";
  const name = input.fullName?.trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  const local = (input.email ?? "").split("@")[0] ?? "";
  return (local.slice(0, 2) || "?").toUpperCase();
}

type UserAccountMenuProps = {
  /** Landing page uses its own CSS classes; shell uses Tailwind. */
  variant?: "landing" | "shell";
  className?: string;
};

/**
 * Avatar dropdown confirming the visitor is signed in. Platform admins see
 * "PA"; everyone else sees name/email initials. Includes Dashboard, Account,
 * Admin (when entitled) and Sign out.
 */
export function UserAccountMenu({ variant = "shell", className }: UserAccountMenuProps) {
  const session = useSupabaseSession();
  const { hasAny, loading } = useRoles();
  const user = session?.user;
  if (!user) return null;

  const isPlatformAdmin = !loading && hasAny(PLATFORM_ADMIN_ROLES);
  const fullName =
    (typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null) ??
    null;
  const label = accountAvatarLabel({
    isPlatformAdmin,
    fullName,
    email: user.email,
  });
  const displayName = fullName || user.email || "Signed in";
  const roleHint = isPlatformAdmin ? "Platform admin" : "Signed in";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Account menu for ${displayName}`}
        className={cn(
          variant === "landing"
            ? "ux-nav-avatar"
            : "inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-secondary text-[11px] font-bold tracking-wide text-foreground hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
      >
        {label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="space-y-0.5 font-normal">
          <div className="truncate text-sm font-semibold text-foreground">{displayName}</div>
          <div className="text-xs text-muted-foreground">{roleHint}</div>
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
            Account
          </Link>
        </DropdownMenuItem>
        {isPlatformAdmin && (
          <DropdownMenuItem asChild>
            <Link to="/administration">
              <Settings />
              Admin panel
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

type LandingAuthActionsProps = {
  onNavigate?: () => void;
  /** When true, render stacked mobile-menu links instead of the compact bar. */
  mobile?: boolean;
};

/**
 * Landing header / mobile menu auth CTAs:
 * signed out → Sign in + Waitlist; signed in → Dashboard + avatar menu.
 */
export function LandingAuthActions({ onNavigate, mobile = false }: LandingAuthActionsProps) {
  const session = useSupabaseSession();
  const isAuthed = !!session;

  if (session === undefined) {
    // Avoid flashing the wrong CTA while the session resolves.
    return <div className={mobile ? undefined : "ux-nav-actions"} aria-hidden />;
  }

  if (!isAuthed) {
    if (mobile) {
      return (
        <>
          <Link to="/auth" onClick={onNavigate}>
            Sign in
          </Link>
          <Link
            to="/pricing"
            hash="founding"
            onClick={() => {
              onNavigate?.();
              void import("@/lib/usecasex.tracking").then(({ trackCTAEvent }) =>
                trackCTAEvent("waitlist_join_clicked", {
                  source_page: "/",
                  target_route: "/pricing#founding",
                  location: "landing_nav_mobile",
                }),
              );
            }}
          >
            Join the Waitlist – Early Gratis (Free) Access
          </Link>
        </>
      );
    }
    return (
      <div className="ux-nav-actions">
        <Link className="ux-nav-login" to="/auth">
          Sign in
        </Link>
        <Link
          className="ux-gratis-bar"
          to="/pricing"
          hash="founding"
          onClick={() =>
            void import("@/lib/usecasex.tracking").then(({ trackCTAEvent }) =>
              trackCTAEvent("waitlist_join_clicked", {
                source_page: "/",
                target_route: "/pricing#founding",
                location: "landing_nav",
              }),
            )
          }
          data-analytics-id="waitlist-cta-nav"
        >
          <Crown size={14} strokeWidth={2} aria-hidden />
          <span className="ux-gratis-full">Join the Waitlist – Early Gratis (Free) Access</span>
          <span className="ux-gratis-short">Join Waitlist</span>
        </Link>
      </div>
    );
  }

  if (mobile) {
    return (
      <>
        <Link to="/dashboard" onClick={onNavigate}>
          Dashboard
        </Link>
        <Link to="/account" onClick={onNavigate}>
          Account
        </Link>
        <Link
          to="/pricing"
          hash="founding"
          onClick={() => {
            onNavigate?.();
            void import("@/lib/usecasex.tracking").then(({ trackCTAEvent }) =>
              trackCTAEvent("waitlist_join_clicked", {
                source_page: "/",
                target_route: "/pricing#founding",
                location: "landing_nav_mobile_signed_in",
              }),
            );
          }}
        >
          Join the Waitlist – Early Gratis (Free) Access
        </Link>
        <button
          type="button"
          onClick={() => {
            onNavigate?.();
            void supabase.auth.signOut();
          }}
        >
          Sign out
        </button>
      </>
    );
  }

  return (
    <div className="ux-nav-actions">
      <UserAccountMenu variant="landing" />
      <Link
        className="ux-gratis-bar"
        to="/pricing"
        hash="founding"
        onClick={() =>
          void import("@/lib/usecasex.tracking").then(({ trackCTAEvent }) =>
            trackCTAEvent("waitlist_join_clicked", {
              source_page: "/",
              target_route: "/pricing#founding",
              location: "landing_nav_signed_in",
            }),
          )
        }
        data-analytics-id="waitlist-cta-nav"
      >
        <Crown size={14} strokeWidth={2} aria-hidden />
        <span className="ux-gratis-full">Join the Waitlist – Early Gratis (Free) Access</span>
        <span className="ux-gratis-short">Join Waitlist</span>
      </Link>
    </div>
  );
}
