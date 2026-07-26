<!-- Keep this template. Do not delete unchecked items — reviewers must see them.
     Full checklist: docs/process/pr-and-migration-checklist.md -->

## Summary

<!-- One paragraph: what and why. -->

**PROMPT**: PROMPT-NN
**Risk ID** (if any): R-NN
**Type**: feat | fix | chore | docs | refactor | test | perf | build | ci | revert
**Scope**: repository | studio | scoring | portfolio | roadmap | auth | entitlements | audit | other

## Changes

- <!-- bullet list of user-visible or structural changes -->

## Evidence

- [ ] Screenshots (UI) — 360 / 768 / 1280 px
- [ ] Playwright spec: `<name>` — green
- [ ] Migration diff (if any)
- [ ] Lighthouse (if UI on core journey)

## Definition of Done (AGENTS.md §6)

- [ ] `bun run lint` green
- [ ] `tsgo` typecheck green
- [ ] `bun run build` green
- [ ] `bun run check:nav-integrity` green
- [ ] Narrow test suite green (`test:e2e` / `test:smoke` / `test:navbar` / `test:mobile` / `test:rls`)
- [ ] Responsive + a11y verified for UI changes
- [ ] No new dead CTA / no false Enterprise claim
- [ ] No secret in source / `.env` / client bundle

## Migration (if applicable)

- [ ] Additive only
- [ ] `CREATE TABLE` → `GRANT` → `ENABLE RLS` → `CREATE POLICY` in same file
- [ ] `service_role` grants present
- [ ] `bun run test:rls` green
- [ ] Reserved schemas untouched (`auth`, `storage`, `realtime`, `supabase_functions`, `vault`)
- [ ] Second reviewer requested (auth / RLS / entitlements / audit changes)

## Lovable sync

- [ ] Confirmed Lovable-tracked branch = `main` (or branch named in latest Decision Log)
- [ ] No branch rename / delete / repoint performed

## Rollback

<!-- Usually "revert commit". Destructive migrations link to staged plan. -->
