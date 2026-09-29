/**
 * Studio canvas storage path helpers (bucket: studio-canvas).
 * Path: studio-canvas/{workspace_id}/{use_case_id}/...
 */

export const STUDIO_CANVAS_BUCKET = "studio-canvas" as const;

export function studioCanvasObjectPath(
  workspaceId: string,
  useCaseId: string,
  fileName: string,
): string {
  const safe = fileName.replace(/[/\\]/g, "_").trim() || "file";
  return `${workspaceId}/${useCaseId}/${safe}`;
}

export function parseStudioCanvasPath(objectName: string): {
  workspaceId: string;
  useCaseId: string;
} | null {
  const parts = objectName.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  return { workspaceId: parts[0]!, useCaseId: parts[1]! };
}
