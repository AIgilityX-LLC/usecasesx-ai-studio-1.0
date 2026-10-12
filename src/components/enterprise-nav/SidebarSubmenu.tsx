import { SidebarMenu } from "@/components/ui/sidebar";
import type { EnterpriseNavItem } from "@/lib/navigation/enterprise-nav";
import { SidebarItem } from "./SidebarItem";

type Props = {
  items: EnterpriseNavItem[];
  pathname: string;
  isPro: boolean;
  onNavigate?: (item: EnterpriseNavItem) => void;
};

/** Nested list under an expanded section (one level deep — no deep trees). */
export function SidebarSubmenu({ items, pathname, isPro, onNavigate }: Props) {
  if (items.length === 0) return null;
  return (
    <SidebarMenu className="gap-0.5 border-l border-sidebar-border/50 pl-1">
      {items.map((item) => (
        <SidebarItem
          key={item.id}
          item={item}
          pathname={pathname}
          showProBadge={Boolean(item.pro && !isPro)}
          onNavigate={() => onNavigate?.(item)}
        />
      ))}
    </SidebarMenu>
  );
}
