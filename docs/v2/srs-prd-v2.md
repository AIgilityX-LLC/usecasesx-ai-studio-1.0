# AIgilityX UseCasesX™ — SRS/PRD Version 2.0

**Product:** Global AI Use Case Repository + AI Use Case Studio™  
**Version:** 2.0  
**Date:** 2 September 2026  
**Status:** Build baseline for enhancement of the existing Lovable application  
**Product owner:** AIgilityX  

> Discover the right AI opportunities. Design them responsibly. Prove their value.

## 1. Executive decision

UseCasesX V2 will evolve from a repository and scoring tool into an enterprise AI opportunity-to-value operating system. It remains a standalone SovereignX AI Suite product and the authoritative record for business opportunities, use-case designs, prioritization decisions, portfolio dependencies, value hypotheses, approval readiness and benefit realization.

The existing application must be enhanced, not rebuilt. Lite, Pro and Enterprise remain one codebase with centralized entitlements, tenant/workspace isolation and feature flags. UseCasesX owns discovery, design and portfolio value; CyberX C3G/SARN owns authoritative governance, risk, control and assurance records; SARPI owns organizational readiness; SovereignIQ/AdvisorX owns controlled advisory intelligence. Integrations exchange versioned records without duplicating system-of-record ownership.

## 2. Review of the attached baseline

The attached Phase 0–5 Lovable pack is an implementation guide rather than a complete SRS. Its strongest foundations are:

- non-destructive audit and migration discipline;
- tenant/workspace data ownership and row-level security;
- centralized roles, entitlements, AI boundaries and audit events;
- end-to-end journey from repository discovery to portfolio, roadmap and export;
- transparent five-pillar scoring, collaboration, workshops and suite handoffs;
- production gates for security, accessibility, recovery, pilot feedback and launch.

V2 preserves those foundations. It adds the product requirements that are now necessary for enterprise differentiation: agentic use cases, an evidence-backed Use Case Canvas, stage gates, configurable scoring, value contracts and benefits tracking, data/model/vendor dependencies, regulatory applicability, assurance readiness, AI-assisted discovery with citations and human confirmation, APIs/imports, reusable patterns, localization, portfolio scenarios and operating analytics.

The 14 August 2026 launch date in the attached pack has passed. It must be retained as historical release context, not represented as a future target. V2 uses a new release baseline created after the Phase 0 audit.

## 3. Product objectives and measurable outcomes

### 3.1 Objectives

1. Reduce the time from business problem to decision-ready AI use-case brief.
2. Improve the quality and consistency of investment decisions.
3. make risk, data, ownership, evidence and value explicit before approval.
4. Create a reusable enterprise portfolio of use cases and implementation patterns.
5. Connect discovery to governance and assurance without turning UseCasesX into a duplicate GRC platform.
6. Support public-cloud, private-cloud and air-gapped deployment patterns.

### 3.2 North-star and supporting metrics

**North-star metric:** percentage of activated workspaces that produce at least one decision-ready use case within 14 days.

Supporting metrics:

- time to first captured opportunity and first completed canvas;
- discovery-to-shortlist and shortlist-to-approved conversion;
- percentage of records with named value owner, baseline, target and measurement window;
- evidence completeness and governance-readiness rates;
- projected versus realized benefit, cost variance and time-to-value;
- duplicate-use-case avoidance and reusable-pattern adoption;
- monthly active contributors, reviewer turnaround and workshop-to-portfolio conversion;
- AI suggestion acceptance, edit and rejection rates—never raw generation volume alone.

## 4. Users, roles and editions

### 4.1 Personas

