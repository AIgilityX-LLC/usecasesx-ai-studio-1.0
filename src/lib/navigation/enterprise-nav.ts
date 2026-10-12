/**
 * Centralized enterprise sidebar navigation.
 * Components must import from here — do not redefine menus in JSX.
 */

import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Library,
  Wand2,
  BookOpen,
  BarChart3,
  Lightbulb,
  Sparkles,
  FolderHeart,
  KanbanSquare,
  Send,
  Map,
  Users,
  Grid2x2,
  Calculator,
  Inbox,
  LineChart,
  FileBarChart,
  Rocket,
  MessageSquarePlus,
  HelpCircle,
  Blocks,
  Search,
} from "lucide-react";
import { PUBLIC_LAUNCH_FEATURES, CLIENT_CAPABILITY_FLAGS } from "@/lib/feature-flags";
import { DEFAULT_CAPABILITY_FLAGS } from "@/lib/authz/flags";
import { NAV_ROUTE_CAPABILITIES, type NavCapability } from "@/lib/authz/nav-capabilities";

/** Resolve client flags without letting `undefined` env overrides blank defaults. */
function capFlag(key: keyof typeof DEFAULT_CAPABILITY_FLAGS): boolean {
  const v = CLIENT_CAPABILITY_FLAGS[key];
  return typeof v === "boolean" ? v : DEFAULT_CAPABILITY_FLAGS[key];
}

export type EnterpriseNavItem = {
  id: string;
  to: string;
  label: string;
  icon: LucideIcon;
  /** Required capability; defaults from NAV_ROUTE_CAPABILITIES[to]. */
  capability?: NavCapability;
  /** Soft Pro badge (does not hide). */
  pro?: boolean;
  /** When false, item is omitted (feature not shipped). */
  flag?: boolean;
};

export type EnterpriseNavSection = {
  id: string;
  label: string;
  /** Single top-level link (e.g. Overview) — not an accordion group. */
  link?: EnterpriseNavItem;
  items?: EnterpriseNavItem[];
  /**
   * Zone placement.
   * body = lifecycle journey; bottom = integrations / admin / help.
   */
  zone: "body" | "bottom";
  /** Accordion group (default true when items.length > 0). */
  collapsible?: boolean;
  /** Extra gate: entire section hidden unless this capability is held. */
  requireCapability?: NavCapability;
  /** Extra gate: section omitted when flag is false. */
  flag?: boolean;
};

function item(
  partial: Omit<EnterpriseNavItem, "capability"> & { capability?: NavCapability },
): EnterpriseNavItem {
  return {
    ...partial,
    capability: partial.capability ?? NAV_ROUTE_CAPABILITIES[partial.to],
  };
}

