/**
 * Portfolio repository — the only place that reads/writes `portfolios` and
 * `portfolio_items`. Ownership is asserted before every mutation; RLS enforces
 * the same rule server-side.
 */

import { supabase } from "@/integrations/supabase/client";
import { normalizeError, unwrapResult } from "./errors";
import { requireUserId } from "./ownership";
import { parseInput, portfolioCreateSchema, portfolioPatchSchema, uuidSchema } from "./validation";

export type PortfolioCreateInput = {
  name: string;
  type: string;
  objective?: string;
  targetDepartment?: string;
  targetQuarter?: string;
};

export type PortfolioPatchInput = Partial<PortfolioCreateInput> & { status?: string };

export async function listPortfoliosForUser(userId: string | null) {
  const uid = requireUserId(userId);
  const result = await supabase
    .from("portfolios")
    .select(
      "id, name, objective, created_at, portfolio_type, status, target_department, target_quarter, portfolio_items ( use_case_id, use_cases ( slug ) )",
    )
    .eq("user_id", uid)
    .order("created_at", { ascending: false });
  return unwrapResult(result, { allowNull: true }) ?? [];
}

export async function createPortfolio(userId: string | null, input: PortfolioCreateInput) {
  const uid = requireUserId(userId);
  const clean = parseInput(portfolioCreateSchema, input);
  const result = await supabase.from("portfolios").insert({
    user_id: uid,
    name: clean.name,
    portfolio_type: clean.type,
    status: "Draft",
    objective: clean.objective ?? null,
    target_department: clean.targetDepartment ?? null,
    target_quarter: clean.targetQuarter ?? null,
  });
  if (result.error) throw normalizeError(result.error);
}

/** Maps the domain patch onto database columns. Exported for unit tests. */
export function toPortfolioColumns(patch: PortfolioPatchInput) {
  const columns: Record<string, string | null> = {};
  if (patch.name !== undefined) columns.name = patch.name;
  if (patch.objective !== undefined) columns.objective = patch.objective ?? null;
  if (patch.type !== undefined) columns.portfolio_type = patch.type;
  if (patch.status !== undefined) columns.status = patch.status;
  if (patch.targetDepartment !== undefined) columns.target_department = patch.targetDepartment ?? null;
  if (patch.targetQuarter !== undefined) columns.target_quarter = patch.targetQuarter ?? null;
  return columns;
}

export async function updatePortfolio(
  userId: string | null,
  portfolioId: string,
  patch: PortfolioPatchInput,
) {
  const uid = requireUserId(userId);
  const id = parseInput(uuidSchema, portfolioId);
  const clean = parseInput(portfolioPatchSchema, patch);
  const columns = toPortfolioColumns(clean);
  if (Object.keys(columns).length === 0) return;
  const result = await supabase.from("portfolios").update(columns).eq("id", id).eq("user_id", uid);
  if (result.error) throw normalizeError(result.error);
}

export async function deletePortfolio(userId: string | null, portfolioId: string) {
  const uid = requireUserId(userId);
  const id = parseInput(uuidSchema, portfolioId);
  const result = await supabase.from("portfolios").delete().eq("id", id).eq("user_id", uid);
  if (result.error) throw normalizeError(result.error);
}

export async function addUseCaseToPortfolio(
  userId: string | null,
  portfolioId: string,
  useCaseId: string,
) {
  requireUserId(userId);
  const pid = parseInput(uuidSchema, portfolioId);
  const ucid = parseInput(uuidSchema, useCaseId);
  const result = await supabase
    .from("portfolio_items")
    .upsert({ portfolio_id: pid, use_case_id: ucid }, { onConflict: "portfolio_id,use_case_id" });
  if (result.error) throw normalizeError(result.error);
}

export async function removeUseCaseFromPortfolio(
  userId: string | null,
  portfolioId: string,
  useCaseId: string,
) {
  requireUserId(userId);
  const pid = parseInput(uuidSchema, portfolioId);
  const ucid = parseInput(uuidSchema, useCaseId);
  const result = await supabase
    .from("portfolio_items")
    .delete()
    .eq("portfolio_id", pid)
    .eq("use_case_id", ucid);
  if (result.error) throw normalizeError(result.error);
}
