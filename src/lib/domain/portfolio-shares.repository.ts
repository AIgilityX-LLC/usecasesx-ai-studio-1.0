/**
 * View-only share links for a portfolio.
 *
 * RLS decides everything: readers of a portfolio can list its links, writers
 * can mint and revoke them. Revocation is a soft flag so the audit story of a
 * link that was once live is preserved.
 */

import { supabase } from "@/integrations/supabase/client";
import { unwrapResult } from "./errors";
import { parseInput, uuidSchema } from "./validation";

export interface PortfolioShare {
  id: string;
  portfolioId: string;
  token: string;
  label: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

type Row = {
  id: string;
  portfolio_id: string;
  token: string;
  label: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

const map = (row: Row): PortfolioShare => ({
  id: row.id,
  portfolioId: row.portfolio_id,
  token: row.token,
  label: row.label,
  expiresAt: row.expires_at,
  revokedAt: row.revoked_at,
  createdAt: row.created_at,
});

const SELECT = "id, portfolio_id, token, label, expires_at, revoked_at, created_at";

export function isShareLive(share: PortfolioShare): boolean {
  if (share.revokedAt) return false;
  if (share.expiresAt && new Date(share.expiresAt).getTime() < Date.now()) return false;
  return true;
}

export async function listPortfolioShares(portfolioId: string): Promise<PortfolioShare[]> {
  const id = parseInput(uuidSchema, portfolioId);
  const result = await supabase
    .from("portfolio_shares")
    .select(SELECT)
    .eq("portfolio_id", id)
    .order("created_at", { ascending: false });
  return ((unwrapResult(result, { allowNull: true }) ?? []) as Row[]).map(map);
}

export async function createPortfolioShare(input: {
  portfolioId: string;
  label?: string;
  expiresAt?: string | null;
}): Promise<PortfolioShare> {
  const id = parseInput(uuidSchema, input.portfolioId);
  const { data: session } = await supabase.auth.getUser();
  const userId = session.user?.id;
  if (!userId) throw new Error("Sign in to create a share link.");

  const result = await supabase
    .from("portfolio_shares")
    .insert({
      portfolio_id: id,
      created_by: userId,
      label: input.label?.trim() || null,
      expires_at: input.expiresAt ?? null,
    })
    .select(SELECT)
    .single();
  return map(unwrapResult(result) as Row);
}

export async function revokePortfolioShare(shareId: string): Promise<void> {
  const id = parseInput(uuidSchema, shareId);
  const result = await supabase
    .from("portfolio_shares")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  unwrapResult(result, { allowNull: true });
}