- Executive Sponsor: views portfolio value, strategic alignment, risk and decisions.
- CAIO/AI Office: manages intake, standards, prioritization and portfolio governance.
- Business/Product Owner: owns the problem, outcome, adoption and benefits.
- Facilitator/Consultant: runs discovery workshops and structures opportunities.
- Data/AI Architect: assesses data, integration, model and deployment feasibility.
- Risk/Legal/Security Reviewer: records applicability, concerns and gate recommendations.
- Contributor: drafts and collaborates within assigned workspaces.
- Viewer/Auditor: read-only access to records, evidence and decision history.
- Platform/Content Admin: manages taxonomy, templates, scoring models and curated content.

### 4.2 Role model

Launch roles remain Workspace Owner, Workspace Admin, Contributor, Viewer and Facilitator. V2 adds optional Enterprise permission bundles—Executive Reviewer, Technical Reviewer, Risk Reviewer, Portfolio Manager and Content Curator—implemented as scoped permissions, not hard-coded UI role checks.

### 4.3 Edition boundaries

| Capability | Lite | Pro | Enterprise |
|---|---|---|---|
| Browse curated repository | Yes | Yes | Yes |
| Public filters and detail pages | Yes | Yes | Yes |
| Personal discovery board | Limited | Yes | Yes |
| Guided Studio and five-pillar score | Limited | Yes | Yes |
| Version history and exports | — | Yes | Yes |
| Multi-user workspace/workshops | — | Limited | Yes |
| Custom scoring, gates and taxonomies | — | — | Yes |
| Portfolio scenarios and benefits tracking | — | Basic | Advanced |
| SSO/SCIM, APIs, residency and private deployment | — | — | Yes |
| Framework mappings and CyberX C3G handoff | Preview | Standard | Configurable |

Entitlements are configuration, not separate applications. Current commercial terms must be editable by administrators and must not be embedded in source code.

## 5. Scope and bounded contexts

### 5.1 In scope

Repository, Pattern Library, Opportunity Intake, AI Use Case Studio, Use Case Canvas, AI-assisted Discovery, Scoring and Prioritization, Decision Gates, Portfolio and Opportunity Map, Roadmap and Dependencies, Value Contracts and Benefits, Workshop Mode, Collaboration, Evidence and Exports, Integrations/Handoffs, Administration, Audit/Observability, Localization and Enterprise Controls.

### 5.2 Out of scope for V2 core

- training or hosting foundation models;
- runtime monitoring of production models/agents;
- authoritative enterprise risk/control/audit management;
- automated legal conclusions or certification claims;
- autonomous approval, rejection or investment decisions;
- full project, budget or benefits-accounting replacement;
- scraping third-party content without rights and provenance.

## 6. Canonical lifecycle and state model

The user journey is:

**Discover → Capture → Design → Evidence → Score → Review → Prioritize → Approve/Hold/Reject → Roadmap → Deliver → Measure → Scale/Retire**

Canonical states:

`idea`, `triage`, `designing`, `review_ready`, `under_review`, `approved_pilot`, `on_hold`, `rejected`, `pilot`, `approved_scale`, `production`, `measuring`, `retired`, `archived`.

State transitions must be permissioned, validated and logged. A decision records decision type, decision authority, rationale, conditions, timestamp, record version and linked evidence. AI may recommend but never execute a gate decision.

## 7. Functional requirements

### FR-01 Global repository and pattern library

- Curated use cases support industry, function, organization type, geography, problem, outcome, AI capability, modality, deployment pattern, maturity, data sensitivity, autonomy level and risk indicators.
- Search supports keyword, semantic and faceted discovery with accessible filter controls.
- Each pattern distinguishes source pattern from tenant customization; updates never overwrite tenant-owned copies.
- Content records carry author, reviewer, provenance URL/reference, license/usage note, last-reviewed date, status and superseded-by link.
- Users can compare up to four use cases and save searches/collections.
- Duplicate detection proposes similar records and explains similarity; users decide whether to merge, link or continue.

### FR-02 Opportunity intake

- Capture business problem, affected users, process/workflow, pain baseline, strategic objective, desired outcome, urgency, sponsor, owner, geography and constraints.
- Support quick capture, structured intake, bulk CSV/XLSX import and workshop capture.
- Run PII/secret warnings before sending text to external AI services.
- Recommend related patterns, stakeholders and missing information with confidence and citations to workspace/repository sources.

