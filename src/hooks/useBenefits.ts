/**
 * Benefits data hooks.
 *
 * One batched query per surface: the studio panel reads a single use case,
 * portfolio/roadmap/report summaries read every use case they display.
 */

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import * as benefitsRepo from "@/lib/domain/benefits.repository";
import { loadStudioLineage } from "@/lib/domain/studio-lineage.repository";
import { aggregateBenefits, type Benefit, type BenefitInput } from "@/lib/value/benefits.model";

export function useBenefits(useCaseId: string | null | undefined) {
  const queryClient = useQueryClient();
  const enabled = Boolean(useCaseId);

  const query = useQuery({
    queryKey: ["use-case-benefits", useCaseId],
    queryFn: () => benefitsRepo.listBenefits(useCaseId as string),
    enabled,
    staleTime: 15_000,
  });

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["use-case-benefits", useCaseId] });
    void queryClient.invalidateQueries({ queryKey: ["benefits-for-use-cases"] });
    void queryClient.invalidateQueries({ queryKey: ["use-case-benefit-audit", useCaseId] });
  }, [queryClient, useCaseId]);

  const create = useMutation({
    mutationFn: (input: BenefitInput) => benefitsRepo.createBenefit(input),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: BenefitInput }) =>
      benefitsRepo.updateBenefit(id, input),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => benefitsRepo.deleteBenefit(id),
    onSuccess: invalidate,
  });

  const benefits = (query.data ?? []) as Benefit[];

  return {
    benefits,
    aggregate: aggregateBenefits(benefits),
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
    create,
    update,
    remove,
  };
}

/** Value across many use cases — portfolio, roadmap and report summaries. */
export function useBenefitsForUseCases(useCaseIds: string[]) {
  const ids = [...new Set(useCaseIds.filter(Boolean))].sort();

  const query = useQuery({
    queryKey: ["benefits-for-use-cases", ids],
    queryFn: () => benefitsRepo.listBenefitsForUseCases(ids),
    enabled: ids.length > 0,
    staleTime: 30_000,
  });

  const benefits = (query.data ?? []) as Benefit[];

  return {
    benefits,
    aggregate: aggregateBenefits(benefits),
    isLoading: query.isLoading,
    error: query.error as Error | null,
  };
}

export function useBenefitAudit(useCaseId: string | null | undefined) {
  const query = useQuery({
    queryKey: ["use-case-benefit-audit", useCaseId],
    queryFn: () => benefitsRepo.listBenefitAudit(useCaseId as string),
    enabled: Boolean(useCaseId),
    staleTime: 15_000,
  });
  return {
    entries: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
  };
}

/** Audit trail scoped to a single benefit, for the per-benefit history view. */
export function useBenefitAuditForBenefit(
  useCaseId: string | null | undefined,
  benefitId: string | null | undefined,
) {
  const query = useQuery({
    queryKey: ["use-case-benefit-audit", useCaseId, benefitId],
    queryFn: () =>
      benefitsRepo.listBenefitAuditForBenefit(useCaseId as string, benefitId as string),
    enabled: Boolean(useCaseId && benefitId),
    staleTime: 15_000,
  });
  return {
    entries: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
  };
}

/**
 * Slug-keyed value for surfaces that work in repository slugs (reports).
 * Resolves the repository slug → Studio use case lineage first, then reads the
 * benefits attached to those Studio use cases.
 */
export function useBenefitsBySlug(slugToUseCaseId: Record<string, string>) {
  const lineageKey = Object.entries(slugToUseCaseId)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([slug, id]) => `${slug}:${id}`);

  const lineageQuery = useQuery({
    queryKey: ["studio-lineage", lineageKey],
    queryFn: () => loadStudioLineage(slugToUseCaseId),
    enabled: lineageKey.length > 0,
    staleTime: 60_000,
  });

  const studioIdBySlug = lineageQuery.data?.studioIdBySlug ?? {};
  const studioIds = Object.values(studioIdBySlug);
  const { benefits, isLoading, error } = useBenefitsForUseCases(studioIds);

  const bySlug: Record<string, Benefit[]> = {};
  const byStudioId = new Map<string, Benefit[]>();
  for (const benefit of benefits) {
    const list = byStudioId.get(benefit.useCaseId) ?? [];
    list.push(benefit);
    byStudioId.set(benefit.useCaseId, list);
  }
  for (const [slug, studioId] of Object.entries(studioIdBySlug)) {
    const list = byStudioId.get(studioId);
    if (list?.length) bySlug[slug] = list;
  }

  return {
    /** repository slug → Studio use case id, for deep links into the Studio. */
    studioIdBySlug,
    benefitsBySlug: bySlug,
    benefits,
    aggregate: aggregateBenefits(benefits),
    isLoading: lineageQuery.isLoading || isLoading,
    error: (lineageQuery.error as Error | null) ?? error,
  };
}
