/**
 * Canonical validation schemas for launch-critical domain input.
 *
 * Components and server functions both parse through these so a rule only ever
 * lives in one place. Zod failures are converted to a `DomainError("validation")`
 * by `parseInput`, keeping user-facing copy consistent.
 */

import { z } from "zod";
import { DomainError } from "./errors";

export const uuidSchema = z.string().uuid({ message: "Invalid identifier" });

export const slugSchema = z
  .string()
  .trim()
  .min(1, { message: "Slug is required" })
  .max(160, { message: "Slug is too long" });

export const prioritySchema = z.enum(["Low", "Medium", "High", "Strategic"]);

export const scoreDimensionsSchema = z.object({
  strategicAlignment: z.number().int().min(0).max(10),
  valuePotential: z.number().int().min(0).max(10),
  feasibility: z.number().int().min(0).max(10),
  timeToValue: z.number().int().min(0).max(10),
  riskManageability: z.number().int().min(0).max(10),
  governanceReadiness: z.number().int().min(0).max(10),
});

export const savedUseCasePatchSchema = z
  .object({
    note: z.string().trim().max(2000, { message: "Note must be under 2000 characters" }).optional(),
    priority: prioritySchema.optional(),
  })
  .refine((v) => v.note !== undefined || v.priority !== undefined, {
    message: "Nothing to update",
  });

export const portfolioTypeSchema = z.string().trim().min(1).max(80);

export const portfolioCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Portfolio name is required" })
    .max(120, { message: "Portfolio name must be under 120 characters" }),
  type: portfolioTypeSchema,
  objective: z.string().trim().max(1000).optional(),
  targetDepartment: z.string().trim().max(120).optional(),
  targetQuarter: z.string().trim().max(40).optional(),
});

export const portfolioPatchSchema = portfolioCreateSchema
  .partial()
  .extend({ status: z.string().trim().min(1).max(40).optional() });

export const reportRequestSchema = z.object({
  title: z.string().trim().min(1, { message: "Report title is required" }).max(160),
  kind: z.string().trim().min(1).max(40),
  useCaseSlugs: z.array(slugSchema).max(200),
});

/** Parses input and raises a user-safe validation error with the first message. */
export function parseInput<T extends z.ZodTypeAny>(schema: T, value: unknown): z.infer<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    const first = result.error.issues[0];
    throw new DomainError("validation", first?.message ?? "Please check your input and try again.", result.error);
  }
  return result.data;
}
