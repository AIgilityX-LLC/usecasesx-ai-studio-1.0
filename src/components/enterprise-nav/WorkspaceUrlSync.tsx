import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useWorkspaceContext } from "@/hooks/useWorkspaceContext";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function stripWorkspaceParam(searchStr: string, pathname: string) {
  const params = new URLSearchParams(searchStr.startsWith("?") ? searchStr.slice(1) : searchStr);
  if (!params.has("workspace")) return;
  params.delete("workspace");
  const next = params.toString();
  const url = next
    ? `${pathname}?${next}${window.location.hash}`
    : `${pathname}${window.location.hash}`;
  window.history.replaceState(window.history.state, "", url);
}

/**
 * Honors `?workspace=<uuid>` on signed-in routes: validates membership via
 * switchWorkspace, then strips the query param so deep links do not re-fire.
 */
export function WorkspaceUrlSync() {
  const searchStr = useRouterState({ select: (r) => r.location.searchStr });
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { data, switchWorkspace, isLoading } = useWorkspaceContext();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (isLoading || !data) return;
    const params = new URLSearchParams(searchStr.startsWith("?") ? searchStr.slice(1) : searchStr);
    const raw = params.get("workspace");
    if (!raw || !UUID_RE.test(raw)) return;
    if (handled.current === raw) return;
    handled.current = raw;

    if (raw === data.workspace?.id) {
      stripWorkspaceParam(searchStr, pathname);
      return;
    }

    void switchWorkspace(raw)
      .catch(() => {
        /* membership failure — leave user on current workspace; RLS still applies */
      })
      .finally(() => {
        stripWorkspaceParam(searchStr, pathname);
      });
  }, [searchStr, pathname, data, isLoading, switchWorkspace]);

  return null;
}
