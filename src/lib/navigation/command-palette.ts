/**
 * Global command palette — static destinations + helpers for RBAC / search.
 * Entity search reuses existing list APIs; no broad DB search here.
 */

import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Library,
  Wand2,
  Lightbulb,
  Sparkles,
  FolderHeart,
  Map,
  Shield,
  FileBarChart,
  KanbanSquare,
  Plus,
} from "lucide-react";
import type { NavCapability } from "@/lib/authz/nav-capabilities";
import type { PatternTemplateSeed } from "@/lib/content-governance";

export const ENTITY_SEARCH_MIN_CHARS = 2;
export const ENTITY_SEARCH_DEBOUNCE_MS = 250;
export const ENTITY_SEARCH_LIMIT = 6;

export type CommandPaletteItem = {
  id: string;
  label: string;
  to: string;
  capability: NavCapability;
  icon: LucideIcon;
  /** Extra match tokens (not shown). */
  keywords?: readonly string[];
};

export type CommandEntityType = "use_case" | "opportunity" | "pattern" | "board" | "portfolio";

export type CommandEntityHit = {
  id: string;
  type: CommandEntityType;
  label: string;
  to: string;
  subtitle?: string;
};

export const COMMAND_ENTITY_GROUP_LABELS: Record<CommandEntityType, string> = {
  use_case: "Use Cases",
  opportunity: "Opportunities",
  pattern: "Patterns",
  board: "Boards",
  portfolio: "Portfolios",
};

/** Primary navigation destinations (RBAC-gated). */
export const COMMAND_PALETTE_NAVIGATION: readonly CommandPaletteItem[] = [
  {
    id: "nav-overview",
    label: "Overview",
    to: "/dashboard",
    capability: "dashboard.read",
    icon: LayoutDashboard,
    keywords: ["dashboard", "home"],
  },
  {
    id: "nav-repository",
    label: "Global Repository",
    to: "/repository",
    capability: "repository.read",
    icon: Library,
    keywords: ["catalogue", "catalog", "repo"],
  },
  {
    id: "nav-discovery",
    label: "Discovery",
    to: "/discover",
    capability: "repository.read",
    icon: Wand2,
    keywords: ["wizard", "discover"],
  },
  {
    id: "nav-opportunities",
    label: "Opportunities",
    to: "/opportunities",
    capability: "opportunity.read",
    icon: Lightbulb,
  },
  {
    id: "nav-studio",
    label: "AI Use Case Studio",
    to: "/studio",
    capability: "usecase.read",
    icon: Sparkles,
    keywords: ["studio", "draft"],
  },
  {
    id: "nav-use-cases",
    label: "Use Cases",
    to: "/my-use-cases",
    capability: "usecase.read",
    icon: FolderHeart,
    keywords: ["my use cases", "saved"],
  },
  {
    id: "nav-portfolio",
    label: "Portfolio",
    to: "/portfoliox",
    capability: "portfolio.read",
    icon: Map,
    keywords: ["portfoliox", "prioritize"],
  },
  {
    id: "nav-governance",
    label: "Governance",
    to: "/reviews",
    capability: "decision.read",
    icon: Shield,
    keywords: ["reviews", "govern", "assure"],
  },
  {
    id: "nav-reports",
    label: "Reports",
    to: "/reports",
    capability: "report.read",
    icon: FileBarChart,
  },
];

/** Quick actions — navigate to create/open surfaces (no duplicate write APIs). */
export const COMMAND_PALETTE_ACTIONS: readonly CommandPaletteItem[] = [
  {
    id: "act-create-use-case",
    label: "Create Use Case",
    to: "/studio",
    capability: "usecase.create",
    icon: Plus,
    keywords: ["new", "draft", "blank"],
  },
  {
    id: "act-start-discovery",
    label: "Start Discovery",
    to: "/discover",
    capability: "repository.read",
    icon: Wand2,
  },
  {
    id: "act-create-opportunity",
    label: "Create Opportunity",
    to: "/opportunities/new",
    capability: "opportunity.create",
    icon: Lightbulb,
    keywords: ["capture", "new"],
  },
  {
    id: "act-create-board",
    label: "Create Board",
    to: "/boards",
    capability: "usecase.create",
    icon: KanbanSquare,
    keywords: ["new", "kanban"],
  },
  {
    id: "act-open-portfolio",
    label: "Open Portfolio",
    to: "/portfoliox",
    capability: "portfolio.read",
    icon: Map,
  },
];

