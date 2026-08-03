import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type SharedPortfolioEntry = {
  useCaseTitle: string | null;
  useCaseSlug: string | null;
  rank: number | null;
  decision: string;
  targetPeriod: string | null;
  fundingState: string;
  nextAction: string | null;
};

export type SharedPortfolio = {
  name: string;
  objective: string | null;
  status: string;
  updatedAt: string | null;
  entries: SharedPortfolioEntry[];
};

/**
 * Resolves a view-only portfolio share link. The unguessable token is the
 * capability: the handler verifies it is live (not revoked, not expired)
 * before reading anything, and returns a read-only projection that omits
 * internal notes, owners and tenant identifiers.
 */
export const getSharedPortfolio = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ token: z.string().uuid() }).parse(d))
  .handler(async ({ data }): Promise<SharedPortfolio | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: share } = await supabaseAdmin
      .from("portfolio_shares")
      .select("portfolio_id, revoked_at, expires_at")
      .eq("token", data.token)
      .maybeSingle();

    if (!share || share.revoked_at) return null;
    if (share.expires_at && new Date(share.expires_at).getTime() < Date.now()) return null;

    const { data: portfolio } = await supabaseAdmin
      .from("portfolios")
      .select("id, name, objective, status, updated_at")
      .eq("id", share.portfolio_id)
      .maybeSingle();

    if (!portfolio) return null;

    const { data: items } = await supabaseAdmin
      .from("portfolio_items")
      .select("use_case_id, rank, decision, target_period, funding_state, next_action")
      .eq("portfolio_id", portfolio.id)
      .order("rank", { ascending: true, nullsFirst: false });

    const ids = (items ?? []).map((i) => i.use_case_id).filter(Boolean) as string[];
    const titles = new Map<string, { title: string; slug: string }>();
    if (ids.length > 0) {
      const { data: useCases } = await supabaseAdmin
        .from("use_cases")
        .select("id, title, slug")
        .in("id", ids);
      for (const uc of useCases ?? []) titles.set(uc.id, { title: uc.title, slug: uc.slug });
    }

    return {
      name: portfolio.name,
      objective: portfolio.objective ?? null,
      status: String(portfolio.status ?? ""),
      updatedAt: portfolio.updated_at ?? null,
      entries: (items ?? []).map((item) => {
        const uc = titles.get(item.use_case_id as string);
        return {
          useCaseTitle: uc?.title ?? null,
          useCaseSlug: uc?.slug ?? null,
          rank: item.rank ?? null,
          decision: String(item.decision ?? ""),
          targetPeriod: item.target_period ?? null,
          fundingState: String(item.funding_state ?? ""),
          nextAction: item.next_action ?? null,
        };
      }),
    };
  });
