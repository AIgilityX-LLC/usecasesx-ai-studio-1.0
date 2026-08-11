import { Link, useRouterState } from "@tanstack/react-router";
import brandMark from "@/assets/usecasesx-logo.png";
import {
  LayoutDashboard,
  Library,
  Sparkles,
  FolderHeart,
  KanbanSquare,
  BookOpen,
  Gauge,
  Database,
  Hammer,
  Map,
  Rocket,
  Compass,
  Shield,
  BarChart3,
  FileBarChart,
  Settings,
  Lock,
  Crown,
  Users,
  Send,
  LineChart,
  Inbox,
  Grid2x2,
  Calculator,
  Wand2,
  Lightbulb,
  UserCog,
  ShieldCheck,
  MessageSquarePlus,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { usePlan } from "@/hooks/usePlan";
import { PUBLIC_LAUNCH_FEATURES } from "@/lib/feature-flags";

type Item = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  pro?: boolean;
  admin?: boolean;
  /**
   * Feature switch. When false the entry is not rendered at all, so a surface
   * that is designed but not shipped can never appear as live navigation.
   */
  flag?: boolean;
};

const CORE: Item[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/repository", label: "Global Repository", icon: Library },
  { to: "/discover", label: "Discovery Wizard", icon: Wand2 },
  { to: "/opportunities", label: "Opportunities", icon: Lightbulb, pro: true },
  { to: "/opportunity-map", label: "Opportunity Map", icon: Map, pro: true },
  { to: "/workshops", label: "Workshops", icon: Users, pro: true },
  { to: "/quick-wins", label: "Quick Wins Matrix", icon: Grid2x2 },
  { to: "/roi-calculator", label: "ROI & Mission Value", icon: Calculator },
  { to: "/insights", label: "Deployment Intelligence", icon: BarChart3 },
  {
    to: "/studio",
    label: "AI Use Case Studio",
    icon: Sparkles,
    flag: PUBLIC_LAUNCH_FEATURES.studio,
  },
  {
    to: "/my-use-cases",
    label: "My Use Cases",
    icon: FolderHeart,
    flag: PUBLIC_LAUNCH_FEATURES.myUseCases,
  },
  {
    to: "/boards",
    label: "Use Case Boards",
    icon: KanbanSquare,
    flag: PUBLIC_LAUNCH_FEATURES.boards,
  },
  { to: "/submit", label: "Submit a Use Case", icon: Send },
  { to: "/patterns", label: "Pattern Library", icon: BookOpen },
  { to: "/demo-scenarios", label: "Demo Scenarios", icon: Lightbulb },
];

const STUDIO_PRO: Item[] = [{ to: "/roadmap", label: "Portfolio Roadmap", icon: Map, pro: true }];

const INTEGRATIONS: Item[] = [
  { to: "/sarpi", label: "SARPI Readiness", icon: Rocket, pro: true },
  { to: "/advisorx", label: "AdvisorX Guidance", icon: Compass, pro: true },
  { to: "/cyberx/c3g/intake", label: "C3G Governance", icon: Shield, pro: true },
  { to: "/handoffs", label: "Suite Handoffs", icon: Send, pro: true },
];

const ADMIN: Item[] = [
  { to: "/reports", label: "Reports", icon: FileBarChart },
  { to: "/administration", label: "Admin Panel", icon: Settings, admin: true },
  { to: "/administration/requests", label: "Requests Inbox", icon: Inbox, admin: true },
  { to: "/administration/pilot", label: "Pilot Programme", icon: Rocket, admin: true },
  { to: "/admin-submissions", label: "Submission Review", icon: Inbox, admin: true },
  { to: "/admin-audit", label: "Submission Audit", icon: ShieldCheck, admin: true },
  { to: "/admin-observability", label: "Export & AI Activity", icon: LineChart },
  { to: "/admin-waitlist", label: "Free Pro Waitlist", icon: Users, admin: true },
];

const ACCOUNT: Item[] = [
  { to: "/support", label: "Request Features / Report Bugs", icon: MessageSquarePlus },
  { to: "/account", label: "Account Settings", icon: UserCog },
  { to: "/account/security", label: "Security", icon: ShieldCheck },
  { to: "/entitlement", label: "My Plan", icon: Crown },
  {
    to: "/module-analytics",
    label: "Module Analytics",
    icon: LineChart,
    flag: PUBLIC_LAUNCH_FEATURES.lifecycleAnalytics,
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { isPro, isAdmin } = usePlan();

  /** Single visibility gate: feature flag first, then role. */
  const visible = (items: Item[]) =>
    items.filter((item) => item.flag !== false && (!item.admin || isAdmin));

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
          <img
            src={brandMark}
            alt="UseCasesX brand mark"
            className="h-8 w-8 shrink-0 rounded-md ring-1 ring-primary/40"
          />
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
            <SidebarMenu>{visible(CORE).map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Studio Modules</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{visible(STUDIO_PRO).map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Integrations</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{visible(INTEGRATIONS).map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Workspace</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{visible(ADMIN).map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Account</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{visible(ACCOUNT).map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
