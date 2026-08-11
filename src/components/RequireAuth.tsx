import type { ReactNode } from "react";
import { Navigate } from "@tanstack/react-router";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";

/**
 * Client-side auth gate. Session lives in localStorage (Supabase), so SSR
 * cannot read it. While the initial session resolves we render nothing; after
 * that, unauthenticated visitors are redirected to /auth.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const session = useSupabaseSession();

  if (session === undefined) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background text-sm text-muted-foreground">
        Verifying session…
      </div>
    );
  }

  if (session === null) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