### FR-03 Use Case Canvas V2

Every use case supports:

1. problem and current workflow;
2. target users, stakeholders and affected groups;
3. target outcome and strategic alignment;
4. AI capability and modality;
5. human role and decision authority;
6. data sources, classification, residency, quality and rights;
7. model/vendor/tool options and build/buy/partner posture;
8. integrations and business-process changes;
9. autonomy level and allowed/prohibited actions;
10. risks, impacts, controls and evidence expectations;
11. value contract, cost, benefit and adoption assumptions;
12. pilot hypothesis, success thresholds and stop/scale criteria;
13. responsible owner, reviewers and lifecycle status.

Fields support completion guidance, rationale, confidence, evidence links and change history. The interface shows completeness by decision gate, not a misleading single percentage.

### FR-04 AI and agentic use-case specification

- Classify solution type: analytics, predictive ML, generative AI, assistant/copilot, RAG, computer vision, speech, optimization, automation, agentic workflow, robotics or hybrid.
- For agentic workflows capture goal, planning method, tools/actions, identity, credentials, memory, knowledge sources, delegation, human checkpoints, action limits, transaction limits, sandbox, kill switch, observability and fallback.
- Record autonomy on a configurable scale from advisory-only through bounded autonomous action.
- Generate an Agent/AI System Card preview from confirmed data; clearly mark incomplete and AI-drafted fields.
- Security prompts cover prompt injection, sensitive-data disclosure, excessive agency, supply chain, insecure output handling, poisoning, denial/cost abuse and unbounded consumption.

### FR-05 Evidence and provenance

- Attach/link documents, URLs, notes, datasets, meeting decisions and test results.
- Evidence metadata includes source, owner, collection date, review date, confidentiality, applicable fields, integrity hash where available and retention label.
- AI-derived statements must cite the source record and distinguish quoted facts, summaries and inferences.
- Stale, missing or conflicting evidence creates warnings; it does not silently block work unless a configured gate requires it.

### FR-06 Scoring engine V2

- Preserve the five pillars: Desirability, Viability, Feasibility, Governability and Value.
- Each criterion stores score, weight, rationale, confidence, evidence, assessor and timestamp.
- Workspace administrators may clone versioned templates; published scoring versions are immutable.
- Calculate weighted score, uncertainty band and evidence completeness separately.
- Show sensitivity analysis so users can see how ranking changes when weights or uncertain assumptions change.
- Permit threshold, mandatory-field and reviewer rules by gate.
- Never label a use case “safe,” “compliant” or “approved” solely from a numeric score.

### FR-07 Governance and regulatory applicability preview

- Capture intended purpose, deployer/provider role, geography, affected persons, prohibited-use indicators, high-impact decisions, vulnerable groups, critical infrastructure, biometric use and data categories.
- Provide configurable mappings to NIST AI RMF functions, ISO/IEC 42001 control themes, EU AI Act risk concepts and OWASP GenAI/agentic security themes.
- Mappings are informational readiness aids, versioned with source/date and include “not determined.”
- Route the authoritative risk assessment, controls, assurance and approval pack to CyberX C3G/SARN through a consented handoff.

### FR-08 Decision gates and review workflow

- Default gates: Intake, Discovery Complete, Investment Review, Pilot Authorization, Scale Authorization and Retirement Review.
- Configurable required fields, evidence, reviewers, service-level target and decision authority.
- Support submit, request changes, approve with conditions, approve, hold and reject.
- Prevent self-approval where segregation-of-duties policy applies.
- Maintain immutable decision events and visible conditions until formally closed.

### FR-09 Portfolio, Opportunity Map and scenarios

