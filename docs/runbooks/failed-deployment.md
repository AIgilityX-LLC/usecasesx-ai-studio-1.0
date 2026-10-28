# Runbook — Failed deployment

**Symptoms:** Publish/deploy fails, or succeeds but health/ready degrade; error budget burn after a release.  
**Related:** Cloudflare Workers + Lovable publish; route tree verify.

## Immediate

1. Stop further deploys of the same change.
2. Hit `/api/public/health` and `/api/public/ready` on production.
3. Identify the release SHA / Lovable edit and the previous known-good.

## Decide: rollback vs forward-fix

| Condition | Prefer |
| --------- | ------ |
| Ready/health failing; user-facing 5xx | **Rollback** |
| Isolated lint/type failure pre-prod | Fix forward |
| Migration half-applied | Pause traffic; restore or complete migration with DBA |

## Rollback steps

1. Redeploy previous green Worker / Lovable publish.
2. Confirm health + ready 200 and a smoke sign-in.
3. Leave additive DB migrations in place unless they are unsafe (additive-only policy — do not drop).

## Forward-fix checklist

- `bun run verify:routes`
- `bun run check:nav-integrity`
- `bun test tests/unit/ops-control-plane.test.ts`
- Relevant Playwright / RLS suites

## Close-out

- Note whether error budget requires a deploy freeze.
- Add regression coverage for the failure mode.
