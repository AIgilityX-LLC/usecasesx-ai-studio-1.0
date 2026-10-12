import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, FolderKanban, KanbanSquare, Lightbulb, Library, Loader2 } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useSidebar } from "@/components/ui/sidebar";
import { useNavCapabilities } from "@/hooks/useNavCapabilities";
import { useNavAnalyticsContext } from "@/hooks/useNavAnalyticsContext";
import { useWorkspaceContext } from "@/hooks/useWorkspaceContext";
import { useWorkspacePortfolios } from "@/hooks/useWorkspacePortfolios";
import { listBoards } from "@/lib/boards";
import { PATTERN_TEMPLATE_SEEDS } from "@/lib/content-governance";
import {
  COMMAND_ENTITY_GROUP_LABELS,
  COMMAND_PALETTE_ACTIONS,
  COMMAND_PALETTE_NAVIGATION,
  ENTITY_SEARCH_DEBOUNCE_MS,
  ENTITY_SEARCH_LIMIT,
  commandPaletteShortcutLabel,
  filterCommandItems,
  filterNamedEntitiesForCommand,
  filterPatternsForCommand,
  filterTitledEntitiesForCommand,
  groupEntityHits,
  shouldRunEntitySearch,
  type CommandEntityHit,
  type CommandEntityType,
} from "@/lib/navigation/command-palette";
import { ENTERPRISE_COMMAND_HINT } from "@/lib/navigation/enterprise-nav";
import { listOpportunitiesFn } from "@/lib/opportunities.functions";
import {
  moduleFromPath,
  trackCommandPaletteOpened,
  trackModuleOpened,
  trackNavSearchUsed,
  trackNavigationClicked,
} from "@/lib/telemetry/navigation-analytics";
import { listUseCases } from "@/lib/use-cases.functions";
import { cn } from "@/lib/utils";

const ENTITY_ICONS: Record<CommandEntityType, typeof Library> = {
  use_case: Library,
  opportunity: Lightbulb,
  pattern: BookOpen,
  board: KanbanSquare,
  portfolio: FolderKanban,
};

const ENTITY_ORDER: CommandEntityType[] = [
  "use_case",
  "opportunity",
  "pattern",
  "board",
  "portfolio",
];

