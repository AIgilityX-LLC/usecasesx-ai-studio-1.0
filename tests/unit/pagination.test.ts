/**
 * Regression tests for the bounded pagination primitives that back
 * `listSavedForUser` and `listPortfoliosForUser`.
 *
 * The defect these guard against is query fan-out: a list read that grows with
 * the workspace, either by returning every row in one request or by pushing an
 * unbounded id list into a follow-up `.in(...)` hydration query.
 */
import { describe, expect, it } from "bun:test";
import {
  DEFAULT_PAGE_SIZE,
  HYDRATION_CHUNK_SIZE,
  MAX_HYDRATION_CHUNKS,
  MAX_PAGE_SIZE,
  buildPage,
  chunkIds,
  clampPageSize,
  collectPages,
  keysetOrFilter,
  type Page,
} from "@/lib/domain/pagination";

describe("clampPageSize", () => {
  it("falls back to the default for missing or non-numeric input", () => {
    expect(clampPageSize(undefined)).toBe(DEFAULT_PAGE_SIZE);
    expect(clampPageSize(null)).toBe(DEFAULT_PAGE_SIZE);
    expect(clampPageSize(Number.NaN)).toBe(DEFAULT_PAGE_SIZE);
  });

  it("never returns an unbounded page size", () => {
    expect(clampPageSize(100_000)).toBe(MAX_PAGE_SIZE);
    expect(clampPageSize(Number.POSITIVE_INFINITY)).toBe(DEFAULT_PAGE_SIZE);
  });

  it("keeps at least one row and floors fractions", () => {
    expect(clampPageSize(0)).toBe(1);
    expect(clampPageSize(-25)).toBe(1);
    expect(clampPageSize(10.7)).toBe(10);
  });
});

describe("keysetOrFilter", () => {
  it("builds a descending keyset filter with a unique tiebreaker", () => {
    expect(keysetOrFilter("saved_at", "2026-01-02T00:00:00Z", "use_case_id", "uc-1")).toBe(
      "saved_at.lt.2026-01-02T00:00:00Z,and(saved_at.eq.2026-01-02T00:00:00Z,use_case_id.gt.uc-1)",
    );
  });
});

describe("chunkIds", () => {
  it("deduplicates before chunking so repeated ids cost nothing", () => {
    const { chunks, truncated } = chunkIds(["a", "a", "b", "b", "c"], 2);
    expect(chunks).toEqual([["a", "b"], ["c"]]);
    expect(truncated).toBe(false);
  });

  it("caps the number of hydration requests and reports truncation", () => {
    const ids = Array.from({ length: HYDRATION_CHUNK_SIZE * (MAX_HYDRATION_CHUNKS + 5) }, (_, i) =>
      String(i),
    );
    const { chunks, truncated } = chunkIds(ids);
    expect(chunks.length).toBe(MAX_HYDRATION_CHUNKS);
    expect(truncated).toBe(true);
    for (const chunk of chunks) expect(chunk.length).toBeLessThanOrEqual(HYDRATION_CHUNK_SIZE);
  });

  it("returns nothing for an empty id list", () => {
    expect(chunkIds([]).chunks).toEqual([]);
  });
});

describe("buildPage", () => {
  const cursorOf = (row: { id: string }) => row.id;

  it("drops the over-fetched probe row and exposes a cursor", () => {
    const fetched = [{ id: "1" }, { id: "2" }, { id: "3" }];
    const page = buildPage(fetched, 2, cursorOf);
    expect(page.rows.map((r) => r.id)).toEqual(["1", "2"]);
    expect(page.hasMore).toBe(true);
    expect(page.nextCursor).toBe("2");
  });

  it("reports the end of the list without a cursor", () => {
    const page = buildPage([{ id: "1" }], 2, cursorOf);
    expect(page.hasMore).toBe(false);
    expect(page.nextCursor).toBeNull();
  });

  it("handles an empty page", () => {
    const page = buildPage([] as { id: string }[], 25, cursorOf);
    expect(page.rows).toEqual([]);
    expect(page.hasMore).toBe(false);
    expect(page.nextCursor).toBeNull();
  });
});

/**
 * Large-workspace load simulation.
 *
 * A fake keyset-paginated table stands in for `saved_use_cases` /
 * `portfolios`. The assertions are about query shape, not data: request count
 * must stay proportional to the cap, and no single request may ask for more
 * than one bounded page.
 */
function makeFakeTable(totalRows: number) {
  const rows = Array.from({ length: totalRows }, (_, i) => ({
    id: String(i).padStart(6, "0"),
    sortKey: `2026-01-01T00:00:${String(i % 60).padStart(2, "0")}Z`,
  }));
  const requestedLimits: number[] = [];

  const fetchPage = async (
    cursor: string | null,
    pageSize: number,
  ): Promise<Page<{ id: string; sortKey: string }, string>> => {
    requestedLimits.push(pageSize + 1);
    const start = cursor === null ? 0 : rows.findIndex((r) => r.id === cursor) + 1;
    const slice = rows.slice(start, start + pageSize + 1);
    return buildPage(slice, pageSize, (row) => row.id);
  };

  return { fetchPage, requestedLimits };
}

describe("collectPages under large-workspace load", () => {
  it("walks 5,000 rows in bounded pages and stops at the cap", async () => {
    const { fetchPage, requestedLimits } = makeFakeTable(5_000);
    const pageSize = 50;
    const cap = 500;

    const result = await collectPages((cursor: string | null) => fetchPage(cursor, pageSize), cap);

    expect(result.rows.length).toBe(cap);
    expect(result.truncated).toBe(true);
    // Bounded fan-out: cap / pageSize requests, not one request per row.
    expect(result.requests).toBe(cap / pageSize);
    for (const limit of requestedLimits) expect(limit).toBeLessThanOrEqual(pageSize + 1);
  });

  it("returns every row without truncation when the workspace is small", async () => {
    const { fetchPage } = makeFakeTable(37);
    const result = await collectPages((cursor: string | null) => fetchPage(cursor, 25), 500);
    expect(result.rows.length).toBe(37);
    expect(result.truncated).toBe(false);
    expect(result.requests).toBe(2);
  });

  it("issues exactly one request for an empty list", async () => {
    const { fetchPage } = makeFakeTable(0);
    const result = await collectPages((cursor: string | null) => fetchPage(cursor, 50), 500);
    expect(result.rows).toEqual([]);
    expect(result.requests).toBe(1);
    expect(result.truncated).toBe(false);
  });

  it("never revisits a row across page boundaries", async () => {
    const { fetchPage } = makeFakeTable(1_000);
    const result = await collectPages((cursor: string | null) => fetchPage(cursor, 40), 1_000);
    const ids = new Set(result.rows.map((r) => r.id));
    expect(ids.size).toBe(result.rows.length);
    expect(result.rows.length).toBe(1_000);
  });

  it("stops at the cap even when the page size exceeds it", async () => {
    const { fetchPage } = makeFakeTable(5_000);
    const result = await collectPages((cursor: string | null) => fetchPage(cursor, 200), 150);
    expect(result.rows.length).toBe(150);
    expect(result.truncated).toBe(true);
    expect(result.requests).toBe(1);
  });
});