export function commandPaletteShortcutLabel(
  platform = typeof navigator !== "undefined" ? navigator.platform : "",
): string {
  return /mac|iphone|ipad|ipod/i.test(platform) ? "⌘K" : "Ctrl+K";
}

export function matchesCommandQuery(
  item: Pick<CommandPaletteItem, "label" | "to" | "keywords">,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = [item.label, item.to, ...(item.keywords ?? [])].join(" ").toLowerCase();
  return q.split(/\s+/).every((word) => hay.includes(word));
}

export function filterCommandItems(
  items: readonly CommandPaletteItem[],
  query: string,
  has: (capability: NavCapability) => boolean,
): CommandPaletteItem[] {
  return items.filter((item) => has(item.capability) && matchesCommandQuery(item, query));
}

export function shouldRunEntitySearch(query: string): boolean {
  return query.trim().length >= ENTITY_SEARCH_MIN_CHARS;
}

export function filterPatternsForCommand(
  patterns: readonly PatternTemplateSeed[],
  query: string,
  limit = ENTITY_SEARCH_LIMIT,
): CommandEntityHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return patterns
    .filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.summary.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q),
    )
    .slice(0, limit)
    .map((p) => ({
      id: `pattern:${p.slug}`,
      type: "pattern" as const,
      label: p.title,
      to: "/patterns",
      subtitle: p.summary,
    }));
}

export function filterNamedEntitiesForCommand<T extends { id: string; name: string }>(
  rows: readonly T[],
  query: string,
  opts: {
    type: CommandEntityType;
    toFor: (row: T) => string;
    subtitleFor?: (row: T) => string | undefined;
    limit?: number;
  },
): CommandEntityHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const limit = opts.limit ?? ENTITY_SEARCH_LIMIT;
  return rows
    .filter((r) => r.name.toLowerCase().includes(q))
    .slice(0, limit)
    .map((r) => ({
      id: `${opts.type}:${r.id}`,
      type: opts.type,
      label: r.name,
      to: opts.toFor(r),
      subtitle: opts.subtitleFor?.(r),
    }));
}

export function filterTitledEntitiesForCommand<T extends { id: string; title: string }>(
  rows: readonly T[],
  query: string,
  opts: {
    type: CommandEntityType;
    toFor: (row: T) => string;
    subtitleFor?: (row: T) => string | undefined;
    limit?: number;
  },
): CommandEntityHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const limit = opts.limit ?? ENTITY_SEARCH_LIMIT;
  return rows
    .filter((r) => r.title.toLowerCase().includes(q))
    .slice(0, limit)
    .map((r) => ({
      id: `${opts.type}:${r.id}`,
      type: opts.type,
      label: r.title,
      to: opts.toFor(r),
      subtitle: opts.subtitleFor?.(r),
    }));
}

export function groupEntityHits(
  hits: readonly CommandEntityHit[],
): Partial<Record<CommandEntityType, CommandEntityHit[]>> {
  const out: Partial<Record<CommandEntityType, CommandEntityHit[]>> = {};
  for (const hit of hits) {
    const bucket = out[hit.type] ?? [];
    bucket.push(hit);
    out[hit.type] = bucket;
  }
  return out;
}

/** Static destinations for integrity / regression checks. */
export function collectCommandPaletteTargets(): string[] {
  return [
    ...new Set([
      ...COMMAND_PALETTE_NAVIGATION.map((i) => i.to),
      ...COMMAND_PALETTE_ACTIONS.map((i) => i.to),
    ]),
  ];
}
