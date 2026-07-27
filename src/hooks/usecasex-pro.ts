/**
 * Supabase-backed UseCasesX™ Pro hook.
 *
 * Drop-in replacement for the legacy local-storage `useUseCaseXStore`.
 * Same slug-keyed surface, but persists every change to Supabase tables:
 *   - saved_use_cases       (priority, note)
 *   - use_case_scores       (6-dimension scoring)
 *   - portfolios            (name, type, status, dept, quarter, objective)
 *   - portfolio_items       (portfolio ↔ use_case_id)
 *
 * RLS guarantees a user only ever sees / writes their own rows. The hook
 * silently no-ops mutations when no user is signed in.
 */

import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  listSavedForUser,
  listScoresForUser,
  resolveUseCaseIdBySlug,
  saveUseCase,
  unsaveUseCase,
  updateSavedUseCase,
  upsertUseCaseScore,
} from "@/lib/domain/saved-use-cases.repository";
import {
  addUseCaseToPortfolio,
  createPortfolio,
  deletePortfolio,
  listPortfoliosForUser,
  removeUseCaseFromPortfolio,
  updatePortfolio,
} from "@/lib/domain/portfolios.repository";
import { DomainError } from "@/lib/domain/errors";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { trackCTAEvent } from "@/lib/usecasex.tracking";
import {
  SCORE_WEIGHTS,
  type Priority,
  type ScoreDimensions,
  type Portfolio,
  type PortfolioType,
  type PortfolioStatus,
  type SavedUseCaseEntry,
} from "@/lib/usecasex.store";

const PRO_KEY = ["usecasex", "pro"] as const;

interface ProData {
  saved: SavedUseCaseEntry[];
  portfolios: Portfolio[];
  /** slug → use_case.id resolution map for cheap mutation lookups. */
  slugToId: Record<string, string>;
}

const EMPTY: ProData = { saved: [], portfolios: [], slugToId: {} };

function normalizeScore(row: {
  strategic: number; value: number; feasibility: number;
  risk: number; readiness: number; ttv: number;
} | null): ScoreDimensions | undefined {
  if (!row) return undefined;
  return {
    strategicAlignment: row.strategic ?? 0,
    valuePotential: row.value ?? 0,
    feasibility: row.feasibility ?? 0,
    timeToValue: row.ttv ?? 0,
    riskManageability: row.risk ?? 0,
    governanceReadiness: row.readiness ?? 0,
  };
}

function scoreToColumns(s: ScoreDimensions) {
  const total = Math.round(
    s.strategicAlignment * SCORE_WEIGHTS.strategicAlignment +
    s.valuePotential * SCORE_WEIGHTS.valuePotential +
    s.feasibility * SCORE_WEIGHTS.feasibility +
    s.timeToValue * SCORE_WEIGHTS.timeToValue +
    s.riskManageability * SCORE_WEIGHTS.riskManageability +
    s.governanceReadiness * SCORE_WEIGHTS.governanceReadiness,
  );
  return {
    strategic: s.strategicAlignment,
    value: s.valuePotential,
    feasibility: s.feasibility,
    ttv: s.timeToValue,
    risk: s.riskManageability,
    readiness: s.governanceReadiness,
    total,
  };
}

