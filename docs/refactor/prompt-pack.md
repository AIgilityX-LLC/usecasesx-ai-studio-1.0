
Absolutely. I would implement this as a controlled navigation refactor, not as a visual sidebar rewrite. The goal is to preserve the existing UseCasesX functionality while progressively turning the current feature-heavy navigation into a role-aware, lifecycle-driven enterprise SaaS information architecture.

I recommend 8 development phases, with Claude Code used for repository analysis, refactoring, implementation, testing, and documentation.

UseCasesX Enterprise Navigation Transformation
Target Architecture
The final customer-facing navigation should broadly follow:

UseCasesX™

[ Organization / Workspace ▼ ]
[ Search / Command Palette ⌘K ]

Overview

DISCOVER
  Global Repository
  Discovery Wizard
  Opportunities
  Opportunity Map
  Pattern Library

DESIGN
  AI Use Case Studio
  Use Cases
  Use Case Boards

ASSESS & PRIORITIZE
  Prioritization
  Value & ROI
  Quick Wins Matrix
  Feasibility & Data Readiness

PORTFOLIO
  PortfolioX
  RoadmapX
  Decisions & Approvals
  Pilots

GOVERN & ASSURE
  Governance
  SARPI Readiness
  C3G Governance
  Audit Trail

INTELLIGENCE
  Deployment Intelligence
  Portfolio Analytics
  Value Realization

REPORTING
  Reports
  Executive / Board Packs

──────────────────────

Integrations
Administration
Help & Support

[User / Account]
AIgilityX operational functionality should move into a separate:

/platform-admin
console.

Phase 0 — Protect The Existing Application
Objective
Before Claude Code changes navigation, establish a baseline so the team does not accidentally break:

routes
authentication
RBAC
Supabase policies
API calls
use-case workflows
admin functionality
current links/bookmarks
This phase is analysis only.

Claude Code Prompt — Repository Audit
You are working on the existing UseCasesX™ AI Studio enterprise SaaS application.

IMPORTANT:
Do not modify any code yet.

Your first task is to perform a complete architecture and navigation audit of the current repository.

Context:

UseCasesX is an enterprise AI use-case discovery, evaluation, prioritization, portfolio, governance and value-management SaaS platform.

The existing application has grown organically and currently contains a large number of sidebar routes including:

Dashboard
Global Repository
Discovery Wizard
Opportunities
Opportunity Map
Workshops
Quick Wins Matrix
ROI & Mission Value
Deployment Intelligence
AI Use Case Studio
My Use Cases
Use Case Boards
Submit a Use Case
Pattern Library
Demo Scenarios
Portfolio Roadmap
SARPI Readiness
AdvisorX Guidance
C3G Governance
Suite Handoffs
Reports
Admin Panel
Requests Inbox
Founding Access
Lead Pipeline
Email Delivery
AI Engines
Pilot Programme
Pilot Milestones
Readiness
Readiness to Launch
Launch Checks
Release Candidate
Platform Admins
Review Inbox
Submission Review
Production Readiness
Production Data Audit
Submission Audit
Export & AI Activity
Free Pro Waitlist
Pilot Mission
Request Features / Reports
Account Settings
Security
My Plan
Module Analytics

We want to redesign navigation WITHOUT breaking existing functionality.

Please inspect the repository and produce:

1. Technology stack
2. Front-end application structure
3. Routing architecture
4. Current sidebar/navigation components
5. All navigation configuration files
6. All existing routes
7. Authentication implementation
8. Authorization/RBAC implementation
9. Workspace/tenant architecture
10. Supabase integration if present
11. Current user roles
12. Feature flags if present
13. Plan/subscription gating logic
14. Admin-only functionality
15. AIgilityX internal operational functionality
16. Customer-facing functionality
17. Route dependencies
18. Deep links that could break during refactoring
19. Mobile navigation implementation
20. Existing analytics/event tracking associated with navigation

Create the following document:

docs/architecture/navigation-current-state.md

Include a table:

