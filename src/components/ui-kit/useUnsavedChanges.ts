import { useEffect } from "react";
import { useBlocker } from "@tanstack/react-router";

/**
 * Guards a dirty form against accidental loss. Blocks in-app navigation via the
 * router and browser unload via `beforeunload`. Call it from any editor surface
 * (Studio, admin forms) with the form's dirty flag.
 */
export function useUnsavedChanges(
  isDirty: boolean,
  message = "You have unsaved changes. Leave this page and discard them?",
) {
  useBlocker({
    shouldBlockFn: () => {
      if (!isDirty) return false;
      return !window.confirm(message);
    },
    enableBeforeUnload: () => isDirty,
  });

  useEffect(() => {
    if (!isDirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);
}
