/**
 * Client-safe launch-learning model: the ordered activation funnel and the
 * row shapes returned by the internal weekly views.
 */

export const ACTIVATION_STAGES = [
  { key: "visitor", label: "Visitor" },
  { key: "signup", label: "Signup" },
  { key: "onboarding", label: "Onboarding" },
  { key: "opportunity", label: "Opportunity captured" },
  { key: "completed_case", label: "Completed case" },
  { key: "score", label: "Scored" },
  { key: "shortlist", label: "Shortlisted" },
  { key: "portfolio", label: "Portfolio" },
  { key: "report", label: "Report exported" },
  { key: "workshop_advisory", label: "Workshop / advisory" },
] as const;

export type ActivationStageKey = (typeof ACTIVATION_STAGES)[number]["key"];

export interface ActivationStageRow {
  stage: ActivationStageKey;
  label: string;
  users: number;
  events: number;
  /** Conversion from the previous non-empty stage, 0–100. */
  conversionPercent: number | null;
  dropOffPercent: number | null;
}

export interface SearchInsightRow {
  query: string;
  searches: number;
  zeroResultSearches: number;
}

export interface AiUsageRow {
  task: string;
  calls: number;
  errors: number;
  users: number;
  avgDurationMs: number | null;
}

export interface EnterpriseInterestRow {
  interestArea: string;
  leads: number;
}

export interface LaunchLearning {
  from: string;
  to: string;
  visitorSessions: number;
  funnel: ActivationStageRow[];
  topSearches: SearchInsightRow[];
  noResultSearches: SearchInsightRow[];
  aiUsage: AiUsageRow[];
  enterpriseInterest: EnterpriseInterestRow[];
  feedbackByStatus: { status: string; count: number }[];
}

/** Adds conversion / drop-off against the previous stage that had users. */
export function withConversion(
  rows: { stage: ActivationStageKey; label: string; users: number; events: number }[],
): ActivationStageRow[] {
  let previous: number | null = null;
  return rows.map((row) => {
    const conversion =
      previous == null || previous === 0 ? null : Math.round((row.users / previous) * 1000) / 10;
    const out: ActivationStageRow = {
      ...row,
      conversionPercent: conversion,
      dropOffPercent: conversion == null ? null : Math.round((100 - conversion) * 10) / 10,
    };
    if (row.users > 0) previous = row.users;
    else if (previous == null) previous = row.users;
    return out;
  });
}

export function launchLearningToCsv(data: LaunchLearning): string {
  const lines = ["section,key,metric,value"];
  const push = (section: string, key: string, metric: string, value: number | string) =>
    lines.push(`${section},"${String(key).replace(/"/g, '""')}",${metric},${value}`);
  push("window", "visitors", "sessions", data.visitorSessions);
  for (const row of data.funnel) {
    push("funnel", row.stage, "users", row.users);
    push("funnel", row.stage, "events", row.events);
    if (row.conversionPercent != null) push("funnel", row.stage, "conversion_pct", row.conversionPercent);
  }
  for (const row of data.topSearches) push("search_top", row.query, "searches", row.searches);
  for (const row of data.noResultSearches)
    push("search_zero_result", row.query, "searches", row.zeroResultSearches);
  for (const row of data.aiUsage) {
    push("ai", row.task, "calls", row.calls);
    push("ai", row.task, "errors", row.errors);
  }
  for (const row of data.enterpriseInterest)
    push("enterprise_interest", row.interestArea, "leads", row.leads);
  for (const row of data.feedbackByStatus) push("feedback", row.status, "count", row.count);
  return lines.join("\n");
}
