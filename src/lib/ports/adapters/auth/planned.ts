import { AUTH_ADAPTER_CATALOGUE, type AuthProviderId, type AuthenticationPort } from "@/lib/ports/auth.port";

function planned(id: Exclude<AuthProviderId, "supabase_auth">): AuthenticationPort {
  return {
    meta: { ...AUTH_ADAPTER_CATALOGUE[id], port: "authentication" },
    providerId: () => id,
  };
}

export const oidcGenericAdapter = planned("oidc_generic");
export const samlGenericAdapter = planned("saml_generic");
export const localIdpAdapter = planned("local_idp");
