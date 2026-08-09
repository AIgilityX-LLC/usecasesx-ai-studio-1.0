import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  getExportPreferences,
  saveExportPreferences,
} from "@/lib/domain/export-preferences.repository";
import { useWorkspaceContext } from "@/hooks/useWorkspaceContext";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";

/**
 * Workspace-level export column preferences. Falls back to "all columns" when
 * the workspace has never saved a preference.
 */
export function useExportPreferences(exportKey: string) {
  const session = useSupabaseSession();
  const { data: context } = useWorkspaceContext();
  const workspaceId = context?.workspace?.id ?? null;
  const queryClient = useQueryClient();
  const queryKey = ["export-preferences", workspaceId, exportKey];

  const query = useQuery({
    queryKey,
    queryFn: () => getExportPreferences(workspaceId as string, exportKey),
    enabled: Boolean(workspaceId),
    staleTime: 5 * 60 * 1000,
  });

  const mutation = useMutation({
    mutationFn: (columns: string[]) =>
      saveExportPreferences(workspaceId as string, exportKey, columns, session?.user.id ?? null),
    onSuccess: (_data, columns) => {
      queryClient.setQueryData(queryKey, columns);
    },
  });

  return {
    columns: query.data ?? null,
    isLoading: query.isLoading,
    canPersist: Boolean(workspaceId),
    save: mutation.mutateAsync,
    isSaving: mutation.isPending,
  };
}
