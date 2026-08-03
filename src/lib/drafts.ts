/**
 * Shared local-draft persistence for UseCasesX™ authoring surfaces.
 *
 * Every surface where a user types before the server confirms a save keeps a
 * device-local copy so a refresh, an expired session or a network failure can
 * never look like a successful save. The stored envelope carries:
 *   • `savedAt`       — when the local copy was written
 *   • `baseUpdatedAt` — the server row's `updated_at` the edit started from
 *
 * `baseUpdatedAt` is what makes conflict detection possible: if the server row
 * moved on after the local draft was based on it, another session (or another
 * member of the workspace) saved in the meantime and the user must choose.
 *
 * Client-safe: no transport, no secrets.
 */

export type LocalDraft<T> = {
  data: T;
  savedAt: string;
  baseUpdatedAt?: string | null;
};

export type AutosaveState =
  | "idle" // nothing typed yet
  | "unsaved" // edits pending
  | "saving"
  | "saved"
  | "local" // kept on this device only (signed out / offline)
  | "error";

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readDraft<T>(key: string): LocalDraft<T> | null {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LocalDraft<T>> & Record<string, unknown>;
    // Tolerate the pre-envelope shape (a bare payload) so older drafts survive.
    const data = (parsed.data ?? (parsed as unknown)) as T;
    if (data === null || typeof data !== "object") return null;
    return {
      data,
      savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : "",
      baseUpdatedAt: typeof parsed.baseUpdatedAt === "string" ? parsed.baseUpdatedAt : null,
    };
  } catch {
    return null;
  }
}

export function writeDraft<T>(key: string, data: T, baseUpdatedAt?: string | null): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(
      key,
      JSON.stringify({
        data,
        savedAt: new Date().toISOString(),
        baseUpdatedAt: baseUpdatedAt ?? null,
      } satisfies LocalDraft<T>),
    );
  } catch {
    /* storage full or blocked — the server save remains the source of truth */
  }
}

export function clearDraft(key: string): void {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(key);
  } catch {
    /* nothing to do */
  }
}

/**
 * True when the server row changed after the local draft was written, i.e.
 * restoring the draft would overwrite someone else's newer save.
 */
export function hasConflict(
  draft: Pick<LocalDraft<unknown>, "savedAt" | "baseUpdatedAt"> | null | undefined,
  serverUpdatedAt: string | null | undefined,
): boolean {
  if (!draft || !serverUpdatedAt) return false;
  const server = Date.parse(serverUpdatedAt);
  if (!Number.isFinite(server)) return false;
  const base = draft.baseUpdatedAt ? Date.parse(draft.baseUpdatedAt) : NaN;
  if (Number.isFinite(base) && server > base) return true;
  const local = Date.parse(draft.savedAt);
  return Number.isFinite(local) && server > local;
}

/** "just now" / "12 minutes ago" / "3 Aug, 09:14" for recovery banners. */
export function describeSavedAt(iso: string | null | undefined): string {
  const t = iso ? Date.parse(iso) : NaN;
  if (!Number.isFinite(t)) return "earlier";
  const mins = Math.round((Date.now() - t) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  return new Date(t).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