Current Menu
Current Route
Component
Role Restriction
Plan Restriction
Customer/Internal
Dependencies
Recommended Future Location

DO NOT change routes or components.

At the end provide:

A. Risks
B. Technical debt
C. Refactoring recommendations
D. Files likely to require modification
E. Files that should NOT be modified
Phase 0 Exit Criteria
Claude should identify every existing route before anything is renamed.

Phase 1 — Establish Enterprise Information Architecture
Now define the navigation model independently from React components.

This is important.

Do not scatter menu definitions across component files.

Create a central configuration model.

Recommended Data Structure
Something similar to:

interface NavigationItem {
  id: string
  label: string
  icon?: LucideIcon
  route?: string
  children?: NavigationItem[]

  roles?: UserRole[]
  plans?: SubscriptionPlan[]

  capability?: string
  badge?: string
  external?: boolean

  featureFlag?: string
}
Then:

interface NavigationSection {
  id: string
  label?: string
  items: NavigationItem[]
}
Claude Code Prompt — Navigation Model
Continue the UseCasesX enterprise navigation refactoring.

Before modifying the UI, create a centralized enterprise navigation architecture.

Do not delete or rename existing routes yet.

TARGET CUSTOMER NAVIGATION:

Overview

DISCOVER
- Global Repository
- Discovery Wizard
- Opportunities
- Opportunity Map
- Pattern Library

DESIGN
- AI Use Case Studio
- Use Cases
- Use Case Boards

ASSESS & PRIORITIZE
- Prioritization
- Value & ROI
- Quick Wins Matrix
- Feasibility & Data Readiness

PORTFOLIO
- PortfolioX
- RoadmapX
- Decisions & Approvals
- Pilots

GOVERN & ASSURE
- Governance
- SARPI Readiness
- C3G Governance
- Audit Trail

INTELLIGENCE
- Deployment Intelligence
- Portfolio Analytics
- Value Realization

REPORTING
- Reports
- Executive / Board Packs

UTILITY
- Integrations
- Administration
- Help & Support

BOTTOM AREA
- User
- Organization
- Workspace
- Plan

Requirements:

1. Create a centralized navigation configuration.
2. Navigation must support:
   - roles
   - plans
   - capabilities
   - feature flags
   - nested navigation
   - badges
   - disabled/unavailable features
   - external links where needed
3. Existing routes must remain operational.
4. Use stable IDs instead of labels as identifiers.
5. Do not hard-code authorization logic inside JSX.
6. Keep navigation configuration extensible for future Enterprise modules.
7. Separate:
   CUSTOMER_NAVIGATION
   ADMIN_NAVIGATION
   PLATFORM_ADMIN_NAVIGATION
8. Add TypeScript types.
9. Add comments explaining architecture decisions.
10. Add unit tests for navigation configuration.

Suggested structure:

src/
  config/
    navigation/
      customerNavigation.ts
      adminNavigation.ts
      platformAdminNavigation.ts
      navigation.types.ts
      navigation.utils.ts

Adapt paths based on the actual repository architecture.

Create:

docs/architecture/navigation-target-state.md

Include mapping from old navigation to new navigation.

Do not remove any existing page during this phase.

Run type checking, linting and existing tests when finished.
Phase 2 — Build Role-Based Navigation
This is where UseCasesX starts behaving like a real enterprise application.

Not every user should see everything.

Suggested Enterprise Roles
Initially standardize around:

Executive
AI Leader
Portfolio Manager
Business Owner
Use Case Owner
Finance Reviewer
Risk / Governance Reviewer
Workspace Admin
Platform Admin
AIgilityX Super Admin
You do not necessarily have to expose all these role names immediately.

Internally, however, build the capability structure now.

Recommended Capability Model
Instead of relying entirely on roles:

usecase.read
usecase.create
usecase.edit

opportunity.read
opportunity.create

portfolio.read
portfolio.manage

roi.read
roi.manage

governance.read
governance.review

report.read
report.generate

workspace.manage

platform.manage
This is more scalable than:

