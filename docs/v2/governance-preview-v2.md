# V2-11 — Governance applicability preview and CyberX handoff

**Status:** Implemented  
**SRS:** FR-07 · FR-15 (CyberX C3G/SARN)  
**Migration:** `supabase/migrations/20260923240000_v2_11_governance_preview.sql`

## What changed

| Area | Change |
|------|--------|
| Facts | Intended purpose, provider/deployer posture, geography, affected persons, data categories, vulnerable groups, critical infrastructure, biometrics, high-impact decisions, prohibited-use indicators |
| Mappings | Versioned themes for NIST AI RMF, ISO/IEC 42001, EU AI Act concepts, OWASP GenAI — each **Applicable / Not applicable / Not determined** with source/version/date |
| Disclaimer | Conspicuous “not legal advice, certification or final risk classification” |
| Canvas | Summary card + Studio tab **Governance preview** (`/studio/use-case/$id/c3g-governance`) |
| Handoff | Consent screen → versioned outbound contract (`contractVersion` 1.0.0) → if CyberX endpoint unset: **downloadable signed-context JSON** + `suite_handoff_requests` queued; `synchronized: false` always unless a future transport delivers |

## Honest delivery

`CYBERX_C3G_HANDOFF_URL` is reserved for a future transport. Until wired, handoff always returns `package_ready` / queue — UI never claims sync.

## Files

- `src/lib/governance/*`
- `src/components/governance/GovernanceReadinessPanel.tsx`
- `src/routes/_app.studio.use-case.$id.c3g-governance.tsx`
- `tests/unit/governance-preview-v2.test.ts`

## Operator step

Apply `20260923240000_v2_11_governance_preview.sql`, open a use case → **Governance preview**.
