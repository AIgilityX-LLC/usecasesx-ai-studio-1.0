# Threat model — UseCasesX™ (STRIDE sketch)

**Status:** Working engineering model. **Not** a compliance claim (no SOC 2 / ISO / FedRAMP attestation implied).  
**Inputs:** `docs/security/security-baseline.md`, `docs/architecture/ai-boundary.md`, `docs/v2/sovereignty-abstractions.md`, `AGENTS.md`.

## Trust boundaries

| Boundary | Assets | Primary controls |
| -------- | ------ | ---------------- |
| Browser / client bundle | Session cookies, publishable keys, UI state | No service-role / AI keys in client; entitlements UI is not authorization |
| Server functions (`createServerFn`) | User context, business logic | `requireSupabaseAuth`; re-check workspace scope; read secrets only inside handlers |
| Supabase Auth + RLS | Tenant rows, roles | RLS on every `public` table; `user_roles` + `has_role`; additive migrations |
| AI gateway | Prompts, model output, provider keys | Server-only gateway; fair-use; humans Apply/Dismiss; audit provenance |
| Object storage | Evidence / canvas blobs | Signed URLs; path policies; no public bucket for tenant evidence |
| Email / webhooks | Delivery status, inbound hooks | Signature / secret verification on `src/routes/api/public/*` |
| Build & deploy (CI, Workers) | Artefacts, deploy tokens | Least-privilege workflow permissions; secrets in GitHub Secrets only |
| Lovable sync | Source on tracked branch | Tracked branch = `main` until Decision Log says otherwise; no agent push to `main` |

## STRIDE per boundary (condensed)

| Boundary | S | T | R | I | D | E |
| -------- | - | - | - | - | - | - |
| Browser | XSS / token theft via XSS | Tampered client claims | Spoofed “admin” UI | PII in analytics | Local DoS less relevant | Priv-esc via trusting client roles |
| Server fns | Session fixation / stolen bearer | Mutated payloads | Forged actor in logs | Over-broad selects | Expensive handlers | Missing auth middleware |
| RLS | Stolen JWT as another user | Policy bypass via service_role misuse | Audit gaps | Cross-tenant SELECT | Lock contention | Role on wrong table |
| AI gateway | Prompt injection | Model output treated as truth | Unattributed AI actions | Prompt leak in logs | Quota exhaustion | AI executing gate decisions |
| Storage | Signed-URL leak | Object overwrite | Missing upload audit | Cross-tenant path guess | Bucket fill | Public ACL mistake |
| Email / hooks | Spoofed webhook | Replay without nonce | Fake delivery events | Lead PII in hooks | Mail flood | Hook secret in client |
| Build / deploy | Compromised Action | Malicious PR / supply chain | Opaque release | Secret in logs/artefacts | CI exhaustion | Over-broad `permissions:` |
| Lovable sync | Compromised Lovable account | Unreviewed main push | Ambiguous authorship | Secrets in synced `.env` | Sync thrash | Bypassing PR review |

**Legend:** S spoofing · T tampering · R repudiation · I information disclosure · D denial of service · E elevation of privilege.

## Unverified assumptions

1. Live RLS policies match the intent in migrations / `docs/migration/full-schema.sql` (operator DB snapshot still required — see `docs/refactor/baseline.md`).
2. Demo / seed passwords never appear in production builds.
3. Lovable-tracked branch remains `main` and sync does not strip required review on GitHub.
4. `supabaseAdmin` is only used after caller verification inside server handlers.
5. Public API CORS and cron secrets are correctly set in every deployed environment.
6. CODEOWNERS and branch protection are applied by a human (this repo cannot set them via commit).

## Related

- Intake: `SECURITY.md`
- Baseline controls: `docs/security/*`
- Independent review checklist: `docs/process/independent-review-checklist.md`