if (role === "admin")
everywhere.

Claude Code Prompt — RBAC Navigation
Implement role-aware and capability-aware navigation for UseCasesX.

First inspect the existing authentication and authorization system.

IMPORTANT:
Do not replace a working authorization architecture unnecessarily.
Extend the existing implementation wherever practical.

Navigation visibility must be based primarily on capabilities, with roles mapping to capabilities.

Suggested capabilities:

dashboard.read

repository.read

opportunity.read
opportunity.create
opportunity.manage

usecase.read
usecase.create
usecase.edit
usecase.submit

assessment.read
assessment.manage

roi.read
roi.manage

portfolio.read
portfolio.manage

decision.read
decision.approve

pilot.read
pilot.manage

governance.read
governance.review

analytics.read

report.read
report.generate

integration.read
integration.manage

workspace.manage

security.manage

platform.manage

Create or extend:

Role
Capability
RoleCapabilityMap

Suggested personas:

EXECUTIVE
AI_LEADER
PORTFOLIO_MANAGER
BUSINESS_OWNER
USE_CASE_OWNER
FINANCE_REVIEWER
GOVERNANCE_REVIEWER
WORKSPACE_ADMIN
PLATFORM_ADMIN
SUPER_ADMIN

Requirements:

1. Hide menu items users cannot access.
2. Do not rely on hidden navigation as security.
3. Route guards must enforce the same permissions.
4. Backend/database authorization must remain authoritative.
5. Existing Supabase RLS policies must not be weakened.
6. Do not expose platform administration to tenant users.
7. Unauthorized routes should return an appropriate access-denied view.
8. Add unit tests for role/capability combinations.
9. Add integration tests for protected routes.
10. Document permission mapping.

Create:

docs/security/rbac-navigation-matrix.md

Include a matrix:

Capability
Executive
AI Leader
Business Owner
Portfolio Manager
Finance
Governance
Workspace Admin
Platform Admin

Preserve backward compatibility wherever possible.
Phase 3 — Refactor The Sidebar UI
Now implement the visible change.

The sidebar should be progressively disclosed, not endlessly scrollable.

Desktop Behavior
Use:

expanded sidebar
collapsed sidebar
expandable sections
remembered expansion state
active-route highlighting
tooltip when collapsed
responsive behavior
Avoid displaying every child by default.

For example:

Discover               >
Design                 >
Assess & Prioritize    >
Portfolio              >
Govern & Assure        >
Intelligence           >
Clicking Discover:

Discover               v
   Global Repository
   Discovery Wizard
   Opportunities
   Opportunity Map
   Pattern Library
Claude Code Prompt — Sidebar Component
Refactor the UseCasesX sidebar into an enterprise SaaS navigation component.

Use the centralized navigation configuration created previously.

Design principles:

1. Clean enterprise SaaS navigation.
2. Lifecycle-driven navigation.
3. Progressive disclosure.
4. Maximum one expanded primary navigation group by default.
5. Clear active route.
6. Nested routes should keep their parent section highlighted.
7. Sidebar must support expanded and collapsed states.
8. Persist sidebar preference locally.
9. Persist expanded section if appropriate.
10. Support keyboard navigation.
11. Support accessible focus states.
12. WCAG-friendly labels and aria attributes.
13. Responsive behavior.
14. Mobile navigation must remain usable.
15. Do not duplicate navigation definitions inside components.

Visual hierarchy:

TOP:
UseCasesX logo

Workspace selector

Global search / command trigger

BODY:
Overview

Discover
Design
Assess & Prioritize
Portfolio
Govern & Assure
Intelligence
Reports

BOTTOM:
Integrations
Administration
Help

User account

Do not display unavailable integrations as multiple permanently disabled navigation rows.

Design an enterprise-standard sidebar using the project's existing Tailwind/shadcn/component system.

Do not introduce a new component framework.

Preserve the existing brand:
- dark enterprise UI
- restrained gold accent
- clear typography
- high contrast
- professional enterprise SaaS appearance

