// localStorage-backed saved search presets for the Explore page.
const KEY = "usecasex.savedPresets";

export interface SavedPreset {
  id: string;
  name: string;
  search: Record<string, unknown>;
  createdAt: number;
}

type Listener = () => void;
const listeners = new Set<Listener>();

function read(): SavedPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as SavedPreset[]) : [];
  } catch {
    return [];
  }
}

let cachedSnapshot: SavedPreset[] | null = null;
function getSnapshot(): SavedPreset[] {
  if (cachedSnapshot === null) cachedSnapshot = read();
  return cachedSnapshot;
}
function invalidate() {
  cachedSnapshot = null;
}

function write(next: SavedPreset[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(next));
  invalidate();
  listeners.forEach((l) => l());
}

export const presetsStore = {
  get: read,
  subscribe(l: Listener) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  save(name: string, search: Record<string, unknown>) {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const preset: SavedPreset = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: trimmed,
      search,
      createdAt: Date.now(),
    };
    write([preset, ...read()].slice(0, 50));
    return preset;
  },
  remove(id: string) {
    write(read().filter((p) => p.id !== id));
  },
  rename(id: string, name: string) {
    write(read().map((p) => (p.id === id ? { ...p, name } : p)));
  },
};

import { useSyncExternalStore } from "react";
export function useSavedPresets() {
  return useSyncExternalStore(presetsStore.subscribe, getSnapshot, () => [] as SavedPreset[]);
}

// Built-in shareable presets shown in the bar above results.
export const BUILTIN_PRESETS: {
  label: string;
  description: string;
  search: Record<string, unknown>;
}[] = [
  {
    label: "Public Sector AI",
    description: "Government, defense, education, healthcare",
    search: { sectors: ["public"] },
  },
  {
    label: "High Impact, Low Risk",
    description: "High value · low risk · short TTV",
    search: { valuePotential: ["High"], riskLevel: ["Low"], timeToValue: ["Short"] },
  },
  {
    label: "Agentic AI",
    description: "Agent + LLM-powered use cases",
    search: { tags: ["agentic-ai"] },
  },
  {
    label: "Defense Quick Wins",
    description: "Defense + short/medium TTV",
    search: { industries: ["defense"], timeToValue: ["Short", "Medium"] },
  },
  {
    label: "Healthcare Clinical",
    description: "Clinical + radiology",
    search: { industries: ["healthcare"], tags: ["clinical"] },
  },
  {
    label: "Compliance & Privacy",
    description: "Regulatory, privacy, compliance",
    search: { tags: ["compliance"] },
  },
  { label: "Newest", description: "Sorted by publish date", search: { sort: "newest" } },
];
