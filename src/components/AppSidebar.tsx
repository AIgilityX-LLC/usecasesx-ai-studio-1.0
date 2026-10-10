import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import brandMark from "@/assets/usecasesx-logo.png";
import {
  Cpu,
  LayoutDashboard,
  Library,
  Sparkles,
  FolderHeart,
  KanbanSquare,
  BookOpen,
  Gauge,
  Map,
  Rocket,
  Compass,
  Shield,
  BarChart3,
  FileBarChart,
  ServerCog,
  DatabaseZap,
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
  MailCheck,
  ListChecks,
  ChevronRight,
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { usePlan } from "@/hooks/usePlan";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { useNavCapabilities } from "@/hooks/useNavCapabilities";
import { PUBLIC_LAUNCH_FEATURES } from "@/lib/feature-flags";
import {
  NAV_ROUTE_CAPABILITIES,
  type NavCapability,
} from "@/lib/authz/nav-capabilities";
import { cn } from "@/lib/utils";

type Item = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  pro?: boolean;
  /**
   * Legacy platform-staff flag. Prefer `capability`; when both are set the
   * capability check is authoritative and this remains a documentation hint.
   */
  admin?: boolean;
  /** Required nav capability — primary visibility gate. */
  capability?: NavCapability;
  /**
   * Feature switch. When false the entry is not rendered at all, so a surface
   * that is designed but not shipped can never appear as live navigation.
   */
  flag?: boolean;
};

function capabilityForItem(item: Item): NavCapability | undefined {
  return item.capability ?? NAV_ROUTE_CAPABILITIES[item.to];
}