Avoid:
- excessive gradients
- unnecessary animations
- tiny text
- deep nested menus
- horizontal overflow

Create reusable components where appropriate:

EnterpriseSidebar
SidebarSection
SidebarItem
SidebarSubmenu
WorkspaceSwitcher
UserMenu

Run:
typecheck
lint
tests
build

Fix regressions before completing the task.
Phase 4 — Add Organization & Workspace Context
This is a major enterprise requirement.

The top of the sidebar should indicate:

Organization
Workspace
For example:

ACME Group
Enterprise AI Portfolio
             ▼
This matters because UseCasesX eventually needs multiple:

companies
business units
AI portfolios
departments
programs
countries
subsidiaries
without creating separate applications.

Claude Code Prompt — Workspace Context
Implement enterprise Organization and Workspace context in UseCasesX.

First inspect the current tenant/workspace data model.

Do NOT create duplicate tenant concepts if one already exists.

Goal:

A user should always understand:

1. Which organization they are working in.
2. Which workspace/portfolio context is active.

Add a WorkspaceSwitcher to the top of the sidebar.

Example:

ACME Group
Enterprise AI Portfolio ▼

Requirements:

1. Read organizations/workspaces available to the logged-in user.
2. Enforce membership permissions.
3. Switching workspace must update relevant application context.
4. Data should not leak between workspaces.
5. Existing Supabase RLS must remain authoritative.
6. Store last-selected workspace appropriately.
7. Direct URLs must validate workspace membership.
8. Handle:
   - one workspace
   - multiple workspaces
   - no workspace
   - suspended workspace
9. Display workspace loading state.
10. Display appropriate empty/error states.

Navigation counts and pages should respect the selected workspace.

Do not rebuild tenancy unless necessary.

Document:

docs/architecture/workspace-navigation-context.md

Include:
organization
workspace
user membership
role
capability
data isolation
routing
Phase 5 — Separate Customer Application From Platform Operations
This is one of the highest-priority changes.

These should disappear from the normal UseCasesX customer navigation:

Founding Access
Lead Pipeline
Email Delivery
Free Pro Waitlist
Release Candidate
Launch Checks
Production Readiness
Production Data Audit
Platform Admins
Submission Review
Review Inbox
AI Engines
unless a specific item genuinely belongs to tenant administration.

