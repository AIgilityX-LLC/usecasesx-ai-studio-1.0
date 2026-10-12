import { describe, expect, it } from "bun:test";
import type { NavCapability } from "@/lib/authz/nav-capabilities";
import {
  COMMAND_PALETTE_ACTIONS,
  COMMAND_PALETTE_NAVIGATION,
  collectCommandPaletteTargets,
  commandPaletteShortcutLabel,
  filterCommandItems,
  filterNamedEntitiesForCommand,
  filterPatternsForCommand,
  filterTitledEntitiesForCommand,
  groupEntityHits,
  matchesCommandQuery,
  shouldRunEntitySearch,
  type CommandEntityHit,
} from "@/lib/navigation/command-palette";
import type { PatternTemplateSeed } from "@/lib/content-governance";

const allow =
  (...caps: NavCapability[]) =>
  (c: NavCapability) =>
    caps.includes(c);

const denyAll = (_c: NavCapability) => false;

describe("command palette", () => {
  it("lists required navigation destinations", () => {
    const labels = COMMAND_PALETTE_NAVIGATION.map((i) => i.label);
    expect(labels).toEqual([
      "Overview",
      "Global Repository",
      "Discovery",
      "Opportunities",
      "AI Use Case Studio",
      "Use Cases",
      "Portfolio",
      "Governance",
      "Reports",
    ]);
  });

  it("lists required actions", () => {
    const labels = COMMAND_PALETTE_ACTIONS.map((i) => i.label);
    expect(labels).toEqual([
      "Create Use Case",
      "Start Discovery",
      "Create Opportunity",
      "Create Board",
      "Open Portfolio",
    ]);
  });

  it("hides items the caller cannot access", () => {
    const nav = filterCommandItems(
      COMMAND_PALETTE_NAVIGATION,
      "",
      allow("dashboard.read", "repository.read"),
    );
    expect(nav.map((i) => i.label)).toEqual(["Overview", "Global Repository", "Discovery"]);
    expect(filterCommandItems(COMMAND_PALETTE_ACTIONS, "", denyAll)).toEqual([]);
  });

  it("filters by query and keywords", () => {
    expect(matchesCommandQuery({ label: "Overview", to: "/dashboard" }, "over")).toBe(true);
    expect(matchesCommandQuery({ label: "Overview", to: "/dashboard" }, "zzz")).toBe(false);
    const hits = filterCommandItems(
      COMMAND_PALETTE_NAVIGATION,
      "repo",
      allow("repository.read", "dashboard.read"),
    );
    expect(hits.map((i) => i.id)).toContain("nav-repository");
  });

  it("gates create opportunity on opportunity.create", () => {
    const withCreate = filterCommandItems(
      COMMAND_PALETTE_ACTIONS,
      "opportunity",
      allow("opportunity.create", "opportunity.read"),
    );
    expect(withCreate.some((i) => i.id === "act-create-opportunity")).toBe(true);

    const readOnly = filterCommandItems(
      COMMAND_PALETTE_ACTIONS,
      "opportunity",
      allow("opportunity.read"),
    );
    expect(readOnly.some((i) => i.id === "act-create-opportunity")).toBe(false);
  });

  it("debounces entity search behind a minimum query length", () => {
    expect(shouldRunEntitySearch("")).toBe(false);
    expect(shouldRunEntitySearch("a")).toBe(false);
    expect(shouldRunEntitySearch("ai")).toBe(true);
  });

  it("groups entity hits by type", () => {
    const hits: CommandEntityHit[] = [
      { id: "use_case:1", type: "use_case", label: "A", to: "/use-cases/a" },
      { id: "board:1", type: "board", label: "B", to: "/boards/1" },
      { id: "use_case:2", type: "use_case", label: "C", to: "/use-cases/c" },
    ];
    const grouped = groupEntityHits(hits);
    expect(grouped.use_case?.map((h) => h.label)).toEqual(["A", "C"]);
    expect(grouped.board?.map((h) => h.label)).toEqual(["B"]);
    expect(grouped.opportunity).toBeUndefined();
  });

  it("filters titled and named entities without leaking non-matches", () => {
    const titled = filterTitledEntitiesForCommand(
      [
        { id: "1", title: "Claims automation" },
        { id: "2", title: "Fleet routing" },
      ],
      "claim",
      { type: "opportunity", toFor: (r) => `/opportunities/${r.id}` },
    );
    expect(titled).toHaveLength(1);
    expect(titled[0]?.label).toBe("Claims automation");

    const named = filterNamedEntitiesForCommand(
      [
        { id: "p1", name: "Q3 Quick Wins" },
        { id: "p2", name: "Strategic bets" },
      ],
      "quick",
      { type: "portfolio", toFor: () => "/portfoliox" },
    );
    expect(named.map((h) => h.label)).toEqual(["Q3 Quick Wins"]);
  });

  it("filters pattern seeds client-side", () => {
    const seeds: PatternTemplateSeed[] = [
      {
        slug: "genai-enterprise",
        title: "Enterprise GenAI drafting with human approval",
        summary: "Draft documents with review",
        businessProblem: "Drafting load",
        templateKind: "genai",
        sectorContext: "enterprise",
        kpiCategories: [],
        controlThemes: [],
        licenseUsageNote: "",
        provenanceNote: "",
      },
      {
        slug: "vision-sme",
        title: "SME visual inspection",
        summary: "Camera QC",
        businessProblem: "Defects",
        templateKind: "computer_vision",
        sectorContext: "sme",
        kpiCategories: [],
        controlThemes: [],
        licenseUsageNote: "",
        provenanceNote: "",
      },
    ];
    const hits = filterPatternsForCommand(seeds, "genai");
    expect(hits).toHaveLength(1);
    expect(hits[0]?.to).toBe("/patterns");
    expect(filterPatternsForCommand(seeds, "zzzz")).toEqual([]);
  });

  it("picks OS-aware shortcut labels", () => {
    expect(commandPaletteShortcutLabel("MacIntel")).toBe("⌘K");
    expect(commandPaletteShortcutLabel("Win32")).toBe("Ctrl+K");
  });

  it("collects unique static targets", () => {
    const targets = collectCommandPaletteTargets();
    expect(targets).toContain("/dashboard");
    expect(targets).toContain("/opportunities/new");
    expect(targets).toContain("/portfoliox");
    expect(new Set(targets).size).toBe(targets.length);
  });
});