type AdminGroup = {
  label: string;
  items: Item[];
  /** When true, group is a collapsible section (collapsed by default). */
  collapsible?: boolean;
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

/** Admin / workspace nav — 21 items, grouped for scanability. Gates unchanged. */
const ADMIN_GROUPS: AdminGroup[] = [
  {
    label: "Overview",
    items: [{ to: "/administration", label: "Admin Panel", icon: Settings, admin: true }],
  },
  {
    label: "Inbox",
    items: [
      { to: "/administration/requests", label: "Requests Inbox", icon: Inbox, admin: true },
      {
        to: "/administration/founding-access",
        label: "Founding Access",
        icon: Crown,
        admin: true,
      },
      { to: "/reviews", label: "Review Inbox", icon: Inbox, pro: true },
      { to: "/admin-submissions", label: "Submission Review", icon: Inbox, admin: true },
    ],
  },
  {
    label: "Growth",
    items: [
      { to: "/administration/leads", label: "Lead Pipeline", icon: Users, admin: true },
      { to: "/admin-waitlist", label: "Free Pro Waitlist", icon: Users, admin: true },
      { to: "/administration/pilot", label: "Pilot Programme", icon: Rocket, admin: true },
      {
        to: "/administration/pilot-milestones",
        label: "Pilot Milestones",
        icon: Rocket,
        admin: true,
      },
    ],
  },
  {
    label: "Insights and audit",
    items: [
      { to: "/reports", label: "Reports", icon: FileBarChart },
      { to: "/admin-observability", label: "Export & AI Activity", icon: LineChart },
      { to: "/admin-audit", label: "Submission Audit", icon: ShieldCheck, admin: true },
    ],
  },
  {
    label: "Platform",
    items: [
      { to: "/administration/ai-engines", label: "AI Engines", icon: Cpu, admin: true },
      {
        to: "/administration/email-delivery",
        label: "Email Delivery",
        icon: MailCheck,
        admin: true,
      },
      {
        to: "/administration/platform-admins",
        label: "Platform Admins",
        icon: ShieldCheck,
        admin: true,
      },
    ],
  },
  {
    label: "Launch and release",
    collapsible: true,
    items: [
      { to: "/administration/readiness", label: "Readiness", icon: Gauge, admin: true },
      {
        to: "/administration/production-readiness",
        label: "Production Readiness",
        icon: ServerCog,
        admin: true,
      },
      {
        to: "/administration/production-data",
        label: "Production Data Audit",
        icon: DatabaseZap,
        admin: true,
      },
      { to: "/administration/launch-checks", label: "Launch Checks", icon: ShieldCheck, admin: true },
      {
        to: "/administration/release-candidate",
        label: "Release Candidate",
        icon: Lock,
        admin: true,
      },
      {
        to: "/administration/launch-readiness",
        label: "Readiness to Launch",
        icon: ListChecks,
        admin: true,
      },
    ],
  },
];

/** Flat count used for inventory checks (must stay 21). */
const ADMIN_ITEM_COUNT = ADMIN_GROUPS.reduce((n, g) => n + g.items.length, 0);

const ACCOUNT: Item[] = [
  { to: "/pilot", label: "Pilot Mission", icon: Rocket },
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

const LAUNCH_RELEASE_STORAGE_PREFIX = "usecasesx.sidebar.launch-release.open.";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { isPro } = usePlan();
  const session = useSupabaseSession();
  const navCaps = useNavCapabilities();

  const launchStorageKey =
    session?.user?.id != null
      ? `${LAUNCH_RELEASE_STORAGE_PREFIX}${session.user.id}`
      : `${LAUNCH_RELEASE_STORAGE_PREFIX}anon`;

  const [launchOpen, setLaunchOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(launchStorageKey);
      // Default collapsed; only open when the user previously expanded it.
      setLaunchOpen(raw === "1");
    } catch {
      setLaunchOpen(false);
    }
  }, [launchStorageKey]);

  const onLaunchOpenChange = (next: boolean) => {
    setLaunchOpen(next);
    try {
      window.localStorage.setItem(launchStorageKey, next ? "1" : "0");
    } catch {
      /* ignore quota / private mode */
    }
  };

  /**
   * Visibility: feature flag → capability (primary) → legacy admin flag.
   * Hidden items are not a security boundary; routes still use RequireCapability
   * / RequireRoles and RLS.
   */
  const visible = (items: Item[]) =>
    items.filter((item) => {
      if (item.flag === false) return false;
      const cap = capabilityForItem(item);
      if (cap) return navCaps.loading ? !item.admin : navCaps.has(cap);
      if (item.admin) return navCaps.has("platform.manage");
      return true;
    });

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

  const renderAdminGroup = (group: AdminGroup) => {
    const items = visible(group.items);
    if (items.length === 0) return null;

    // Icon-only mode: always show item icons (collapsible would hide targets).
    if (group.collapsible && !collapsed) {
      return (
        <Collapsible
          key={group.label}
          open={launchOpen}
          onOpenChange={onLaunchOpenChange}
          className="group/launch"
        >
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger
                className="flex w-full cursor-pointer items-center gap-1 hover:text-sidebar-foreground"
                aria-expanded={launchOpen}
              >
                <ChevronRight
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
                    launchOpen && "rotate-90",
                  )}
                  aria-hidden
                />
                <span className="flex-1 truncate text-left">{group.label}</span>
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>{items.map(renderItem)}</SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      );
    }

    return (
      <SidebarGroup key={group.label}>
        {!collapsed && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
        <SidebarGroupContent>
          <SidebarMenu>{items.map(renderItem)}</SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
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

        <SidebarGroup className="opacity-40 pointer-events-none select-none" aria-disabled="true">
          {!collapsed && (
            <SidebarGroupLabel className="opacity-70">Integrations</SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {INTEGRATIONS.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      disabled
                      tooltip={collapsed ? `${item.label} — Coming soon` : undefined}
                      className="cursor-not-allowed"
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin groups replace the former flat "Workspace" list (ADMIN_ITEM_COUNT items). */}
        {ADMIN_ITEM_COUNT > 0 && ADMIN_GROUPS.map(renderAdminGroup)}

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
