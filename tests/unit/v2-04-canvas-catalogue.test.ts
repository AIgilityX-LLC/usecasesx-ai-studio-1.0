/**
 * V2-04 catalogue contracts — no database required.
 */
import { describe, expect, it } from "bun:test";
import {
  CANVAS_SECTION_KEYS,
  CANVAS_SECTION_LABEL,
  isCanvasSectionKey,
} from "@/lib/lifecycle/canvas-sections";
import { parseStudioCanvasPath, studioCanvasObjectPath } from "@/lib/storage/studio-canvas";

describe("Canvas V2 section catalogue", () => {
  it("exposes exactly 13 FR-03 sections", () => {
    expect(CANVAS_SECTION_KEYS).toHaveLength(13);
    for (const key of CANVAS_SECTION_KEYS) {
      expect(CANVAS_SECTION_LABEL[key].length).toBeGreaterThan(8);
      expect(isCanvasSectionKey(key)).toBe(true);
    }
  });

  it("rejects unknown keys", () => {
    expect(isCanvasSectionKey("not_a_section")).toBe(false);
  });
});

describe("studio-canvas storage paths", () => {
  it("scopes objects under workspace then use case", () => {
    const path = studioCanvasObjectPath("ws-1", "uc-2", "note.pdf");
    expect(path).toBe("ws-1/uc-2/note.pdf");
    expect(parseStudioCanvasPath(path)).toEqual({ workspaceId: "ws-1", useCaseId: "uc-2" });
  });

  it("strips path separators from file names", () => {
    expect(studioCanvasObjectPath("ws", "uc", "a/b\\c.txt")).toBe("ws/uc/a_b_c.txt");
  });
});
