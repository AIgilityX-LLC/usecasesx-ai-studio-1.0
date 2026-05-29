// Local persistence for Use Case Development Studio drafts created via AI.
// Mock-first; localStorage-backed. Independent of the catalog-based saved store.
import { useCallback, useEffect, useState } from "react";
import type { StudioDraft, StudioProvider } from "./usecasex.studio.functions";

export interface StudioSavedDraft {
  id: string;
  createdAt: string;
  organization: string;
  industry?: string;
  objective: string;
  provider: StudioProvider;
  model: string;
  draft: StudioDraft;
}

const KEY = "usecasex.studio.drafts.v1";
const EVT = "usecasex-studio-change";

function read(): StudioSavedDraft[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StudioSavedDraft[]) : [];
  } catch {
    return [];
  }
}

function write(items: StudioSavedDraft[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(EVT));
}

export function useStudioDrafts() {
  const [items, setItems] = useState<StudioSavedDraft[]>(() => read());

  useEffect(() => {
    const sync = () => setItems(read());
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const save = useCallback((d: Omit<StudioSavedDraft, "id" | "createdAt">) => {
    const entry: StudioSavedDraft = {
      ...d,
      id: `sd-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
    };
    write([entry, ...read()]);
    return entry;
  }, []);

  const remove = useCallback((id: string) => {
    write(read().filter((x) => x.id !== id));
  }, []);

  return { items, save, remove };
}