async function fetchProData(userId: string): Promise<ProData> {
  const [savedRows, scoreRows, portfolioRows] = await Promise.all([
    listSavedForUser(userId),
    listScoresForUser(userId),
    listPortfoliosForUser(userId),
  ]);

  const savedRes = { data: savedRows };
  const scoresRes = { data: scoreRows };
  const portRes = { data: portfolioRows };

  const slugToId: Record<string, string> = {};
  const scoresByUcId = new Map<string, ScoreDimensions | undefined>();
  for (const s of scoresRes.data ?? []) {
    scoresByUcId.set(s.use_case_id, normalizeScore(s));
  }

  const saved: SavedUseCaseEntry[] = [];
  for (const row of (savedRes.data ?? []) as any[]) {
    const slug = row.use_cases?.slug as string | undefined;
    if (!slug) continue;
    slugToId[slug] = row.use_case_id;
    saved.push({
      useCaseSlug: slug,
      savedAt: row.saved_at,
      note: row.note ?? undefined,
      priority: (row.priority ?? "Medium") as Priority,
      score: scoresByUcId.get(row.use_case_id),
    });
  }

  const portfolios: Portfolio[] = [];
  for (const p of (portRes.data ?? []) as any[]) {
    const slugs: string[] = [];
    for (const item of (p.portfolio_items ?? []) as any[]) {
      const slug = item.use_cases?.slug as string | undefined;
      if (slug) {
        slugs.push(slug);
        slugToId[slug] = item.use_case_id;
      }
    }
    portfolios.push({
      id: p.id,
      name: p.name,
      type: (p.portfolio_type ?? "Custom Portfolio") as PortfolioType,
      status: (p.status ?? "Draft") as PortfolioStatus,
      objective: p.objective ?? undefined,
      targetDepartment: p.target_department ?? undefined,
      targetQuarter: p.target_quarter ?? undefined,
      useCaseSlugs: slugs,
      createdAt: p.created_at,
    });
  }

  return { saved, portfolios, slugToId };
}

async function resolveSlugId(
  slug: string,
  cache: Record<string, string>,
): Promise<string | null> {
  if (cache[slug]) return cache[slug];
  const id = await resolveUseCaseIdBySlug(slug);
  if (id) cache[slug] = id;
  return id;
}

/**
 * Supabase-backed counterpart to `useUseCaseXStore`. Returns the same fields
 * and mutator names so consumers can swap without changing call-sites.
 */
