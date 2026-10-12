import { Link, useRouterState } from "@tanstack/react-router";
import { PLATFORM_ADMIN_NAV_SECTIONS } from "@/lib/navigation/platform-admin-nav";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";

export function PlatformAdminSidebarNav() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { state, isMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;

  return (
    <nav aria-label="Platform administration" className="space-y-3 px-1 py-2">
      {PLATFORM_ADMIN_NAV_SECTIONS.map((section) => (
        <div key={section.id}>
          {!collapsed && (
            <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {section.label}
            </p>
          )}
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const active =
                item.to === "/platform-admin"
                  ? pathname === "/platform-admin" || pathname === "/platform-admin/"
                  : pathname === item.to || pathname.startsWith(`${item.to}/`);
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <Link
                    to={item.to}
                    aria-current={active ? "page" : undefined}
                    title={item.label}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none ring-sidebar-ring hover:bg-sidebar-accent focus-visible:ring-2",
                      active && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
                      collapsed && "justify-center px-0",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
