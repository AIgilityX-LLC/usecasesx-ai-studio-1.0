import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseSession } from "./useSupabaseSession";
import {
  daysUntil,
  effectiveTier,
  type EntTier,
} from "@/lib/entitlements";

export type EntitlementState = {
  loading: boolean;
  isAuthed: boolean;
  /** Effective tier after applying the expiration date. */
  tier: EntTier;
  /** Raw stored tier before the expiration check. */
  storedTier: EntTier;
  expiresAt: Date | null;
  expired: boolean;
  isFounding: boolean;
  daysRemaining: number | null;
  refresh: () => void;
};

const DEFAULT: Omit<EntitlementState, "refresh"> = {
  loading: true,
  isAuthed: false,
  tier: "lite",
  storedTier: "lite",
  expiresAt: null,
  expired: false,
  isFounding: false,
  daysRemaining: null,
};

/**
 * Reads the signed-in user's entitlement from their profile and resolves the
 * effective tier, honouring the founding-member expiration date.
 */
export function useEntitlement(): EntitlementState {
  const session = useSupabaseSession();
  const [state, setState] = useState<Omit<EntitlementState, "refresh">>(DEFAULT);
  const [nonce, setNonce] = useState(0);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (session === undefined) return;
    if (session === null) {
      setState({ ...DEFAULT, loading: false });
      return;
    }
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("entitlement_tier, entitlement_expires_at, founding_member")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (!active) return;

      const storedTier = (data?.entitlement_tier ?? "lite") as EntTier;
      const expiresAtRaw = data?.entitlement_expires_at ?? null;
      const expiresAt = expiresAtRaw ? new Date(expiresAtRaw) : null;
      const tier = effectiveTier(storedTier, expiresAtRaw);
      const expired = storedTier !== "lite" && tier === "lite";

      setState({
        loading: false,
        isAuthed: true,
        tier,
        storedTier,
        expiresAt,
        expired,
        isFounding: !!data?.founding_member,
        daysRemaining: daysUntil(expiresAtRaw),
      });
    })();
    return () => {
      active = false;
    };
  }, [session, nonce]);

  return { ...state, refresh };
}
