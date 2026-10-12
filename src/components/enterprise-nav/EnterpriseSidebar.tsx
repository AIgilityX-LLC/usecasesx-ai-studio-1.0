import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import brandMark from "@/assets/usecasesx-logo.png";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { usePlan } from "@/hooks/usePlan";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { useNavCapabilities } from "@/hooks/useNavCapabilities";
import { useNavAnalyticsContext } from "@/hooks/useNavAnalyticsContext";
import {
  DEFAULT_EXPANDED_SECTION,
  ENTERPRISE_NAV_SECTIONS,
  SIDEBAR_SECTION_STORAGE_PREFIX,
  type EnterpriseNavItem,
  type EnterpriseNavSection,
  sectionContainsPath,
} from "@/lib/navigation/enterprise-nav";
import type { NavCapability } from "@/lib/authz/nav-capabilities";
import {
  moduleFromPath,
  moduleFromSectionId,
  trackModuleOpened,
  trackNavigationClicked,
  trackSidebarToggle,
} from "@/lib/telemetry/navigation-analytics";
import { SidebarSection } from "./SidebarSection";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { WorkspaceUrlSync } from "./WorkspaceUrlSync";
import { NavCommandTrigger } from "./NavCommandTrigger";
import { UserMenu } from "./UserMenu";
import { PlatformAdminSidebarNav } from "@/components/platform-admin/PlatformAdminSidebarNav";

function filterItems(
  items: EnterpriseNavItem[] | undefined,
  has: (c: NavCapability) => boolean,
  loading: boolean,
): EnterpriseNavItem[] {
  return (items ?? []).filter((it) => {
    if (it.flag === false) return false;
    if (!it.capability) return true;
    if (loading) return it.capability !== "platform.manage";
    return has(it.capability);
  });
}

function sectionVisible(
  section: EnterpriseNavSection,
  has: (c: NavCapability) => boolean,
  loading: boolean,
): boolean {
  if (section.flag === false) return false;
  if (section.requireCapability) {
    if (loading) return section.requireCapability !== "platform.manage";
    if (!has(section.requireCapability)) return false;
  }
  if (section.link) {
    const items = filterItems([section.link], has, loading);
    return items.length > 0;
  }
  return filterItems(section.items, has, loading).length > 0;
}

/**
 * Enterprise SaaS signed-in sidebar.
 * Navigation definitions live in `enterprise-nav.ts` only.
 */
export function EnterpriseSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { isPro } = usePlan();
  const session = useSupabaseSession();
  const nav = useNavCapabilities();
  const navAnalytics = useNavAnalyticsContext();
  const { state } = useSidebar();
  const prevRailState = useRef<"expanded" | "collapsed" | null>(null);

  const sectionStorageKey =
    session?.user?.id != null
      ? `${SIDEBAR_SECTION_STORAGE_PREFIX}${session.user.id}`
      : `${SIDEBAR_SECTION_STORAGE_PREFIX}anon`;

  const [expandedId, setExpandedId] = useState<string | null>(DEFAULT_EXPANDED_SECTION);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(sectionStorageKey);
      if (raw === "" || raw === "none") {
        setExpandedId(null);
      } else if (raw) {
        setExpandedId(raw);
      }
    } catch {
      /* ignore */
    }
  }, [sectionStorageKey]);

  // Nested routes keep the owning section expanded (progressive disclosure).
  useEffect(() => {
    const active = ENTERPRISE_NAV_SECTIONS.find(
      (s) =>
        s.zone === "body" &&
        s.collapsible !== false &&
        (s.items?.length ?? 0) > 0 &&
        sectionContainsPath(s, pathname),
    );
    if (active) setExpandedId(active.id);
  }, [pathname]);

  // Icon-rail expand/collapse (SidebarTrigger / SidebarRail) — skip first paint.
  useEffect(() => {
    if (prevRailState.current === null) {
      prevRailState.current = state;
      return;
    }
    if (prevRailState.current === state) return;
    trackSidebarToggle(navAnalytics, {
      expanded: state === "expanded",
      surface: "icon_rail",
    });
    prevRailState.current = state;
  }, [state, navAnalytics]);

  const persistExpanded = (id: string | null, opts?: { fromUser?: boolean }) => {
    const prev = expandedId;
    setExpandedId(id);
    try {
      window.localStorage.setItem(sectionStorageKey, id ?? "none");
    } catch {
      /* ignore */
    }
    if (!opts?.fromUser) return;
    if (id && id !== prev) {
      trackSidebarToggle(navAnalytics, {
        expanded: true,
        surface: "section",
        navigationItemId: id,
      });
    } else if (!id && prev) {
      trackSidebarToggle(navAnalytics, {
        expanded: false,
        surface: "section",
        navigationItemId: prev,
      });
    }
  };

  const onNavItemClick = (item: EnterpriseNavItem, sectionId?: string) => {
    const module = moduleFromSectionId(sectionId) ?? moduleFromPath(item.to) ?? item.id;
    trackNavigationClicked(navAnalytics, {
      navigationItemId: item.id,
      module,
      surface: "sidebar",
    });
    const currentModule = moduleFromPath(pathname);
    if (module && module !== currentModule) {
      trackModuleOpened(navAnalytics, {
        module,
        navigationItemId: item.id,
        surface: "sidebar",
      });
    }
  };

  const isPlatformAdminArea =
    pathname === "/platform-admin" || pathname.startsWith("/platform-admin/");

  const bodySections = useMemo(() => ENTERPRISE_NAV_SECTIONS.filter((s) => s.zone === "body"), []);
  const bottomSections = useMemo(
    () => ENTERPRISE_NAV_SECTIONS.filter((s) => s.zone === "bottom"),
    [],
  );

  const renderSection = (section: EnterpriseNavSection) => {
    if (!sectionVisible(section, nav.has, nav.loading)) return null;
    const items = section.link ? undefined : filterItems(section.items, nav.has, nav.loading);
    const isOpen = expandedId === section.id;
    return (
      <SidebarSection
        key={section.id}
        section={section}
        items={items}
        pathname={pathname}
        isPro={isPro}
        open={isOpen}
        onOpenChange={(next) => {
          // Maximum one expanded primary group.
          persistExpanded(next ? section.id : null, { fromUser: true });
        }}
        onItemNavigate={(item) => onNavItemClick(item, section.id)}
      />
    );
  };

  return (
    <Sidebar collapsible="icon" aria-label="Workspace navigation">
      <WorkspaceUrlSync />
      <SidebarHeader className="gap-0 border-b border-sidebar-border">
        <Link
          to="/"
          className="flex items-center gap-2 px-3 py-3 outline-none ring-sidebar-ring focus-visible:ring-2"
          aria-label="UseCasesX home"
        >
          <img
            src={brandMark}
            alt=""
            className="h-8 w-8 shrink-0 rounded-md ring-1 ring-primary/40"
          />
          {state !== "collapsed" && (
            <div className="min-w-0 leading-tight">
              <div className="truncate text-[13px] font-bold tracking-tight">UseCasesX™</div>
              <div className="truncate text-[9px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                by AIgilityX™
              </div>
            </div>
          )}
        </Link>
        <WorkspaceSwitcher />
        <NavCommandTrigger />
      </SidebarHeader>

      <SidebarContent className="gap-0 px-1 py-2">
        {isPlatformAdminArea ? (
          <PlatformAdminSidebarNav />
        ) : (
          <>
            <nav aria-label="Product journey">{bodySections.map(renderSection)}</nav>
            <SidebarSeparator className="my-2" />
            <nav aria-label="Workspace tools">{bottomSections.map(renderSection)}</nav>
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <UserMenu />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
