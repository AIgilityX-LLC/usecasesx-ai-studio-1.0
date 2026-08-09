# Demonstration scenarios guide

UseCasesX™ ships four labelled demonstration scenarios so a complete journey can be
shown without touching real tenant data.

**All demo content is fictional.** Organisations, people, figures and evidence sources
are invented for illustration. Nothing in this material is a real client case study.

## Scenarios

| Key | Archetype | Fictional organisation |
| --- | --- | --- |
| `diversified-group` | Diversified group | Meridian Holdings (Demo) |
| `financial-services` | Financial services | Northport Mutual Bank (Demo) |
| `manufacturing` | Manufacturing | Kestrel Industrials (Demo) |
| `sme-professional-services` | SME / professional services | Calder & Ross Advisory (Demo) |

Each scenario carries a complete journey: organisation → opportunities → use cases →
scores → benefits → portfolio → roadmap staging → Opportunity Map placement (through
the opportunity business function and strategic objective) → a pre-generated report.

## Where the data lives

- Each scenario has its own **demo template workspace**, flagged `is_demo` and
  `is_demo_template` with `demo_scenario_key` set, inside a demo-flagged organisation.
- Templates are owned by the demo persona `superadmin@demo.usecasex.app`.
- No production workspace is written to by the template seeder.

## Sample copy into your own workspace

`/demo-scenarios` → **Copy sample into my workspace**:

- Creates records **you own** in your own workspace (board, opportunities, use cases,
  scores, benefits, portfolio, roadmap items, report).
- Every copied record is suffixed `(Sample)` and tagged `demo_template_key`.
- A lineage row is written to `demo_sample_copies` (scenario key, label, template
  version and record counts), visible only to you under **My sample copies**.
- Copies are ordinary, editable, tenant-owned records — not demo tenant data.

## Analytics exclusion

`activation_funnel_daily` excludes events whose workspace or organisation is flagged
`is_demo`, and events from accounts on the `@demo.usecasex.app` domain. Demonstration
traffic therefore cannot inflate activation metrics.

Sample copies live in real user workspaces and are intentionally *not* excluded — they
are genuine user activity, and their template lineage is recorded for auditing.

## Reset

`resetDemoScenarioTemplatesFn` (password-gated, same authorisation as the demo tenant
reset) purges and re-seeds every template workspace idempotently. It only touches
workspaces carrying a `demo_scenario_key`.
