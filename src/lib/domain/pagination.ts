/**
 * Bounded pagination primitives shared by the personal-workspace repositories.
 *
 * Two defects this module exists to prevent:
 *
 * 1. Unbounded list reads. Every list query must carry an explicit page size
 *    so a large workspace cannot pull its entire table into the browser.
 * 2. Unbounded `.in()` hydration. Follow-up reads that resolve ids (use-case
 *    content, join tables) must be chunked and capped, otherwise a single page
 *    can produce a URL with thousands of ids and a query that scans the world.
 *
 * Cursors are keyset, not offset: a primary sort column plus a unique
 * tiebreaker, so pages stay stable while rows are inserted or removed.
 */

/** Default rows per page for personal-workspace lists. */
export const DEFAULT_PAGE_SIZE = 50;

/** Hard upper bound on a single page, regardless of what a caller asks for. */
export const MAX_PAGE_SIZE = 200;

/** Ids per `.in(...)` hydration request. Keeps request URLs bounded. */
export const HYDRATION_CHUNK_SIZE = 100;

/** Maximum hydration requests per list read (chunks beyond this are dropped). */
export const MAX_HYDRATION_CHUNKS = 10;

export interface Page<TRow, TCursor> {
  rows: TRow[];
  /** Cursor for the next page, or null when the list is exhausted. */
  nextCursor: TCursor | null;
  hasMore: boolean;
  pageSize: number;
}

/** Clamps a requested page size into `[1, MAX_PAGE_SIZE]`. */
export function clampPageSize(requested?: number | null): number {
  if (typeof requested !== "number" || !Number.isFinite(requested)) return DEFAULT_PAGE_SIZE;
  const size = Math.floor(requested);
  if (size < 1) return 1;
  if (size > MAX_PAGE_SIZE) return MAX_PAGE_SIZE;
  return size;
}

/**
 * PostgREST `or=` expression for a keyset cursor on a descending primary column
 * with an ascending unique tiebreaker.
 *
 * `created_at.lt.X,and(created_at.eq.X,id.gt.Y)`
 */
export function keysetOrFilter(
  sortColumn: string,
  sortValue: string,
  tieColumn: string,
  tieValue: string,
): string {
  return `${sortColumn}.lt.${sortValue},and(${sortColumn}.eq.${sortValue},${tieColumn}.gt.${tieValue})`;
}

/**
 * Splits ids into bounded chunks. Chunks past `MAX_HYDRATION_CHUNKS` are
 * dropped and reported through `truncated` so callers can tell the user their
 * view is partial rather than silently rendering holes.
 */
export function chunkIds(
  ids: string[],
  chunkSize: number = HYDRATION_CHUNK_SIZE,
  maxChunks: number = MAX_HYDRATION_CHUNKS,
): { chunks: string[][]; truncated: boolean } {
  const unique = [...new Set(ids)];
  const size = Math.max(1, Math.floor(chunkSize));
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += size) {
    chunks.push(unique.slice(i, i + size));
  }
  if (chunks.length <= maxChunks) return { chunks, truncated: false };
  return { chunks: chunks.slice(0, maxChunks), truncated: true };
}

/**
 * Turns an over-fetched result (`pageSize + 1` rows) into a page.
 * The extra row is the "is there more?" probe and is never returned.
 */
export function buildPage<TRow, TCursor>(
  fetched: TRow[],
  pageSize: number,
  cursorOf: (row: TRow) => TCursor,
): Page<TRow, TCursor> {
  const hasMore = fetched.length > pageSize;
  const rows = hasMore ? fetched.slice(0, pageSize) : fetched;
  const last = rows.length > 0 ? rows[rows.length - 1] : undefined;
  return {
    rows,
    hasMore,
    nextCursor: hasMore && last !== undefined ? cursorOf(last) : null,
    pageSize,
  };
}

export interface CollectResult<TRow> {
  rows: TRow[];
  /** True when the cap stopped the walk before the list was exhausted. */
  truncated: boolean;
  /** Number of page requests actually issued. */
  requests: number;
}

/**
 * Walks pages until the list is exhausted or `maxRows` is reached, whichever
 * comes first. This is what keeps the legacy "give me everything" callers
 * bounded: worst case is `ceil(maxRows / pageSize)` requests, never one giant
 * unbounded read.
 */
export async function collectPages<TRow, TCursor>(
  fetchPage: (cursor: TCursor | null) => Promise<Page<TRow, TCursor>>,
  maxRows: number,
): Promise<CollectResult<TRow>> {
  const rows: TRow[] = [];
  let cursor: TCursor | null = null;
  let requests = 0;
  for (;;) {
    const page = await fetchPage(cursor);
    requests += 1;
    for (const row of page.rows) {
      if (rows.length >= maxRows) return { rows, truncated: true, requests };
      rows.push(row);
    }
    if (!page.hasMore || page.nextCursor === null) {
      return { rows, truncated: false, requests };
    }
    if (rows.length >= maxRows) return { rows, truncated: true, requests };
    cursor = page.nextCursor;
  }
}