- Portfolio hierarchy supports enterprise, group, company, business unit, department, program and workspace without assuming every customer uses every level.
- Visualize value versus feasibility, value versus governability, horizon, strategic theme, lifecycle, risk tier and investment band.
- Support dependency graph for data, model, vendor, platform, integration, policy, skills and prerequisite use cases.
- Scenario planning can adjust weights, budget, capacity and constraints without mutating the approved baseline.
- Detect concentration risks, duplicate investments, shared enablers and “no-regret” opportunities.

### FR-10 Roadmap and delivery handoff

- Roadmap supports horizons, waves, milestones, dependencies, accountable owner, decision gate and status.
- Produce implementation brief with scope, outcomes, assumptions, architecture considerations, data needs, controls, measures and acceptance criteria.
- Export to CSV/XLSX/PDF and via API/webhook; later connectors may target Jira, Azure DevOps, Asana and Monday.com.
- Imported delivery status must preserve source, timestamp and mapping; it must not overwrite approved decisions silently.

### FR-11 Value Contract and realization

- Required fields: business problem, baseline, target, value owner, metric formula, data source, measurement frequency, AI investment, benefit type, attribution method, measurement window and stop/scale criteria.
- Support financial, operational, customer/citizen, workforce, risk-loss-avoidance, sustainability and strategic benefits.
- Track forecast, approved, realized and confidence-adjusted value separately.
- Benefits ledger records period, actual, evidence, owner, comments and approval status.
- Dashboard exposes benefit leakage, overdue measurements and assumptions requiring validation.

### FR-12 Workshop Mode V2

- Facilitator creates agenda, participants, teams, challenge statements, timeboxes and permissions.
- Live capture supports anonymous ideation optionally, clustering, dot voting, scoring and decision parking lot.
- AI may summarize and cluster but facilitator confirms all merges and labels.
- Workshop output converts into owned opportunities/use cases with provenance to the session.
- Provide executive summary, decision log, shortlist and next-actions report.

### FR-13 Collaboration and notifications

- Field/block comments, mentions, assignments, review requests and resolution status.
- Notifications are in-app and email with digest/preferences; no sensitive content in email by default.
- Optimistic concurrency or explicit conflict handling prevents silent overwrites.
- Presence is optional; authoritative history is server-side and auditable.

### FR-14 AI copilot

- Provider-neutral server-side AI gateway supports suggest, rewrite, classify, compare, find gaps, generate questions, summarize evidence and draft briefs.
- Retrieval is scoped to authorized tenant/workspace/repository content.
- Every AI response includes status, model/provider metadata where policy allows, prompt-template version, grounded sources, confidence caveat and user feedback controls.
- Users must explicitly apply AI suggestions; original content and change diff remain available.
- Prompt/template registry, evaluation set, cost/latency telemetry, rate limits, timeouts, retries and circuit breakers are required.
- No customer content is used for model training by UseCasesX unless separately and explicitly agreed.

### FR-15 Integrations and SovereignX handoffs

- Versioned API with tenant-scoped service accounts, least privilege, idempotency keys, pagination, rate limits and audit events.
- Signed webhooks with replay protection and delivery history.
- CSV/XLSX import offers mapping, validation, preview, partial-failure report and rollback of the import batch.
- CyberX C3G/SARN handoff: use-case snapshot, system/agent context, data, jurisdiction, owners, autonomy, risk signals and evidence references.
- SARPI handoff: aggregated capability/readiness gaps without exposing record content beyond consent.
- SovereignIQ/AdvisorX: read-only, purpose-bound context packs and generated advisory artifacts returned with provenance.

### FR-16 Administration and content operations

- Manage taxonomies, templates, scoring versions, gates, roles, entitlements, feature flags, content review queue and translations.
- Publish workflow: draft → review → approved → published → deprecated/archived.
- Bulk operations require preview, permission, audit and recoverability.
- Admin impersonation is prohibited; time-bound support access must be explicit, visible and audited.

### FR-17 Reporting and exports

