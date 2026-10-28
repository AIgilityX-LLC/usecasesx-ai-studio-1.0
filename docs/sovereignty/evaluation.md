# Policy evaluation

## Entry point

```ts
SovereigntyControlPlane.evaluate(policy, subject) → PolicyDecision
```

`PolicyDecision`: `{ effect: "allow" | "deny", reason, clause, details? }`.

## Subjects

| `subject.type` | Evaluates |
| -------------- | --------- |
| `data_placement` | Region permit/prohibit, cross-border mode, classification binding |
| `ai_invocation` | Provider lists, model region, prompt egress, external use, local model |
| `identity_auth` | Approved IdP, SSO requirement, local accounts, email domain |
| `storage_write` | Provider, private bucket, tenant namespace |
| `encryption_mode` | Platform / CMK / BYOK capability flags |
| `admin_access` | Support / break-glass duration, reason, impersonation ban |
| `audit_event` | Marks required vs optional events |
| `exit` | Export, tenant deletion, portability format |

Typed helpers mirror each subject (`evaluateAiInvocation`, …) for call sites that already know the domain.

## Composition rules

- **Deny wins** within a single subject evaluation (first matching deny clause).
- Cross-subject composition (e.g. AI + data) is the caller's responsibility: evaluate both subjects when an action spans domains.
- Retention uses `evaluateRetentionDays(policy.retention, classification, days)`.

## Legacy overlay

```ts
const policy = SovereigntyControlPlane.overlayLegacy(
  SovereigntyControlPlane.defaultPolicy(orgId),
  { dataRegion: row.data_region, allowedAiProviderRoutes: row.allowed_ai_provider_routes },
);
```

Keeps V2-18 rows on the same evaluation path without duplicating allow-list logic in the UI.
