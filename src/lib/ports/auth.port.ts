/**
 * Authentication port — identity provider seam.
 *
 * Live auth remains Supabase Auth + middleware. This port names the contract so
 * OIDC/SAML/local IdP swaps do not fork product code.
 */

import type { AdapterMeta } from "./types";

export const AUTH_PROVIDER_IDS = ["supabase_auth", "oidc_generic", "saml_generic", "local_idp"] as const;
export type AuthProviderId = (typeof AUTH_PROVIDER_IDS)[number];

export type AuthenticationPort = {
  readonly meta: AdapterMeta & { port: "authentication"; id: AuthProviderId };
  /** Provider id currently bound — used for diagnostics / sovereignty reports. */
  providerId(): AuthProviderId;
};

export const AUTH_ADAPTER_CATALOGUE: Record<
  AuthProviderId,
  Omit<AdapterMeta, "port"> & { id: AuthProviderId }
> = {
  supabase_auth: {
    id: "supabase_auth",
    label: "Supabase Auth",
    status: "active",
    implementation: "src/integrations/supabase/* + ports/adapters/auth/supabase.adapter.ts",
    notes: "Email/OAuth; org SSO configs use the same Auth stack when CAPABILITY_SSO is on.",
  },
  oidc_generic: {
    id: "oidc_generic",
    label: "Generic OIDC",
    status: "planned",
    implementation: "src/lib/ports/adapters/auth/planned.ts",
  },
  saml_generic: {
    id: "saml_generic",
    label: "Generic SAML",
    status: "planned",
    implementation: "src/lib/ports/adapters/auth/planned.ts",
  },
  local_idp: {
    id: "local_idp",
    label: "Local IdP",
    status: "planned",
    implementation: "src/lib/ports/adapters/auth/planned.ts",
    notes: "Air-gap candidate — no public IdP callbacks.",
  },
};