- Executive portfolio, use-case brief, value contract, decision pack, workshop report, roadmap and governance-readiness preview.
- Reports state data-as-of time, filters, assumptions, scoring model/version and confidentiality.
- Accessible PDF and structured export; watermark and tenant branding are configurable.

### FR-18 Localization and sovereignty

- English first; Arabic RTL is a supported enterprise locale; Urdu support is planned through the same i18n layer.
- Store UTC timestamps and display locale/time-zone aware values.
- Data residency and AI-provider routing policies are tenant-configurable.
- Private/air-gapped mode supports local identity, object storage, model endpoint, telemetry and offline content packages.

## 8. Data model requirements

Core entities: `organizations`, `workspaces`, `memberships`, `roles`, `permissions`, `entitlements`, `taxonomy_terms`, `repository_patterns`, `pattern_versions`, `opportunities`, `use_cases`, `use_case_versions`, `canvas_sections`, `solution_components`, `agents`, `agent_tools`, `data_assets`, `vendors`, `integrations`, `evidence_items`, `scorecards`, `scorecard_versions`, `scores`, `reviews`, `decisions`, `conditions`, `portfolios`, `portfolio_items`, `dependencies`, `roadmap_items`, `value_contracts`, `benefit_entries`, `workshops`, `workshop_items`, `comments`, `notifications`, `handoffs`, `imports`, `exports`, `ai_runs`, `audit_events` and `feature_flags`.

Rules:

- tenant-owned rows carry immutable `organization_id`; workspace-owned rows also carry `workspace_id`;
- ownership derives server-side from authenticated membership, never browser input;
- versioned business records use stable entity ID plus immutable version ID;
- soft delete and retention policy replace destructive deletion for business/audit records;
- audit events are append-only and reference actor, action, target, tenant, timestamp, request/correlation ID and safe metadata;
- cross-tenant foreign keys are prevented by composite constraints or validated service boundaries;
- migration is additive: add/backfill/validate/enforce, with rehearsal and rollback/forward-fix.

## 9. Non-functional requirements

### Security and privacy

- RLS/authorization denial tests for every tenant-owned table and storage path.
- SSO (OIDC/SAML) and SCIM for Enterprise; MFA delegated to identity provider where appropriate.
- Secrets only in server-side secret management; CSP, secure headers, CSRF protection where relevant and strict CORS.
- Encryption in transit and at rest; configurable customer-managed keys in the enterprise roadmap.
- Malware/type/size validation for uploads; signed short-lived download URLs.
- Privacy rights workflow, configurable retention, legal hold and region-aware subprocessors.
- AI threat model and abuse tests aligned to current OWASP GenAI risks.

### Reliability and performance

- Target 99.9% monthly availability for Enterprise excluding agreed maintenance.
- Core interactive pages: p75 LCP ≤2.5s and INP ≤200ms on representative production conditions.
- API p95 ≤500ms for ordinary CRUD/search excluding AI generation and exports.
- AI requests show progress, cancel/retry and graceful fallback; standard request timeout policy is configurable.
- Recovery objectives proposed for validation: RPO ≤24h Pro / ≤4h Enterprise; RTO ≤8h Pro / ≤4h Enterprise.

### Accessibility and quality

- WCAG 2.2 AA target; keyboard, focus, labels, contrast, reduced motion, error summaries and RTL validation.
- Responsive at mobile, tablet and desktop widths; dense enterprise tables provide usable small-screen alternatives.
- Unit, integration, contract, authorization, migration, end-to-end, accessibility and smoke tests form the release gate.

### Observability

- Structured logs with correlation IDs and redaction; no prompts, secrets or full evidence content by default.
- Metrics for errors, latency, saturation, queue depth, AI cost/token use, rate-limit events, authorization denials and webhook failures.
- Alerts have owner, severity, runbook and test evidence.

## 10. AI quality and assurance requirements

