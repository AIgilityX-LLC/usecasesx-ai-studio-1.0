import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import type { EnterpriseNavItem } from "@/lib/navigation/enterprise-nav";
import { isNavItemActive } from "@/lib/navigation/enterprise-nav";
import { cn } from "@/lib/utils";

type Props = {
  item: EnterpriseNavItem;
  pathname: string;
  showProBadge?: boolean;
  onNavigate?: () => void;
};

export function SidebarItem({ item, pathname, showProBadge, onNavigate }: Props) {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;
  const active = isNavItemActive(item.to, pathname);
  const Icon = item.icon;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={active} tooltip={collapsed ? item.label : undefined}>
        <Link
          to={item.to as never}
          aria-current={active ? "page" : undefined}
          onClick={() => {
            onNavigate?.();
            if (isMobile) setOpenMobile(false);
          }}
          className={cn(
            "flex items-center gap-2",
            active && "font-semibold text-sidebar-accent-foreground",
          )}
        >
          <Icon className="h-4 w-4 shrink-0" aria-hidden />
          {!collapsed && (
            <>
              <span className="flex-1 truncate text-sm">{item.label}</span>
              {showProBadge && (
                <span className="inline-flex items-center gap-0.5 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                  <Lock className="h-2.5 w-2.5" aria-hidden />
                  Pro
                </span>
              )}
            </>
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
