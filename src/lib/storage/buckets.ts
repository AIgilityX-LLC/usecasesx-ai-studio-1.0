/** Bucket ids shared by client and server code. */
export const EVIDENCE_BUCKET = "benefit-evidence" as const;
export const AVATAR_BUCKET = "avatars" as const;
/** Supporting documents attached to Sovereign Public Value Canvas™ sections. */
export const CANVAS_BUCKET = "canvas-documents" as const;
/** Studio Canvas V2 attachments — path scoped as {workspace_id}/{use_case_id}/… */
export { STUDIO_CANVAS_BUCKET } from "./studio-canvas";
/** Reusable evidence service files — path {workspace_id}/{subject_type}/{subject_id}/… */
export const EVIDENCE_ITEMS_BUCKET = "evidence-items" as const;