function useDebouncedValue(value: string, ms: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

/** Sidebar search trigger + global Ctrl/Cmd+K command palette. */
export function NavCommandTrigger({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, ENTITY_SEARCH_DEBOUNCE_MS);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { state, isMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;
  const nav = useNavCapabilities();
  const navAnalytics = useNavAnalyticsContext();
  const { data: workspace } = useWorkspaceContext();
  const activeWorkspaceId = workspace?.workspace?.id ?? null;
  const portfoliosQuery = useWorkspacePortfolios();
  const shortcut = useMemo(() => commandPaletteShortcutLabel(), []);
  const Icon = ENTERPRISE_COMMAND_HINT.icon;
  const openViaRef = useRef<"shortcut" | "button">("button");
  const lastSearchKey = useRef<string | null>(null);

  const runEntities = open && !nav.loading && shouldRunEntitySearch(debouncedQuery);

  const navigation = useMemo(
    () => (nav.loading ? [] : filterCommandItems(COMMAND_PALETTE_NAVIGATION, query, nav.has)),
    [nav.loading, nav.has, query],
  );
  const actions = useMemo(
    () => (nav.loading ? [] : filterCommandItems(COMMAND_PALETTE_ACTIONS, query, nav.has)),
    [nav.loading, nav.has, query],
  );

  const useCasesQuery = useQuery({
    queryKey: ["command-palette", "use-cases", debouncedQuery],
    enabled: runEntities && nav.has("repository.read"),
    queryFn: async () => {
      const res = await listUseCases({
        data: { q: debouncedQuery, limit: ENTITY_SEARCH_LIMIT, sort: "relevance" },
      });
      return (res.cases ?? []).map((c) => ({
        id: c.id as string,
        title: (c.title as string) ?? "Untitled",
        slug: (c.slug as string) ?? "",
        summary: (c.summary as string | null) ?? undefined,
      }));
    },
    staleTime: 30_000,
  });

  const opportunitiesQuery = useQuery({
    queryKey: ["command-palette", "opportunities", debouncedQuery, activeWorkspaceId],
    enabled: runEntities && nav.has("opportunity.read"),
    queryFn: async () => {
      const rows = await listOpportunitiesFn({ data: { search: debouncedQuery } });
      const scoped = activeWorkspaceId
        ? rows.filter((r) => r.workspaceId === activeWorkspaceId)
        : rows;
      return scoped.map((r) => ({
        id: r.id,
        title: r.title,
        status: r.status,
      }));
    },
    staleTime: 15_000,
  });

  const boardsQuery = useQuery({
    queryKey: ["command-palette", "boards", activeWorkspaceId],
    enabled: runEntities && nav.has("usecase.read"),
    queryFn: listBoards,
    staleTime: 30_000,
  });

  const entityHits = useMemo(() => {
    if (!runEntities) return [] as CommandEntityHit[];
    const hits: CommandEntityHit[] = [];

    if (nav.has("repository.read") && useCasesQuery.data) {
      hits.push(
        ...filterTitledEntitiesForCommand(useCasesQuery.data, debouncedQuery, {
          type: "use_case",
          toFor: (r) => (r.slug ? `/use-cases/${r.slug}` : "/repository"),
          subtitleFor: (r) => r.summary,
        }),
      );
    }

    if (nav.has("opportunity.read") && opportunitiesQuery.data) {
      hits.push(
        ...filterTitledEntitiesForCommand(opportunitiesQuery.data, debouncedQuery, {
          type: "opportunity",
          toFor: (r) => `/opportunities/${r.id}`,
          subtitleFor: (r) => r.status,
        }),
      );
    }

    if (nav.has("repository.read")) {
      hits.push(...filterPatternsForCommand(PATTERN_TEMPLATE_SEEDS, debouncedQuery));
    }

    if (nav.has("usecase.read") && boardsQuery.data) {
      const scoped = activeWorkspaceId
        ? boardsQuery.data.filter((b) => b.workspace_id === activeWorkspaceId)
        : boardsQuery.data;
      hits.push(
        ...filterTitledEntitiesForCommand(scoped, debouncedQuery, {
          type: "board",
          toFor: (r) => `/boards/${r.id}`,
        }),
      );
    }

    if (nav.has("portfolio.read") && portfoliosQuery.data) {
      hits.push(
        ...filterNamedEntitiesForCommand(
          portfoliosQuery.data.map((p) => ({
            id: p.portfolio.id,
            name: p.portfolio.name,
            ownerName: p.ownerName,
          })),
          debouncedQuery,
          {
            type: "portfolio",
            toFor: () => "/portfoliox",
            subtitleFor: (r) => r.ownerName,
          },
        ),
      );
    }

    return hits;
  }, [
    runEntities,
    nav,
    useCasesQuery.data,
    opportunitiesQuery.data,
    boardsQuery.data,
    portfoliosQuery.data,
    debouncedQuery,
    activeWorkspaceId,
  ]);

  const groupedEntities = useMemo(() => groupEntityHits(entityHits), [entityHits]);

  const entitiesLoading =
    runEntities &&
    ((nav.has("repository.read") && useCasesQuery.isFetching) ||
      (nav.has("opportunity.read") && opportunitiesQuery.isFetching) ||
      (nav.has("usecase.read") && boardsQuery.isFetching));

  const hasStatic = navigation.length > 0 || actions.length > 0;
  const hasEntities = entityHits.length > 0;
  const showEmpty = !entitiesLoading && !hasStatic && !hasEntities;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        openViaRef.current = "shortcut";
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const wasOpen = useRef(false);
  useEffect(() => {
    if (!open) {
      setQuery("");
      lastSearchKey.current = null;
      wasOpen.current = false;
      return;
    }
    if (wasOpen.current) return;
    wasOpen.current = true;
    trackCommandPaletteOpened(navAnalytics, openViaRef.current);
  }, [open, navAnalytics]);

  // Count-only search telemetry — never the query string (CTA search_used is separate).
  useEffect(() => {
    if (!runEntities || entitiesLoading) return;
    const key = `${debouncedQuery.length}:${entityHits.length}`;
    if (lastSearchKey.current === key) return;
    lastSearchKey.current = key;
    trackNavSearchUsed(navAnalytics, entityHits.length);
  }, [runEntities, entitiesLoading, debouncedQuery.length, entityHits.length, navAnalytics]);

  function go(to: string, meta?: { navigationItemId?: string; module?: string }) {
    setOpen(false);
    const module = meta?.module ?? moduleFromPath(to);
    if (meta?.navigationItemId) {
      trackNavigationClicked(navAnalytics, {
        navigationItemId: meta.navigationItemId,
        module,
        surface: "command_palette",
      });
    }
    const currentModule = moduleFromPath(pathname);
    if (module && module !== currentModule) {
      trackModuleOpened(navAnalytics, {
        module,
        navigationItemId: meta?.navigationItemId,
        surface: "command_palette",
      });
    }
    void navigate({ to: to as never });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          openViaRef.current = "button";
          setOpen(true);
        }}
        aria-label="Open command palette"
        aria-keyshortcuts={shortcut === "⌘K" ? "Meta+K" : "Control+K"}
        className={cn(
          "mx-2 mb-2 flex items-center gap-2 rounded-md border border-sidebar-border bg-sidebar-accent/30 px-2.5 py-2 text-sm text-muted-foreground outline-none ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2",
          collapsed && "mx-auto h-9 w-9 justify-center px-0",
          className,
        )}
      >
        <Icon className="h-4 w-4 shrink-0" aria-hidden />
        {!collapsed && (
          <>
            <span className="flex-1 truncate text-left">{ENTERPRISE_COMMAND_HINT.label}</span>
            <kbd className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {shortcut}
            </kbd>
          </>
        )}
      </button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        label="Command palette"
        shouldFilter={false}
      >
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder={ENTERPRISE_COMMAND_HINT.placeholder}
          aria-label="Search commands and entities"
        />
        <CommandList>
          {showEmpty ? <CommandEmpty>No results found.</CommandEmpty> : null}

          {navigation.length > 0 ? (
            <CommandGroup heading="Navigation">
              {navigation.map((item) => {
                const ItemIcon = item.icon;
                return (
                  <CommandItem
                    key={item.id}
                    value={item.id}
                    onSelect={() =>
                      go(item.to, {
                        navigationItemId: item.id,
                        module: moduleFromPath(item.to),
                      })
                    }
                  >
                    <ItemIcon className="h-4 w-4" aria-hidden />
                    <span>{item.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ) : null}

          {actions.length > 0 ? (
            <>
              {navigation.length > 0 ? <CommandSeparator /> : null}
              <CommandGroup heading="Actions">
                {actions.map((item) => {
                  const ItemIcon = item.icon;
                  return (
                    <CommandItem
                      key={item.id}
                      value={item.id}
                      onSelect={() =>
                        go(item.to, {
                          navigationItemId: item.id,
                          module: moduleFromPath(item.to),
                        })
                      }
                    >
                      <ItemIcon className="h-4 w-4" aria-hidden />
                      <span>{item.label}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </>
          ) : null}

          {runEntities ? (
            <>
              {(hasStatic || entitiesLoading || hasEntities) && <CommandSeparator />}
              {entitiesLoading && !hasEntities ? (
                <div
                  className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground"
                  role="status"
                  aria-live="polite"
                >
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Searching…
                </div>
              ) : null}
              {ENTITY_ORDER.map((type) => {
                const group = groupedEntities[type];
                if (!group?.length) return null;
                const GroupIcon = ENTITY_ICONS[type];
                return (
                  <CommandGroup key={type} heading={COMMAND_ENTITY_GROUP_LABELS[type]}>
                    {group.map((hit) => (
                      <CommandItem
                        key={hit.id}
                        value={hit.id}
                        onSelect={() =>
                          go(hit.to, {
                            // Type only — never entity UUIDs or titles.
                            navigationItemId: `entity:${hit.type}`,
                            module: moduleFromPath(hit.to) ?? hit.type,
                          })
                        }
                      >
                        <GroupIcon className="h-4 w-4" aria-hidden />
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate">{hit.label}</span>
                          {hit.subtitle ? (
                            <span className="truncate text-xs text-muted-foreground">
                              {hit.subtitle}
                            </span>
                          ) : null}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                );
              })}
            </>
          ) : null}
        </CommandList>
      </CommandDialog>
    </>
  );
}
