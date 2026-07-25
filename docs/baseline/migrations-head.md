# Migration head (T=0)

- **Latest migration file**: `20260725094800_9af904b9-06fe-46ea-bb91-1dafa866b819.sql`
- **Total migrations tracked in `supabase/migrations/`**: 20
- **Rule going forward**: additive-only migrations (AGENTS.md §5). No
  destructive drops, renames, or ownership reassignments without a staged
  plan and rollback documented in the PR.

## How to list

```bash
ls supabase/migrations
```
