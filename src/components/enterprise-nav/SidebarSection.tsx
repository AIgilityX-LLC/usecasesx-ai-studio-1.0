import { ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  useSidebar,
} from "@/components/ui/sidebar";
import type { EnterpriseNavItem, EnterpriseNavSection } from "@/lib/navigation/enterprise-nav";
import { sectionContainsPath } from "@/lib/navigation/enterprise-nav";
import { cn } from "@/lib/utils";
import { SidebarItem } from "./SidebarItem";
import { SidebarSubmenu } from "./SidebarSubmenu";

type Props = {
  section: EnterpriseNavSection;
  items: EnterpriseNavSection["items"];
  pathname: string;
  isPro: boolean;
  open: boolean;
  onOpenChange: (next: boolean) => void;
  onItemNavigate?: (item: EnterpriseNavItem) => void;
};

export function SidebarSection({
  section,
  items,
  pathname,
  isPro,
  open,
  onOpenChange,
  onItemNavigate,
}: Props) {
  const { state, isMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;
  const parentActive = sectionContainsPath({ ...section, items: items ?? section.items }, pathname);
  const visibleItems = items ?? [];

  // Single-link sections (Overview / Reports).
  if (section.link && visibleItems.length === 0) {
    return (
      <SidebarGroup className="py-1">
        {!collapsed && (
          <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {section.label}
          </SidebarGroupLabel>
        )}
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarItem
              item={section.link}
              pathname={pathname}
              showProBadge={Boolean(section.link.pro && !isPro)}
              onNavigate={() => onItemNavigate?.(section.link!)}
            />
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  if (visibleItems.length === 0) return null;

  // Icon-collapsed: flat list so targets stay reachable.
  if (collapsed || section.collapsible === false) {
    return (
      <SidebarGroup className="py-1">
        {!collapsed && (
          <SidebarGroupLabel
            className={cn(
              "text-[11px] font-semibold uppercase tracking-[0.14em]",
              parentActive ? "text-primary" : "text-muted-foreground",
            )}
          >
            {section.label}
          </SidebarGroupLabel>
        )}
        <SidebarGroupContent>
          <SidebarMenu>
            {visibleItems.map((it) => (
              <SidebarItem
                key={it.id}
                item={it}
                pathname={pathname}
                showProBadge={Boolean(it.pro && !isPro)}
                onNavigate={() => onItemNavigate?.(it)}
              />
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={onOpenChange} className="group/nav-section">
      <SidebarGroup className="py-1">
        <SidebarGroupLabel asChild>
          <CollapsibleTrigger
            className={cn(
              "flex w-full cursor-pointer items-center gap-1 rounded-md px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-[0.14em] outline-none ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2",
              parentActive ? "text-primary" : "text-muted-foreground",
            )}
            aria-expanded={open}
            aria-controls={`nav-section-${section.id}`}
          >
            <ChevronRight
              className={cn(
                "h-3.5 w-3.5 shrink-0 transition-transform duration-150",
                open && "rotate-90",
              )}
              aria-hidden
            />
            <span className="flex-1 truncate">{section.label}</span>
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <CollapsibleContent id={`nav-section-${section.id}`}>
          <SidebarGroupContent>
            <SidebarSubmenu
              items={visibleItems}
              pathname={pathname}
              isPro={isPro}
              onNavigate={onItemNavigate}
            />
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}
