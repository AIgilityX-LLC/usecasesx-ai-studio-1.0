import { AUTH_ADAPTER_CATALOGUE, type AuthenticationPort } from "@/lib/ports/auth.port";

export const supabaseAuthAdapter: AuthenticationPort = {
  meta: { ...AUTH_ADAPTER_CATALOGUE.supabase_auth, port: "authentication" },
  providerId: () => "supabase_auth",
};
