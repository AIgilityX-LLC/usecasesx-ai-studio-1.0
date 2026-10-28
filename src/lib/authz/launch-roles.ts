/**
 * Launch role catalogue — read-only reference for Enterprise Admin UI.
 * Source of truth for enforcement remains user_roles / has_role / RLS.
 */

export const LAUNCH_WORKSPACE_ROLES = [
  {
    id: "owner",
    label: "Workspace Owner",
    summary: "Full workspace control, billing contact, membership administration.",
  },
  {
    id: "admin",
    label: "Workspace Admin",
    summary: "Configure workspace settings, members, and governance workflows.",
  },
  {
    id: "contributor",
    label: "Contributor",
    summary: "Create and edit use cases, scores, and portfolio items.",
  },
  {
    id: "viewer",
    label: "Viewer",
    summary: "Read-only access to workspace artefacts.",
  },
  {
    id: "facilitator",
    label: "Facilitator",
    summary: "Run workshops and capture sessions without full admin rights.",
  },
] as const;
