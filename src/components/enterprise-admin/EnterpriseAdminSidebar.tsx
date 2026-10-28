import { Link, useRouterState } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ENTERPRISE_ADMIN_BASE, ENTERPRISE_ADMIN_NAV } from "@/lib/enterprise-admin/sections";

function statusBadge(integration: "live" | "partial" | "placeholder") {
  if (integration === "live") return null;
  if (integration === "partial") {
    return (
      <Badge variant="secondary" className="text-[10px] font-medium">
        Partial
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px] font-medium text-muted-foreground">
      Planned
    </Badge>
  );
}

export function EnterpriseAdminSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      aria-label="Enterprise administration sections"
      className="flex w-full flex-col gap-0.5 lg:w-60 lg:shrink-0"
    >
      {ENTERPRISE_ADMIN_NAV.map((section) => {
        const to =
          section.id === "overview"
            ? ENTERPRISE_ADMIN_BASE
            : `${ENTERPRISE_ADMIN_BASE}/${section.id}`;
        const active =
          section.id === "overview"
            ? pathname === ENTERPRISE_ADMIN_BASE || pathname === `${ENTERPRISE_ADMIN_BASE}/`
            : pathname === to || pathname.startsWith(`${to}/`);
        const Icon = section.icon;
        return (
          <Link
            key={section.id}
            to={section.id === "overview" ? "/enterprise-admin" : "/enterprise-admin/$section"}
            params={
              section.id === "overview" ? undefined : { section: section.id }
            }
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
              active
                ? "bg-primary/10 font-semibold text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            <span className="min-w-0 flex-1 truncate">{section.label}</span>
            {statusBadge(section.integration)}
          </Link>
        );
      })}
    </nav>
  );
}