Maintain a versioned evaluation set covering discovery, classification, extraction, gap analysis, summarization and multilingual behavior. Evaluate groundedness, citation correctness, unsafe disclosure, instruction hierarchy, bias/impact concerns, tool/action boundary and refusal behavior. Release thresholds are task-specific. Failed AI quality never blocks manual product operation. High-impact suggestions require human confirmation and all applied content remains attributable.

## 11. Standards-informed design basis

- NIST AI RMF: represent Govern, Map, Measure and Manage outcomes as configurable mappings and decision evidence—not as automatic certification.
- NIST AI 600-1: include GenAI-specific risks, provenance, evaluation, content integrity, human oversight and incident considerations.
- ISO/IEC 42001: support AI policy/objective linkage, impact/risk inputs, lifecycle responsibility, supplier considerations, documented information and continual improvement handoffs.
- OWASP GenAI: incorporate prompt injection, sensitive information, supply-chain, excessive-agency, output-handling and resource-abuse considerations into the agentic canvas and test suite.
- EU AI Act: store role, intended purpose, geography and risk-applicability facts; provide configurable readiness mapping while avoiding legal determinations.

## 12. Release strategy

### Release A — Stabilize and rebaseline

Audit the actual system, reconcile the expired August plan, inventory features/data/policies, close critical isolation/security defects and create a verified backlog.

### Release B — Decision-ready Studio

Canvas V2, solution/agent specification, evidence, scoring V2, gates and decision packs.

### Release C — Portfolio-to-value

Dependencies, scenarios, roadmap, Value Contract, benefits ledger and executive dashboards.

### Release D — Enterprise and ecosystem

Custom templates/workflows, SSO/SCIM, APIs/webhooks/imports, localization, residency/private deployment and SovereignX handoffs.

## 13. Definition of done

A capability is done only when authorization and tenant isolation are tested; loading/empty/error/forbidden states exist; accessibility and responsive checks pass; audit events and telemetry are appropriate; migrations are additive and rehearsed; documentation and support guidance are updated; AI behavior has evaluation evidence and manual fallback; no dead CTA, fake metric or false compliance claim exists; and a rollback or forward-fix is documented.

## 14. V2 acceptance scenarios

1. A Pro user discovers a pattern, customizes it, completes a cited canvas, scores it and exports a decision-ready brief without admin help.
2. An Enterprise facilitator runs a workshop, converts prioritized ideas to owned use cases and preserves session provenance.
3. A reviewer requests changes, then approves a pilot with conditions; the actor, rationale, evidence and record version are immutable.
4. An agentic use case cannot pass Pilot Authorization until required action limits, human checkpoints and kill-switch fields are complete.
5. A portfolio manager compares scenarios without changing the approved baseline.
6. A value owner records baseline, target and actual benefits and the dashboard distinguishes forecast from realized value.
7. A tenant user cannot access another tenant’s record by UI, direct URL, API, search, export, storage path or AI retrieval.
8. A handoff to CyberX C3G is consented, versioned, idempotent and traceable without transferring unauthorized evidence.
9. When the AI provider is unavailable, users can complete every core workflow manually.
10. Arabic RTL renders primary Studio, portfolio, review and report journeys correctly when enabled.

## 15. Research references

- NIST, *AI Risk Management Framework* and Playbook: https://www.nist.gov/itl/ai-risk-management-framework and https://airc.nist.gov/airmf-resources/playbook/
- NIST, *Artificial Intelligence Risk Management Framework: Generative Artificial Intelligence Profile (NIST AI 600-1)*: https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf
- ISO, *ISO/IEC 42001:2023 — AI management systems*: https://www.iso.org/standard/42001
- OWASP, *Top 10 for LLM/GenAI Applications*: https://genai.owasp.org/llm-top-10/
- European Commission, *AI Act regulatory framework*: https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai

These references inform product design. UseCasesX outputs are readiness and decision-support artifacts, not legal advice, conformity assessment or certification.
