/**
 * Queue filtering and bulk-selection rules.
 *
 * These decide what an operator sees and what a bulk action is allowed to
 * touch, so they are tested without a browser.
 */
import { describe, expect, it } from "vitest";

import {
  applyQueueFilters,
  commonNextStatuses,
  EMPTY_FILTERS,
  type QueueFilters,
} from "@/components/handoffs/HandoffQueue";
import type { HandoffRequest, HandoffStatus, HandoffTarget } from "@/lib/handoffs/handoff.model";

const ME = "11111111-1111-1111-1111-111111111111";
const OTHER = "22222222-2222-2222-2222-222222222222";

function request(overrides: Partial<HandoffRequest> = {}): HandoffRequest {
  return {
    id: overrides.id ?? "r1",
    workspaceId: "w1",
    organizationId: null,
    target: (overrides.target ?? "sarpi") as HandoffTarget,
    requestType: overrides.requestType ?? "readiness_assessment",
    status: (overrides.status ?? "queued") as HandoffStatus,
    statusNote: null,
    title: overrides.title ?? "Readiness review",
    summary: overrides.summary ?? "Data and process readiness",
    sensitivity: "internal",
    deliveryMode: "internal_queue",
    payload: {},
    sourceRefs: overrides.sourceRefs ?? [
      { type: "use_case", id: "uc1", label: "Claims triage", version: "v1" },
    ],
    sourceVersion: overrides.sourceVersion ?? {
      fingerprint: "abc123",
      capturedAt: "2026-01-01T00:00:00.000Z",
      refs: [{ type: "use_case", id: "uc1", version: "v1" }],
    },
    consent: null,
    ownerUserId: overrides.ownerUserId ?? null,
    requestedBy: ME,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as HandoffRequest;
}

const filters = (overrides: Partial<QueueFilters> = {}): QueueFilters => ({
  ...EMPTY_FILTERS,
  status: "all",
  ...overrides,
});

describe("applyQueueFilters", () => {
  const rows = [
    request({ id: "a", target: "sarpi", status: "queued", ownerUserId: ME }),
    request({
      id: "b",
      target: "advisorx",
      status: "completed",
      title: "Board narrative",
      ownerUserId: OTHER,
      sourceVersion: { fingerprint: "zzz999", capturedAt: "", refs: [] },
    }),
    request({ id: "c", target: "sarpi", status: "declined", title: "Stale ask" }),
  ];

  it("defaults to open requests only", () => {
    const open = applyQueueFilters(rows, EMPTY_FILTERS, ME).map((r) => r.id);
    expect(open).toEqual(["a"]);
  });

  it("filters by target", () => {
    expect(applyQueueFilters(rows, filters({ target: "advisorx" }), ME).map((r) => r.id)).toEqual([
      "b",
    ]);
  });

  it("filters by an exact status", () => {
    expect(applyQueueFilters(rows, filters({ status: "declined" }), ME).map((r) => r.id)).toEqual([
      "c",
    ]);
  });

  it("separates my requests, unassigned requests and a named owner", () => {
    expect(applyQueueFilters(rows, filters({ owner: "me" }), ME).map((r) => r.id)).toEqual(["a"]);
    expect(applyQueueFilters(rows, filters({ owner: "unassigned" }), ME).map((r) => r.id)).toEqual([
      "c",
    ]);
    expect(applyQueueFilters(rows, filters({ owner: OTHER }), ME).map((r) => r.id)).toEqual(["b"]);
  });

  it("matches a source version fingerprint by prefix, case-insensitively", () => {
    expect(applyQueueFilters(rows, filters({ sourceVersion: "ZZZ" }), ME).map((r) => r.id)).toEqual(
      ["b"],
    );
  });

  it("searches title, summary, request type and reference labels", () => {
    expect(applyQueueFilters(rows, filters({ search: "board" }), ME).map((r) => r.id)).toEqual([
      "b",
    ]);
    expect(applyQueueFilters(rows, filters({ search: "claims triage" }), ME).length).toBe(3);
    expect(applyQueueFilters(rows, filters({ search: "nothing here" }), ME)).toEqual([]);
  });

  it("combines filters conjunctively", () => {
    const result = applyQueueFilters(
      rows,
      filters({ target: "sarpi", status: "queued", owner: "me" }),
      ME,
    );
    expect(result.map((r) => r.id)).toEqual(["a"]);
  });
});

describe("commonNextStatuses", () => {
  it("offers nothing for an empty selection", () => {
    expect(commonNextStatuses([])).toEqual([]);
  });

  it("offers only moves legal for every selected request", () => {
    const mixed = [
      request({ id: "a", status: "queued" }),
      request({ id: "b", status: "accepted" }),
    ];
    const shared = commonNextStatuses(mixed);
    expect(shared).not.toContain("in_review");
    for (const status of shared) {
      expect([
        "completed",
        "cancelled",
        "declined",
        "dispatched",
        "in_review",
        "accepted",
      ]).toContain(status);
    }
  });

  it("offers a terminal request nothing", () => {
    expect(commonNextStatuses([request({ status: "completed" })])).toEqual([]);
  });
});
