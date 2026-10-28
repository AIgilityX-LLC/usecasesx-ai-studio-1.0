# Enterprise Administration Center

**Route:** `/enterprise-admin`  
**Audience:** Organization owners & admins (not AIgilityX platform operators)  
**Gates:** `requireEnterpriseAdminAccessFn` (server) · `RequirePlan` (pro+) · `RequireCapability` (`workspace.manage`)

---

## Principles

1. **No security logic in UI components** — every privileged action calls existing server functions; the shell only gates visibility.
2. **Honest integration status** — Live / Partial / Planned badges. Placeholders name a TODO interface (`EnterpriseAdminUsersApi`, …) instead of fake auth.
3. **Visual language** — same tokens as the product shell (`border-border`, `bg-card`, `text-muted-foreground`, primary accents); chrome strip mirrors Platform Admin but is clearly tenant-scoped.

## Sections

See `src/lib/enterprise-admin/sections.ts` for the full catalogue (Overview through Support Access).

## Related

- Platform Admin remains `/platform-admin` (operators only).
- Organization taxonomy editor remains `/account/organization`.
- AI provider catalogue / policy: `src/lib/ai/provider`.
