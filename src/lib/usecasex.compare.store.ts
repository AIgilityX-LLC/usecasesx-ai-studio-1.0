// Tiny localStorage-backed compare selection store with subscription.
// No deps — useSyncExternalStore compatible.

const KEY = "usecasex.compare.slugs";
const MAX = 4;
type Listener = () => void;
const listeners = new Set<Listener>();

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v.filter((x) => typeof x === "string") as string[]).slice(0, MAX) : [];
  } catch {
    return [];
  }
}

function write(next: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(next.slice(0, MAX)));
  listeners.forEach((l) => l());
}

export const compareStore = {
  MAX,
  get: read,
  subscribe(l: Listener) {
    listeners.add(l);
    if (typeof window !== "undefined") {
      const onStorage = (e: StorageEvent) => {
        if (e.key === KEY) l();
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(l);
        window.removeEventListener("storage", onStorage);
      };
    }
    return () => listeners.delete(l);
  },
  has(slug: string) {
    return read().includes(slug);
  },
  toggle(slug: string) {
    const cur = read();
    if (cur.includes(slug)) write(cur.filter((s) => s !== slug));
    else if (cur.length < MAX) write([...cur, slug]);
  },
  add(slug: string) {
    const cur = read();
    if (!cur.includes(slug) && cur.length < MAX) write([...cur, slug]);
  },
  remove(slug: string) {
    write(read().filter((s) => s !== slug));
  },
  clear() {
    write([]);
  },
};

import { useSyncExternalStore } from "react";
export function useCompare() {
  return useSyncExternalStore(compareStore.subscribe, compareStore.get, () => []);
}
