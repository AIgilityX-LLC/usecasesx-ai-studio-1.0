# V2-05 — Evidence foundation

**Date:** 2026-09-23  
**Migration:** `supabase/migrations/20260923140000_v2_05_evidence_foundation.sql`

## What shipped

| Piece | Location |
|-------|----------|
| `evidence_items` table + RLS | Migration |
| Bucket `evidence-items` + path policies | `{workspace_id}/{subject_type}/{subject_id}/file` |
| Domain model + indicators | `src/lib/evidence/model.ts` |
| Server service + signed URLs | `src/lib/evidence/evidence.server.ts` |
| Server functions | `src/lib/evidence/evidence.functions.ts` |
| Reusable UI | `EvidencePanel`, `EvidenceActivityView` |
| Studio route | `/studio/use-case/$id/evidence` |
| Audit events | `evidence.attached/updated/revoked/accessed` |

## Metadata rules

Audit `new_value` uses `evidenceAuditMetadata()` only — **no** note body, URL, prompt, secret or personal data. File access is short-lived signed URL (60s) after RLS re-check.

## Apply

1. Run the SQL migration in the Supabase SQL Editor.  
2. Unit: `bun test tests/unit/evidence-v2-foundation.test.ts`  
3. RLS (needs demo users): `bun run tests/v2-05-evidence-rls.e2e.ts`

## Reuse

Mount `<EvidencePanel workspaceId subjectType subjectId />` on Canvas, score, review, benefit and export surfaces (V2-07+). Existing `benefit-evidence` JSON and workshop canvas documents are unchanged.
