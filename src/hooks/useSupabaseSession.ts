import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * Reliable session hook. Returns `undefined` while the initial session
 * resolves, then `Session | null`. Uses `onAuthStateChange` (which fires
 * INITIAL_SESSION synchronously after subscribe) instead of `getSession()`
 * /`getUser()` to avoid the navigator.locks hang seen in the preview env.
 */
export function useSupabaseSession() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return session;
}