Target Architecture
/app/*
for customers.

And something equivalent to:

/platform-admin/*
for AIgilityX operators.

Platform Console
Dashboard

Tenants
Users
Plans & Entitlements

Growth Operations
   Founding Access
   Lead Pipeline
   Waitlist

Content Operations
   Review Inbox
   Submission Review
   Repository Publishing

Product Operations
   AI Engines
   Feature Flags
   Release Candidate
   Launch Checks

Production Operations
   Production Readiness
   Production Data Audit

Audit & Monitoring
   Submission Audit
   Export Activity
   AI Activity
Claude Code Prompt — Platform Admin Separation
Separate AIgilityX platform operations from the customer-facing UseCasesX application.

IMPORTANT:
Do not delete existing functionality.

Identify internal operational modules including:

Founding Access
Lead Pipeline
Email Delivery
Free Pro Waitlist
AI Engines
Release Candidate
Launch Checks
Production Readiness
Production Data Audit
Platform Admins
Review Inbox
Submission Review
Submission Audit
Export & AI Activity

Determine which functionality is:

A. Tenant customer functionality
B. Workspace administration
C. AIgilityX platform operations

Create a separate Platform Administration navigation architecture.

Preferred route namespace:

/platform-admin/*

or adapt to the application's existing routing standard.

Only authorized AIgilityX platform roles may access this area.

Requirements:

1. Remove internal platform-operation links from normal customer sidebar.
2. Preserve existing functionality.
3. Preserve route compatibility where possible.
4. Add redirects where route migration is required.
5. Implement strong authorization guards.
6. Never rely only on UI visibility for protection.
7. Keep tenant Admin separate from Platform Admin.
8. Keep Workspace Settings separate from AIgilityX Platform Operations.
9. Add tests verifying normal tenant users cannot access platform administration.
10. Add breadcrumb/context showing users when they are inside Platform Administration.

Create:

docs/architecture/platform-admin-separation.md

Document migrated routes and permission requirements.
Phase 6 — Consolidate Integrations
The current four disabled items:

SARPI Readiness
AdvisorX Guidance
C3G Governance
Suite Handoffs
should not consume permanent sidebar space.

Create:

Integrations
And then provide cards.

SovereignX Ecosystem

SARPI
Sovereign AI Readiness
[Connected]

AdvisorX
Virtual Strategic Advisors
[Available]

CyberX C3G
Governance, Security & Assurance
[Enterprise]

SovereignIQ
Institutional Intelligence
[Enterprise]
Claude Code Prompt — Integrations Hub
Redesign UseCasesX integrations navigation.

Currently several SovereignX ecosystem integrations appear directly or as disabled sidebar items.

Replace this pattern with a single:

Integrations

navigation destination.

Build an Integrations Hub page.

Initial ecosystem integrations:

SARPI
AdvisorX
CyberX C3G
SovereignIQ
Suite Handoffs
API / Webhooks where applicable

Each integration should support metadata such as:

id
name
description
icon
status
entitlement
connectionStatus
launchUrl
configurationRoute
documentationUrl
capabilities

Possible statuses:

connected
available
enterprise
coming_soon
unavailable

Do not make disabled sidebar rows for unavailable integrations.

Use cards or rows in the Integrations Hub.

Entitlement decisions should use existing subscription/feature-access mechanisms.

Do not fake integrations that do not yet exist.

For unfinished integrations, clearly mark them as:
Coming Soon
Enterprise
or Not Configured

Add tests for plan-based visibility and entitlement handling.
Phase 7 — Add Global Search And Command Palette
This will dramatically reduce dependency on navigation.

I recommend:

Search UseCasesX...
⌘ K
or:

Ctrl K
for Windows.

Search across:

use cases
opportunities
patterns
portfolios
boards
reports
people, where authorized
And quick actions:

Create Use Case
Start Discovery
Create Opportunity
Create Board
Open Portfolio
Generate Report
Claude Code Prompt — Command Palette
Implement a global command palette for UseCasesX.

Trigger:

Ctrl+K on Windows/Linux
Cmd+K on macOS

Also provide a visible search trigger near the top of the sidebar.

The command palette should initially support:

NAVIGATION
- Overview
- Global Repository
- Discovery
- Opportunities
- AI Use Case Studio
- Use Cases
- Portfolio
- Governance
- Reports

ACTIONS
- Create Use Case
- Start Discovery
- Create Opportunity
- Create Board
- Open Portfolio

SEARCH ENTITIES
where current APIs/data services safely support it:
- Use Cases
- Opportunities
- Patterns
- Boards
- Portfolios

Requirements:

1. Respect RBAC.
2. Respect active workspace.
3. Never expose unauthorized search results.
4. Keyboard navigation.
5. Accessible labels.
6. Fast response.
7. Debounce search.
8. Handle zero results.
9. Group search results by entity type.
10. Reuse current application services instead of duplicating API logic.

Do not implement broad global database search unless appropriate indexes and authorization exist.

Start with navigation/actions if entity search needs additional backend architecture.

Add tests.
Phase 8 — Introduce Contextual Module Navigation
Do not turn every use-case capability into a sidebar link.

Once someone opens a Use Case, use a local tab navigation.

For example:

Predictive Maintenance

Overview
Business Problem
AI Solution
Value
ROI
Feasibility
Data
Governance
Delivery
Decisions
Activity
Similarly, Pilot Milestones should live inside a Pilot.

Not globally.

Claude Code Prompt — Context Navigation
Review UseCasesX pages that currently create global navigation items for object-level functionality.

Goal:

The global sidebar should represent major product destinations.

Object-specific functionality should use contextual navigation.

For a Use Case, design a contextual navigation pattern similar to:

Overview
Business Problem
AI Solution
Value
ROI
Feasibility
Data
Governance
Implementation
Decisions
Activity

For a Pilot:

Overview
Objectives
Milestones
KPIs
Risks
Evidence
Activity

For a Portfolio:

Overview
Use Cases
Roadmap
Investment
Value
Risks
Decisions

Requirements:

1. Do not duplicate pages unnecessarily.
2. Preserve existing functionality.
3. Reuse existing routes where possible.
4. Introduce nested routes only when beneficial.
5. Keep direct URLs bookmarkable.
6. Preserve browser history.
7. Add breadcrumbs.
8. Maintain authorization per tab/route.
9. Hide tabs users cannot access.
10. Mobile layout must remain usable.

Identify existing global navigation items that should become contextual pages and document them before migrating.

Create:

docs/ux/contextual-navigation-migration.md
Phase 9 — Improve Use Case Domain Architecture
This is bigger than navigation, but this navigation redesign gives you an opportunity to formalize the UseCasesX core lifecycle.

I strongly recommend these four principal entities:

OPPORTUNITY

        ↓

USE CASE

        ↓

PORTFOLIO INITIATIVE

        ↓

PILOT / IMPLEMENTATION

        ↓

VALUE REALIZATION
The lifecycle becomes:

Discover
    ↓
Design
    ↓
Assess
    ↓
Prioritize
    ↓
Approve
    ↓
Pilot
    ↓
Scale
    ↓
Measure
This can ultimately become one of the strongest differentiators of UseCasesX.

Claude Code Prompt — Domain Review
Do not immediately ask Claude to rebuild the database.

First make Claude analyze.

Perform a domain-model review of UseCasesX.

DO NOT modify database schemas during this task.

We want to determine whether the current architecture clearly distinguishes these business objects:

1. Opportunity
2. AI Use Case
3. Portfolio Initiative
4. Pilot / Implementation
5. Value Realization

Business lifecycle:

Discover
→ Design
→ Assess
→ Prioritize
→ Approve
→ Pilot
→ Scale
→ Measure

Inspect:

database schema
Supabase tables
TypeScript models
API/services
forms
routes
status fields
foreign keys
audit trails
portfolio relationships

Determine:

A. Current entities
B. Entity overlap
C. Missing relationships
D. Ambiguous status fields
E. Data migration risks
F. Recommended target domain model

Do NOT change schemas.

Produce:

docs/architecture/usecasesx-domain-model-review.md

Also propose an ERD in Mermaid syntax.

The recommended architecture must support:

enterprise portfolios
multiple workspaces
approval workflows
governance
ROI/value tracking
pilot tracking
auditability
future API integration

Do not over-engineer.
Phase 10 — Reports Should Become Executive Outputs
Your Reports navigation can become much more powerful.

Instead of merely:

Reports

eventually provide:

Reports

Executive Summary
AI Portfolio Report
Board Pack
AI Investment Report
Value Realization
Governance Summary
Use Case Business Case
Export Center
But these should mostly be produced through a Reports Hub, rather than seven sidebar entries.

Claude Prompt
Refactor reporting navigation into a Reports Hub.

Do not add every report type to the global sidebar.

Global navigation should contain:

Reports

The Reports Hub may offer:

Executive Summary
Board Pack
Portfolio Report
AI Investment Report
ROI / Value Report
Governance Summary
Use Case Business Case
Export Center

For each report identify:

target audience
required permissions
required data
available output formats
existing implementation
missing implementation

Do not invent backend functionality.

Where reports do not yet exist, display them as planned capabilities only if the product currently uses roadmap/coming-soon patterns.

Keep reporting architecture modular for future PDF/Excel/PowerPoint generation.
Phase 11 — Add Navigation Analytics
This is useful because after launch you should learn how customers actually use UseCasesX.

Track:

navigation_clicked
module_opened
search_used
workspace_switched
use_case_created
discovery_started
portfolio_opened
report_generated
integration_opened
Do not capture sensitive use-case content.

Claude Code Prompt
Review the existing analytics/event tracking architecture.

Add privacy-conscious product navigation analytics where an appropriate analytics mechanism already exists.

Events may include:

navigation_clicked
sidebar_expanded
sidebar_collapsed
workspace_switched
command_palette_opened
search_used
module_opened

Relevant business events may already exist and should not be duplicated.

Event metadata may include:

navigationItemId
module
workspaceType
roleCategory
plan

Do NOT send:

use case descriptions
business confidential data
personal information
prompts
uploaded document content
financial values

Avoid adding a new analytics vendor unless explicitly approved.

Document:

docs/analytics/navigation-events.md
Phase 12 — Enterprise QA And Regression Testing
This phase is mandatory.

Test across roles and plans.

A navigation redesign can look great while silently exposing an admin route.

Test Matrix
Claude should validate at minimum:

Test	Free	Pro	Enterprise	Admin
Overview	✓	✓	✓	✓
Discover	✓	✓	✓	✓
Studio	Limited	✓	✓	✓
Portfolio	—/Limited	✓	✓	✓
Governance	—	Limited	✓	✓
Integrations	Limited	✓	✓	✓
Workspace Admin	—	—	Admin	✓
Platform Console	✕	✕	✕	✓
Your actual entitlements should come from the existing product model rather than blindly applying this table.

Claude Code Prompt — QA
Perform comprehensive regression testing of the UseCasesX enterprise navigation refactor.

Test:

DESKTOP
1440px
1280px
1024px

TABLET
768px

MOBILE
390px
375px

Validate:

1. Sidebar expanded state
2. Sidebar collapsed state
3. Mobile navigation
4. Active routes
5. Nested routes
6. Browser back/forward
7. Direct URL navigation
8. Refresh on nested route
9. Workspace switching
10. Role visibility
11. Plan entitlements
12. Platform-admin isolation
13. Unauthorized routes
14. Search/command palette
15. Keyboard navigation
16. Screen-reader labels
17. Long navigation labels
18. Empty states
19. Loading states
20. Error states

SECURITY TESTS:

Attempt accessing protected routes directly.

Tenant users must never gain access to platform administration simply by entering the URL.

Confirm database authorization and RLS remain intact.

Run:

unit tests
integration tests
type checking
linting
production build

Provide a final regression report:

docs/testing/navigation-regression-report.md

Do not mark the task complete until compilation and relevant tests pass.
Phase 13 — Controlled Release
Don't replace the production navigation for everybody immediately.

Use something such as:

enterprise_navigation_v2
feature flag.

Rollout:

Development
     ↓
Internal AIgilityX
     ↓
Founding Users
     ↓
Selected Pilot Customers
     ↓
10%
     ↓
50%
     ↓
100%
Claude Code Prompt — Feature Flag Rollout
Prepare the new UseCasesX enterprise navigation for controlled rollout.

Use the existing feature flag architecture if one exists.

Suggested feature flag:

enterprise_navigation_v2

Do not create a separate feature-flag framework if the application already has one.

Requirements:

When OFF:
existing navigation remains operational.

When ON:
new enterprise navigation appears.

Both navigation versions must resolve to the same underlying application functionality wherever practical.

Add:

rollback capability
error monitoring hooks
migration notes
QA checklist

Document:

docs/releases/enterprise-navigation-v2-rollout.md

Include:

deployment steps
rollback steps
known risks
verification checklist
post-release metrics
Development Sequence I Recommend
Don't ask the team to run all these prompts together.

I would execute them in this order:

PHASE 0
Current-State Audit

          ↓

PHASE 1
Navigation Configuration

          ↓

PHASE 2
RBAC + Capabilities

          ↓

PHASE 3
Enterprise Sidebar UI

          ↓

PHASE 4
Workspace Context

          ↓

PHASE 5
Platform Admin Separation

          ↓

PHASE 6
Integrations Hub

          ↓

PHASE 7
Command Palette

          ↓

PHASE 8
Contextual Navigation

          ↓

PHASE 9
Domain Architecture Review

          ↓

PHASE 10
Reports Hub

          ↓

PHASE 11
Analytics

          ↓

PHASE 12
QA / Security

          ↓

PHASE 13
Controlled Rollout
Suggested Execution Schedule
This is realistic for an existing application:

Stage	Approx. Effort
Audit	0.5–1 day
Navigation architecture	1 day
RBAC integration	1–2 days
Sidebar UI	1–2 days
Workspace context	1–2 days
Platform Admin separation	1–2 days
Integration Hub	1 day
Command palette	1 day
Context navigation	1–2 days
QA/security	1–2 days
Release	0.5 day
Rough target:

10–15 development days, depending heavily on how clean the current route/RBAC architecture already is.

Master Instruction To Put In CLAUDE.md
I would also add a permanent development rule to your repository so Claude Code doesn't start generating unnecessary routes every time you add a feature.

Add something like this to CLAUDE.md:

# UseCasesX Navigation Architecture Rules

UseCasesX is an enterprise AI Use Case Management and AI Investment Decision platform.

Its product lifecycle is:

Discover
→ Design
→ Assess
→ Prioritize
→ Approve
→ Pilot
→ Scale
→ Measure

## Navigation Principles

1. Do not add a global sidebar item simply because a new feature is created.

2. Global sidebar items represent major user destinations, not individual functions.

3. Prefer contextual navigation inside:
   - Use Cases
   - Portfolios
   - Pilots
   - Opportunities

4. Customer-facing and AIgilityX platform administration must remain separated.

5. Navigation visibility must respect:
   - authentication
   - authorization
   - capability
   - workspace
   - subscription entitlement
   - feature flags

6. UI visibility is never an authorization control.

7. Backend authorization and Supabase RLS remain authoritative.

8. Use stable navigation IDs rather than labels.

9. Do not duplicate route definitions.

10. Do not hard-code role checks throughout UI components.

11. Prefer capabilities over direct role comparisons.

12. Preserve backward-compatible routes during refactoring wherever practical.

13. Never weaken tenant data isolation.

14. New modules should first determine whether they belong under:

Discover
Design
Assess & Prioritize
Portfolio
Govern & Assure
Intelligence
Reports
Integrations
Administration

15. AIgilityX operational tools belong in Platform Administration, not normal customer navigation.

16. A feature inside a Use Case should normally become a contextual tab, not a global navigation item.

17. The navigation architecture must remain usable on desktop, tablet and mobile.

18. Follow existing project technologies and design-system components unless architectural change has explicitly been approved.

19. Run type checking, linting and relevant tests after material changes.

20. Do not perform destructive database migrations without explicit approval.
That one file will save you considerable trouble as UseCasesX grows.

One More Important Recommendation
I would not tell Claude Code to redesign the whole application in one prompt.

Use this operating pattern for every phase:

1. Inspect
2. Explain current architecture
3. Propose changes
4. Identify files
5. Identify risks
6. Implement
7. Test
8. Report what changed
A useful prefix for almost every implementation prompt is:

Before writing code:

1. Inspect the relevant existing implementation.
2. Reuse existing architecture wherever reasonable.
3. Identify dependencies and regression risks.
4. Do not rewrite unrelated modules.
5. Do not modify database schemas unless explicitly requested.
6. Do not weaken authentication, authorization or RLS.
7. Preserve existing routes unless migration is explicitly approved.
8. Make the smallest coherent architectural change.
9. Run tests, lint, typecheck and build afterward.
10. Summarize changed files and remaining issues.
This is especially important for a Lovable-originated application. Claude Code is excellent for restructuring it, but uncontrolled prompts can easily turn a working application into a technically "cleaner" application with broken workflows.

For UseCasesX, the target isn't merely a prettier menu. The architecture should make the product feel like one coherent enterprise workflow:

Discover the opportunity → build the AI use case → prove its value → prioritize investment → govern the decision → execute pilots → measure realized value.

That should now become the product architecture as well as the navigation architecture.