export function useUseCaseXPro() {
  const session = useSupabaseSession();
  const qc = useQueryClient();
  const userId = session?.user.id ?? null;

  const query = useQuery({
    queryKey: [...PRO_KEY, userId],
    enabled: !!userId,
    queryFn: () => fetchProData(userId!),
    staleTime: 30_000,
  });

  const data = query.data ?? EMPTY;
  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: PRO_KEY });
  }, [qc]);

  const requireUser = useCallback(() => {
    if (!userId) throw new DomainError("unauthenticated", "Sign in to manage your AI Opportunity Portfolio.");
    return userId;
  }, [userId]);

  // Mutations -------------------------------------------------------------
  const addSavedM = useMutation({
    mutationFn: async (slug: string) => {
      const uid = requireUser();
      const id = await resolveSlugId(slug, { ...data.slugToId });
      if (!id) throw new Error(`Unknown use case: ${slug}`);
      await saveUseCase(uid, id);
    },
    onSuccess: (_data, slug) => {
      trackCTAEvent("use_case_saved", { slug, source_page: "/repository" });
      invalidate();
    },
  });

  const removeSavedM = useMutation({
    mutationFn: async (slug: string) => {
      const uid = requireUser();
      const id = data.slugToId[slug] ?? (await resolveSlugId(slug, { ...data.slugToId }));
      if (!id) return;
      await unsaveUseCase(uid, id);
    },
    onSuccess: (_data, slug) => {
      trackCTAEvent("use_case_deleted", { slug, source_page: "/my-use-cases" });
      invalidate();
    },
  });

  const updateSavedM = useMutation({
    mutationFn: async ({ slug, patch }: { slug: string; patch: { note?: string; priority?: Priority } }) => {
      const uid = requireUser();
      const id = data.slugToId[slug] ?? (await resolveSlugId(slug, { ...data.slugToId }));
      if (!id) throw new Error(`Unknown use case: ${slug}`);
      await updateSavedUseCase(uid, id, patch);
    },
    onSuccess: (_data, variables) => {
      trackCTAEvent("use_case_edited", { slug: variables.slug, source_page: "/my-use-cases" });
      invalidate();
    },
  });

  const setScoreM = useMutation({
    mutationFn: async ({ slug, score }: { slug: string; score: ScoreDimensions }) => {
      const uid = requireUser();
      const id = data.slugToId[slug] ?? (await resolveSlugId(slug, { ...data.slugToId }));
      if (!id) throw new Error(`Unknown use case: ${slug}`);
      await upsertUseCaseScore(uid, id, score, scoreToColumns);
    },
    onSuccess: invalidate,
  });

  const createPortfolioM = useMutation({
    mutationFn: async (input: {
      name: string;
      type: PortfolioType;
      objective?: string;
      targetDepartment?: string;
      targetQuarter?: string;
    }) => {
      const uid = requireUser();
      await createPortfolio(uid, input);
    },
    onSuccess: invalidate,
  });

  const updatePortfolioM = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Portfolio> }) => {
      const uid = requireUser();
      await updatePortfolio(uid, id, {
        name: patch.name,
        objective: patch.objective,
        type: patch.type,
        status: patch.status,
        targetDepartment: patch.targetDepartment,
        targetQuarter: patch.targetQuarter,
      });
    },
    onSuccess: invalidate,
  });

  const deletePortfolioM = useMutation({
    mutationFn: async (id: string) => {
      const uid = requireUser();
      await deletePortfolio(uid, id);
    },
    onSuccess: invalidate,
  });

  const addToPortfolioM = useMutation({
    mutationFn: async ({ portfolioId, slug }: { portfolioId: string; slug: string }) => {
      requireUser();
      const id = data.slugToId[slug] ?? (await resolveSlugId(slug, { ...data.slugToId }));
      if (!id) throw new Error(`Unknown use case: ${slug}`);
      await addUseCaseToPortfolio(userId, portfolioId, id);
    },
    onSuccess: invalidate,
  });

  const removeFromPortfolioM = useMutation({
    mutationFn: async ({ portfolioId, slug }: { portfolioId: string; slug: string }) => {
      requireUser();
      const id = data.slugToId[slug] ?? (await resolveSlugId(slug, { ...data.slugToId }));
      if (!id) return;
      await removeUseCaseFromPortfolio(userId, portfolioId, id);
    },
    onSuccess: invalidate,
  });

  return useMemo(
    () => ({
      // Data
      saved: data.saved,
      portfolios: data.portfolios,
      isLoading: query.isLoading,
      isAuthenticated: !!userId,
      error: query.error,
      refetch: invalidate,

      // Mutations (sync-looking surface for compatibility with the legacy
      // local-storage hook — fire-and-forget; subscribers re-render on
      // query invalidation).
      addSaved: (slug: string) => addSavedM.mutate(slug),
      removeSaved: (slug: string) => removeSavedM.mutate(slug),
      setNote: (slug: string, note: string) => updateSavedM.mutate({ slug, patch: { note } }),
      setPriority: (slug: string, priority: Priority) => updateSavedM.mutate({ slug, patch: { priority } }),
      setScore: (slug: string, score: ScoreDimensions) => setScoreM.mutate({ slug, score }),
      createPortfolio: (input: {
        name: string;
        type: PortfolioType;
        objective?: string;
        targetDepartment?: string;
        targetQuarter?: string;
      }) => createPortfolioM.mutate(input),
      renamePortfolio: (id: string, name: string) => updatePortfolioM.mutate({ id, patch: { name } }),
      updatePortfolio: (id: string, patch: Partial<Portfolio>) => updatePortfolioM.mutate({ id, patch }),
      deletePortfolio: (id: string) => deletePortfolioM.mutate(id),
      addToPortfolio: (portfolioId: string, slug: string) => addToPortfolioM.mutate({ portfolioId, slug }),
      removeFromPortfolio: (portfolioId: string, slug: string) =>
        removeFromPortfolioM.mutate({ portfolioId, slug }),
    }),
    [
      data, userId, query.isLoading, query.error, invalidate,
      addSavedM, removeSavedM, updateSavedM, setScoreM,
      createPortfolioM, updatePortfolioM, deletePortfolioM,
      addToPortfolioM, removeFromPortfolioM,
    ],
  );
}
