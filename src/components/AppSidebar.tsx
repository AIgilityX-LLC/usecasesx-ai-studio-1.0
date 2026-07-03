import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Library, Sparkles, FolderHeart, KanbanSquare,
  BookOpen, Gauge, Database, Hammer, Map, Rocket, Compass, Shield, BarChart3,
  FileBarChart, Settings, Lock, Crown, Users, Send, LineChart, Inbox,
  Grid2x2, Calculator, Wand2, UserCog, ShieldCheck,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, useSidebar,
} from "@/components/ui/sidebar";
import { usePlan } from "@/hooks/usePlan";

type Item = { to: string; label: string; icon: React.ComponentType<{ className?: string }>; pro?: boolean; admin?: boolean };

const CORE: Item[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/repository", label: "Global Repository", icon: Library },
  { to: "/discover", label: "Discovery Wizard", icon: Wand2 },
  { to: "/quick-wins", label: "Quick Wins Matrix", icon: Grid2x2 },
  { to: "/roi-calculator", label: "ROI & Mission Value", icon: Calculator },
  { to: "/insights", label: "Deployment Intelligence", icon: BarChart3 },
  { to: "/studio", label: "AI Use Case Studio", icon: Sparkles },
  { to: "/my-use-cases", label: "My Use Cases", icon: FolderHeart },
  { to: "/boards", label: "Use Case Boards", icon: KanbanSquare },
  { to: "/submit", label: "Submit a Use Case", icon: Send },
  { to: "/patterns", label: "Pattern Library", icon: BookOpen },
];

const STUDIO_PRO: Item[] = [
  { to: "/feasibility", label: "Feasibility Scoring", icon: Gauge, pro: true },
  { to: "/data-readiness", label: "Data Readiness", icon: Database, pro: true },
  { to: "/blueprint", label: "Blueprint Builder", icon: Hammer, pro: true },
  { to: "/roadmap", label: "Portfolio Roadmap", icon: Map, pro: true },
];

const INTEGRATIONS: Item[] = [
  { to: "/sarpi", label: "SARPI Readiness", icon: Rocket, pro: true },
  { to: "/advisorx", label: "AdvisorX Guidance", icon: Compass, pro: true },
  { to: "/cyberx/c3g/intake", label: "C3G Governance", icon: Shield, pro: true },
];

const ADMIN: Item[] = [
  { to: "/reports", label: "Reports", icon: FileBarChart },
  { to: "/administration", label: "Admin Panel", icon: Settings, admin: true },
  { to: "/admin-submissions", label: "Submission Review", icon: Inbox, admin: true },
  { to: "/admin-waitlist", label: "Free Pro Waitlist", icon: Users, admin: true },
];

const ACCOUNT: Item[] = [
  { to: "/account", label: "Account Settings", icon: UserCog },
  { to: "/account/security", label: "Security", icon: ShieldCheck },
  { to: "/entitlement", label: "My Plan", icon: Crown },
  { to: "/module-analytics", label: "Module Analytics", icon: LineChart },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { isPro, isAdmin } = usePlan();

  const isActive = (to: string) =>
    to === "/" || to === "/account"
      ? pathname === to || pathname === `${to}/`
      : pathname.startsWith(to);

  const renderItem = (item: Item) => {
    const locked = item.pro && !isPro;
    const Icon = item.icon;
    return (
      <SidebarMenuItem key={item.to}>
        <SidebarMenuButton
          asChild
          isActive={isActive(item.to)}
          tooltip={collapsed ? item.label : undefined}
        >
          <Link
            to={item.to as never}
            className="flex items-center gap-2 hover:bg-muted/50"
            title={locked ? `${item.label} — Pro` : item.label}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 truncate">{item.label}</span>
                {locked && (
                  <span className="inline-flex items-center gap-1 rounded bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                    <Lock className="h-2.5 w-2.5" /> Pro
                  </span>
                )}
              </>
            )}
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2 px-2 py-1.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary/15 ring-1 ring-primary/40">
            <span className="font-mono text-[12px] font-black text-primary">UX</span>
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="text-[13px] font-bold tracking-tight">UseCasesX™</div>
              <div className="text-[9px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                by AIgilityX™
              </div>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Platform</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{CORE.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Studio Modules</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{STUDIO_PRO.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Integrations</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{INTEGRATIONS.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Workspace</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {ADMIN.filter((i) => !i.admin || isAdmin).map(renderItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Account</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{ACCOUNT.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
