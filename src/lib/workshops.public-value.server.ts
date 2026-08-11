/**
 * Sovereign Public Value Canvas™ persistence (server-only).
 *
 * Reads and writes run through the caller's authenticated client, so the
 * workshop policies are the security boundary: members read, facilitators
 * write.
 */

import {
  canvasCompleteness,
  emptyCanvasSections,
  normalizeCanvasSections,
  type CanvasSections,
  type PublicValueCanvas,
} from "./workshops.public-value";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;

export async function getPublicValueCanvas(
  supabase: Client,
  workshopId: string,
): Promise<PublicValueCanvas> {
  const { data, error } = await supabase
    .from("workshop_public_value_canvas")
    .select("workshop_id, sections, completeness, updated_by, updated_at")
    .eq("workshop_id", workshopId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    const sections = emptyCanvasSections();
    return {
      workshopId,
      sections,
      completeness: 0,
      updatedBy: null,
      updatedAt: null,
    };
  }
  const sections = normalizeCanvasSections(data.sections);
  return {
    workshopId,
    sections,
    completeness: Number(data.completeness ?? canvasCompleteness(sections)),
    updatedBy: data.updated_by ?? null,
    updatedAt: data.updated_at ?? null,
  };
}

export async function savePublicValueCanvas(
  supabase: Client,
  input: { workshopId: string; sections: CanvasSections; userId: string },
): Promise<PublicValueCanvas> {
  const sections = normalizeCanvasSections(input.sections);
  const { data, error } = await supabase
    .from("workshop_public_value_canvas")
    .upsert(
      {
        workshop_id: input.workshopId,
        sections,
        completeness: canvasCompleteness(sections),
        updated_by: input.userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workshop_id" },
    )
    .select("workshop_id, sections, completeness, updated_by, updated_at")
    .single();
  if (error) throw new Error(error.message);
  return {
    workshopId: input.workshopId,
    sections: normalizeCanvasSections(data.sections),
    completeness: Number(data.completeness ?? 0),
    updatedBy: data.updated_by ?? null,
    updatedAt: data.updated_at ?? null,
  };
}
