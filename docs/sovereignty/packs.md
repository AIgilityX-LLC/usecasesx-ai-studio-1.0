# Policy packs (configurable — not hardcoded law)

## Principle

**Do not hardcode jurisdiction-specific law into business logic.**

Evaluators understand:

- region codes (`eu`, `us`, `private`, or customer-defined strings)
- provider slugs
- classification tokens
- boolean capability flags
- duration numbers

They do **not** understand “Article 44”, “Schrems II”, sectoral statutes, or court rulings. Those belong in:

1. **Customer / partner policy packs** (`policyPackId`) that set tokens appropriately, and/or  
2. **Advisory / legal documentation** maintained outside the runtime evaluator.

## Built-in starters

| Pack helper | Intent |
| ----------- | ------ |
| `defaultSovereigntyPolicy(orgId)` | Cloud SaaS baseline |
| `regulatedBaselinePack(orgId)` | Tighter tokens (SSO required, permit-list cross-border, CMK capability) — still not a legal attestation |

## Adding a pack

1. Clone a baseline.
2. Set `policyPackId` to an opaque id (`customer_acme_v3`).
3. Adjust region/provider/classification tokens only.
4. Ship via config / DB JSON — not new `if (country === "DE")` branches in `evaluate.ts`.

## Deployment profile link

`SovereigntyPolicy.deploymentProfileId` may reference Phase 9 profile ids (`cloud_saas`, `dedicated_cloud`, `sovereign_cloud_vpc`, `sovereign_private`). Profile fit ≠ legal compliance.
