import { describe, expect, it } from "vitest";

import {
  ACTIVITY_CATEGORIES,
  ACTIVITY_CATEGORY_LABELS,
  activityCategory,
} from "@/lib/collab";

describe("activity timeline categories", () => {
  it("buckets export and report events into the exports filter", () => {
    expect(activityCategory("export.generated")).toBe("exports");
    expect(activityCategory("report.generated")).toBe("exports");
  });

  it("keeps existing buckets intact", () => {
    expect(activityCategory("collab.comment.created")).toBe("notes");
    expect(activityCategory("collab.review_status.changed")).toBe("review");
    expect(activityCategory("collab.assignment.created")).toBe("people");
    expect(activityCategory("membership.removed")).toBe("people");
    expect(activityCategory("entity.created")).toBe("other");
  });

  it("labels every category, including exports", () => {
    for (const category of ACTIVITY_CATEGORIES) {
      expect(ACTIVITY_CATEGORY_LABELS[category]?.length).toBeGreaterThan(0);
    }
    expect(ACTIVITY_CATEGORIES).toContain("exports");
  });
});
