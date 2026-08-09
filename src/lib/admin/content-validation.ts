/**
 * Global catalogue content validation.
 *
 * Pure functions — no I/O — so both the authoring form and the CSV importer
 * enforce exactly the same rules, and both can be unit-tested.
 */

export type LifecycleTarget = "draft" | "review" | "published";

export interface ValidationIssue {
  field: string;
  message: string;
  severity: "error" | "warning";
}

export interface UseCaseDraftInput {
  title?: string | null;
  slug?: string | null;
  summary?: string | null;
  businessProblem?: string | null;
  aiSolution?: string | null;
  industry?: string | null;
  businessFunction?: string | null;
  aiType?: string | null;
  valuePotential?: string | null;
  complexity?: string | null;
  riskLevel?: string | null;
  sourceStatus?: string | null;
  qualityStatus?: string | null;
  provenance?: string | null;
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Source of the record — where the content came from. */
export const SOURCE_STATUSES = ["curated", "partner", "imported", "community"] as const;
/** Editorial quality gate for global content. */
export const QUALITY_STATUSES = ["unverified", "reviewed", "verified"] as const;

export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function blank(value: string | null | undefined): boolean {
  return !value || value.trim().length === 0;
}

/**
 * Validates a global use case for a target lifecycle stage.
 * Draft is permissive; review adds narrative requirements; published is strict.
 */
export function validateUseCaseDraft(
  input: UseCaseDraftInput,
  target: LifecycleTarget = "draft",
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const err = (field: string, message: string) =>
    issues.push({ field, message, severity: "error" });
  const warn = (field: string, message: string) =>
    issues.push({ field, message, severity: "warning" });

  if (blank(input.title)) err("title", "Title is required.");
  else if ((input.title as string).trim().length < 6)
    err("title", "Title must be at least 6 characters.");
  else if ((input.title as string).length > 160)
    err("title", "Title must be 160 characters or fewer.");

  if (blank(input.slug)) err("slug", "Slug is required.");
  else if (!SLUG_PATTERN.test((input.slug as string).trim()))
    err("slug", "Slug must be lowercase words separated by single hyphens.");

  if (blank(input.summary)) err("summary", "Short description is required.");
  else if ((input.summary as string).trim().length < 40)
    warn("summary", "Short description is very short; aim for at least 40 characters.");

  if (target === "review" || target === "published") {
    if (blank(input.businessProblem)) err("businessProblem", "Business problem is required.");
    if (blank(input.aiSolution)) err("aiSolution", "AI solution concept is required.");
    if (blank(input.industry)) err("industry", "Primary industry is required.");
    if (blank(input.businessFunction))
      err("businessFunction", "Primary business function is required.");
  }

  if (target === "published") {
    if (blank(input.aiType)) err("aiType", "AI capability is required before publishing.");
    if (blank(input.valuePotential))
      err("valuePotential", "Value potential is required before publishing.");
    if (blank(input.complexity)) err("complexity", "Complexity is required before publishing.");
    if (blank(input.riskLevel)) err("riskLevel", "Risk level is required before publishing.");
    if (blank(input.provenance))
      err("provenance", "Provenance (where this content came from) is required before publishing.");
    if (input.qualityStatus === "unverified")
      err("qualityStatus", "Quality status must be reviewed or verified before publishing.");
  }

  if (input.sourceStatus && !SOURCE_STATUSES.includes(input.sourceStatus as never))
    err("sourceStatus", `Source status must be one of: ${SOURCE_STATUSES.join(", ")}.`);
  if (input.qualityStatus && !QUALITY_STATUSES.includes(input.qualityStatus as never))
    err("qualityStatus", `Quality status must be one of: ${QUALITY_STATUSES.join(", ")}.`);

  return issues;
}

export function hasBlockingIssues(issues: ValidationIssue[]): boolean {
  return issues.some((i) => i.severity === "error");
}

/** True when the slug already belongs to a different record. */
export function isDuplicateSlug(
  slug: string,
  existingBySlug: Record<string, string>,
  currentId?: string,
): boolean {
  const owner = existingBySlug[slug.trim().toLowerCase()];
  return Boolean(owner) && owner !== currentId;
}

/** Suggests the next free slug, e.g. `foo` → `foo-2`. */
export function nextAvailableSlug(base: string, existingBySlug: Record<string, string>): string {
  const root = slugify(base) || "use-case";
  if (!existingBySlug[root]) return root;
  for (let n = 2; n < 500; n += 1) {
    const candidate = `${root}-${n}`;
    if (!existingBySlug[candidate]) return candidate;
  }
  return `${root}-${Date.now()}`;
}