/** Lifecycle-driven signed-in sidebar — single source of truth. */
export const ENTERPRISE_NAV_SECTIONS: EnterpriseNavSection[] = [
  {
    id: "overview",
    label: "Overview",
    zone: "body",
    collapsible: false,
    link: item({ id: "dashboard", to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }),
  },
  {
    id: "discover",
    label: "Discover",
    zone: "body",
    items: [
      item({ id: "repository", to: "/repository", label: "Global Repository", icon: Library }),
      item({ id: "discover-wizard", to: "/discover", label: "Discovery Wizard", icon: Wand2 }),
      item({ id: "patterns", to: "/patterns", label: "Pattern Library", icon: BookOpen }),
      item({
        id: "insights",
        to: "/insights",
        label: "Deployment Intelligence",
        icon: BarChart3,
      }),
      item({
        id: "demo-scenarios",
        to: "/demo-scenarios",
        label: "Demo Scenarios",
        icon: Lightbulb,
      }),
    ],
  },
  {
    id: "design",
    label: "Design",
    zone: "body",
    items: [
      item({
        id: "studio",
        to: "/studio",
        label: "AI Use Case Studio",
        icon: Sparkles,
        flag: PUBLIC_LAUNCH_FEATURES.studio,
      }),
      item({
        id: "my-use-cases",
        to: "/my-use-cases",
        label: "My Use Cases",
        icon: FolderHeart,
        flag: PUBLIC_LAUNCH_FEATURES.myUseCases,
      }),
      item({
        id: "boards",
        to: "/boards",
        label: "Use Case Boards",
        icon: KanbanSquare,
        flag: PUBLIC_LAUNCH_FEATURES.boards,
      }),
      item({ id: "submit", to: "/submit", label: "Submit a Use Case", icon: Send }),
    ],
  },
  {
    id: "assess",
    label: "Assess & Prioritize",
    zone: "body",
    items: [
      item({
        id: "opportunities",
        to: "/opportunities",
        label: "Opportunities",
        icon: Lightbulb,
        pro: true,
      }),
      item({
        id: "opportunity-map",
        to: "/opportunity-map",
        label: "Opportunity Map",
        icon: Map,
        pro: true,
        flag: capFlag("opportunityMap"),
      }),
      item({
        id: "workshops",
        to: "/workshops",
        label: "Workshops",
        icon: Users,
        pro: true,
        flag: capFlag("workshopMode"),
      }),
      item({ id: "quick-wins", to: "/quick-wins", label: "Quick Wins Matrix", icon: Grid2x2 }),
      item({
        id: "roi",
        to: "/roi-calculator",
        label: "ROI & Mission Value",
        icon: Calculator,
      }),
    ],
  },
  {
    id: "portfolio",
    label: "Portfolio",
    zone: "body",
    items: [
      item({
        id: "roadmap",
        to: "/roadmap",
        label: "Portfolio Roadmap",
        icon: Map,
        pro: true,
      }),
    ],
  },
  {
    id: "govern",
    label: "Govern & Assure",
    zone: "body",
    items: [
      item({
        id: "reviews",
        to: "/reviews",
        label: "Review Inbox",
        icon: Inbox,
        pro: true,
      }),
    ],
  },
  {
    id: "intelligence",
    label: "Intelligence",
    zone: "body",
    items: [
      item({
        id: "module-analytics",
        to: "/module-analytics",
        label: "Module Analytics",
        icon: LineChart,
        flag: PUBLIC_LAUNCH_FEATURES.lifecycleAnalytics,
      }),
    ],
  },
  {
    id: "reports",
    label: "Reports",
    zone: "body",
    collapsible: false,
    link: item({ id: "reports-link", to: "/reports", label: "Reports", icon: FileBarChart }),
  },
  {
    id: "integrations",
    label: "Integrations",
    zone: "bottom",
    /** Omit the whole section until integrations capability ships — no disabled stubs. */
    flag: capFlag("integrations"),
    requireCapability: "integration.read",
    items: [
      item({
        id: "handoffs",
        to: "/handoffs",
        label: "Suite Handoffs",
        icon: Blocks,
        pro: true,
      }),
    ],
  },
  {
    id: "workspace-admin",
    label: "Workspace",
    zone: "bottom",
    requireCapability: "workspace.manage",
    items: [
      item({
        id: "observability",
        to: "/admin-observability",
        label: "Export & AI Activity",
        icon: LineChart,
      }),
    ],
  },
  {
    id: "help",
    label: "Help",
    zone: "bottom",
    items: [
      item({
        id: "support",
        to: "/support",
        label: "Request Features / Report Bugs",
        icon: MessageSquarePlus,
      }),
      item({ id: "pilot", to: "/pilot", label: "Pilot Mission", icon: Rocket }),
      item({ id: "faq", to: "/faq", label: "FAQ", icon: HelpCircle }),
    ],
  },
];

export const ENTERPRISE_COMMAND_HINT = {
  label: "Search",
  placeholder: "Search or jump to…",
  icon: Search,
  /** Prefer `commandPaletteShortcutLabel()` at render time for OS-accurate chords. */
  shortcut: "Ctrl+K",
} as const;

export const DEFAULT_EXPANDED_SECTION = "discover";

export const SIDEBAR_SECTION_STORAGE_PREFIX = "usecasesx.sidebar.section.";
export const SIDEBAR_OPEN_STORAGE_KEY = "usecasesx.sidebar.open";

/** Flat list of navigable targets for integrity checks and command palette. */
export function collectEnterpriseNavTargets(
  sections: readonly EnterpriseNavSection[] = ENTERPRISE_NAV_SECTIONS,
): string[] {
  const out: string[] = [];
  for (const section of sections) {
    if (section.flag === false) continue;
    if (section.link && section.link.flag !== false) out.push(section.link.to);
    for (const it of section.items ?? []) {
      if (it.flag !== false) out.push(it.to);
    }
  }
  // Account surfaces live in the user menu, not sections.
  out.push("/account", "/account/security", "/entitlement");
  return [...new Set(out)];
}

export function sectionContainsPath(section: EnterpriseNavSection, pathname: string): boolean {
  const match = (to: string) =>
    to === "/" || to === "/account"
      ? pathname === to || pathname === `${to}/`
      : pathname === to || pathname.startsWith(`${to}/`);
  if (section.link && match(section.link.to)) return true;
  return (section.items ?? []).some((it) => match(it.to));
}

export function isNavItemActive(to: string, pathname: string): boolean {
  if (to === "/" || to === "/account") {
    return pathname === to || pathname === `${to}/`;
  }
  return pathname === to || pathname.startsWith(`${to}/`);
}
