/**
 * Self-serve pilot applications — client-safe vocabulary and validation.
 *
 * An application is a request for a seat, not a seat. Only an admin decision
 * turns one into a pilot invitation, so readiness seat counts stay honest.
 */

import { z } from "zod";

export const PILOT_APPLICATION_STATUSES = ["requested", "approved", "declined", "merged"] as const;
export type PilotApplicationStatus = (typeof PILOT_APPLICATION_STATUSES)[number];

export function applicationStatusLabel(status: string): string {
  switch (status) {
    case "requested":
      return "Awaiting review";
    case "approved":
      return "Approved — seat invited";
    case "declined":
      return "Declined";
    case "merged":
      return "Merged into an existing seat";
    default:
      return status;
  }
}

/** Free-text sector/country: the pilot is global and we do not gate on a list. */
export const PilotApplicationSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid work email.").max(255),
  organization: z.string().trim().min(2, "Enter your organisation.").max(160),
  roleTitle: z.string().trim().max(120).optional().or(z.literal("")),
  sector: z.string().trim().max(120).optional().or(z.literal("")),
  country: z.string().trim().max(120).optional().or(z.literal("")),
  goals: z
    .string()
    .trim()
    .min(20, "Tell us in a sentence or two what you want from the pilot.")
    .max(1200),
});

export type PilotApplicationInput = z.infer<typeof PilotApplicationSchema>;

/** Consumer mailboxes are rejected: the pilot is for organisational work. */
const CONSUMER_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "icloud.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "mail.ru",
  "qq.com",
]);

export function isWorkEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase().trim();
  return Boolean(domain) && !CONSUMER_DOMAINS.has(domain!);
}

export type PilotApplication = {
  id: string;
  cohort: string;
  fullName: string;
  email: string;
  organization: string;
  roleTitle: string | null;
  sector: string | null;
  country: string | null;
  goals: string | null;
  status: PilotApplicationStatus;
  decisionReason: string | null;
  decidedAt: string | null;
  invitationId: string | null;
  createdAt: string;
};

export type PilotApplicationSummary = {
  total: number;
  requested: number;
  approved: number;
  declined: number;
  merged: number;
};

export function summarizeApplications(rows: readonly PilotApplication[]): PilotApplicationSummary {
  return {
    total: rows.length,
    requested: rows.filter((r) => r.status === "requested").length,
    approved: rows.filter((r) => r.status === "approved").length,
    declined: rows.filter((r) => r.status === "declined").length,
    merged: rows.filter((r) => r.status === "merged").length,
  };
}
