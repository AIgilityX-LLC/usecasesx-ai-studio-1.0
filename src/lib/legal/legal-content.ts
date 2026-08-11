/**
 * Legal and transparency content.
 *
 * Single source of truth for the published Terms, Privacy notice, Acceptable
 * Use policy, AI notice, Founding Access terms and data export/deletion
 * guidance. Content lives here as plain data so the same wording can be
 * rendered, linked, tested and reviewed without being buried in JSX.
 *
 * Deliberate constraints, enforced by tests/unit/legal-content.test.ts:
 *  - no certification, regulatory-compliance or "guaranteed" security claims;
 *  - Founding Access end date and fair-use limits come from
 *    `src/lib/founding-access.ts`, which reads the limits the server enforces;
 *  - every document states that it awaits formal legal review.
 */
import { FOUNDING_ACCESS_END, FOUNDING_ACCESS_TERMS, LAUNCH_DATE } from "@/lib/founding-access";
import { SUPPORT_EMAIL } from "@/lib/feedback/feedback.model";

/** Date this wording was last edited by the product team. */
export const LEGAL_LAST_UPDATED = "11 August 2026";
/** Date the published wording takes effect for users. */
export const LEGAL_EFFECTIVE_DATE = LAUNCH_DATE;

export const PRIVACY_CONTACT = "privacy@usecasesx.ai";

/**
 * Shown on every legal page. States plainly that these documents are
 * pre-review operating terms, so nothing here reads as certified advice.
 */
export const LEGAL_REVIEW_NOTICE =
  "Legal review pending. This document describes how UseCasesX actually operates today and is written in plain language by the product team. It has not yet been reviewed or approved by external counsel, and it is not legal advice. Wording may change after review; material changes will be published here with a new effective date.";

export type LegalSection = {
  heading: string;
  /** Paragraphs, rendered in order. */
  body?: string[];
  /** Bulleted points rendered after the paragraphs. */
  bullets?: string[];
};

export type LegalDocumentKey =
  | "terms"
  | "privacy"
  | "acceptable-use"
  | "ai-notice"
  | "founding-access-terms"
  | "data-rights";

export type LegalDocument = {
  key: LegalDocumentKey;
  /** Route path; must exist as a real route. */
  path: string;
  /** Short label used in navigation and cross-links. */
  navLabel: string;
  title: string;
  /** <60 chars incl. suffix is enforced by the route head, not here. */
  metaTitle: string;
  metaDescription: string;
  intro: string;
  sections: LegalSection[];
};

const AI_DECISION_SUPPORT =
  "AI assistance in UseCasesX is decision support, not a decision. Every AI-generated draft, score rationale, narrative or recommendation must be reviewed and validated by a competent human before it is used to fund, approve, procure, deploy or govern anything.";

export const LEGAL_DOCUMENTS: LegalDocument[] = [
  {
    key: "terms",
    path: "/terms",
    navLabel: "Terms of Use",
    title: "Terms of Use",
    metaTitle: "Terms of Use — UseCasesX",
    metaDescription:
      "The operating terms for UseCasesX Lite, Pro Founding Access and Enterprise Design Partner engagements, including content ownership, AI assistance and account termination.",
    intro:
      "These terms describe the agreement between you and AIgilityX when you browse or use UseCasesX™. They are written to be readable rather than defensive.",
    sections: [
      {
        heading: "Who these terms cover",
        body: [
          "They apply to anyone who browses the public repository (Lite), holds a Pro Founding Access account, or uses UseCasesX under an Enterprise Design Partner engagement. Enterprise engagements may add a signed agreement; where that agreement and these terms differ, the signed agreement governs.",
        ],
      },
      {
        heading: "Your account and workspace",
        bullets: [
          "You are responsible for the accuracy of the information you enter and for the activity of accounts you invite into your workspace.",
          "Workspace roles (owner, admin, contributor, viewer, facilitator) determine what each member can see and change. Choose them deliberately.",
          "Do not share credentials. Invite people individually so the audit trail stays meaningful.",
          "You may close your account at any time. See the data export and deletion page for what happens to your content.",
        ],
      },
      {
        heading: "What you own, and what we own",
        bullets: [
          "You own the opportunities, use cases, scores, portfolios, roadmaps, benefits and reports you create in your workspace. We do not claim ownership of your content.",
          "We own the platform, the curated public repository records, the scoring and pattern frameworks, and the UseCasesX™, AI Use Case Studio™, PortfolioX™ and RoadmapX™ names.",
          "We process your workspace content to operate the product for you: storing it, rendering it, exporting it on request, and — only when you invoke an AI feature — sending the relevant fields to an AI provider on your behalf.",
          "We do not use your private workspace content to train AI models.",
        ],
      },
      {
        heading: "Public repository content",
        body: [
          "Published repository records are curated reference material. They carry a provenance label and a quality status so you can judge how much weight to place on them. They describe patterns observed in the market; they are not statements about any named organisation, and they are not a promise that a use case will work in your context.",
        ],
      },
      {
        heading: "AI assistance",
        body: [
          AI_DECISION_SUPPORT,
          "AI features are metered under published fair-use limits and may be paused, changed or temporarily unavailable. The AI notice explains what is sent, what is retained and where the human checkpoint sits.",
        ],
      },
      {
        heading: "Availability and change",
        bullets: [
          "UseCasesX is delivered as a service and is actively developed. Features may be added, changed or withdrawn.",
          "We do not offer an uptime guarantee or a service credit scheme during Founding Access.",
          "Capabilities described as designed but not live are labelled as such in the product. Do not plan on them until they ship.",
        ],
      },
      {
        heading: "Limits of responsibility",
        body: [
          "UseCasesX helps you structure and evidence decisions; it does not make them. We are not responsible for investment, procurement, employment, safety, regulatory or governance outcomes that follow from how you use the product or its AI output. Nothing in the product is legal, financial, medical or regulatory advice.",
          "To the extent permitted by applicable law, our aggregate liability for any claim relating to the service is limited to the fees you paid for it in the twelve months before the claim. Founding Access is complimentary, so that amount may be zero.",
        ],
      },
      {
        heading: "Suspension",
        body: [
          "We may suspend or close an account that breaches the Acceptable Use policy, threatens platform stability, or attempts to extract the repository in bulk. Where we can do so safely, we will tell you first and give you the chance to export your content.",
        ],
      },
      {
        heading: "Questions and changes to these terms",
        body: [
          `Material changes are published on this page with a new effective date, and Founding Access workspaces are notified. Questions go to ${SUPPORT_EMAIL}.`,
        ],
      },
    ],
  },
  {
    key: "privacy",
    path: "/privacy",
    navLabel: "Privacy notice",
    title: "Privacy notice",
    metaTitle: "Privacy Notice — UseCasesX",
    metaDescription:
      "What personal data UseCasesX collects, why, how long it is kept, who processes it, how product analytics work, and how to export or delete your data.",
    intro:
      "This notice explains what we collect, why we collect it, and what you can do about it. Browsing the public repository does not require an account.",
    sections: [
      {
        heading: "What we collect",
        bullets: [
          "Account data: name, email address, organisation and role, from registration or a workspace invitation.",
          "Workspace content: the opportunities, use cases, scores, portfolios, roadmaps, benefits, comments and reports you create, plus files you upload.",
          "Product events: which surfaces you use, exports you generate, AI requests you make and their outcome. These power fair-use metering, the audit trail and aggregate product analytics.",
          "Support and feedback: the content of feature requests, bug reports and support messages you send, so we can respond and track them to resolution.",
          "Technical data: IP address, browser and device information present in ordinary web requests and security logs.",
        ],
      },
      {
        heading: "Why we process it",
        bullets: [
          "To operate the product for you and your workspace.",
          "To enforce entitlements and published fair-use limits.",
          "To maintain an append-only audit trail of governance-relevant actions such as publishing, exporting, handoffs and membership changes.",
          "To detect and stop abuse, credential misuse and cross-workspace access attempts.",
          "To improve the product using aggregate, de-identified usage patterns.",
          "To reply to you when you contact support.",
        ],
      },
      {
        heading: "Analytics and cookies",
        body: [
          "We do not run third-party advertising trackers and we do not sell personal data. Public browsing is not gated behind a consent banner because it does not set advertising or cross-site tracking cookies.",
        ],
        bullets: [
          "Strictly necessary cookies and local storage: your sign-in session, workspace selection and interface preferences. These are required for a signed-in session to work.",
          "First-party product analytics: usage events recorded in our own database and tied to your account so admins can see workspace activity and we can see which surfaces are used. They are not shared with advertising networks.",
          "You can clear this storage in your browser at any time; doing so signs you out.",
        ],
      },
      {
        heading: "Public and private content",
        bullets: [
          "The curated repository is public and indexable by search engines.",
          "Everything inside your workspace is private by default and isolated by row-level security in the database, not only in the interface.",
          "Content becomes visible outside your workspace only when you act: submitting a use case for publication, sharing a report link, inviting someone, running a workshop or approving a suite handoff.",
          "Share links can be revoked. Revoking a link stops further access through it.",
        ],
      },
      {
        heading: "Who else processes your data",
        body: [
          "We use a small number of infrastructure providers to run the service: managed cloud hosting and database, transactional email, and AI model providers for AI features only. Providers act on our instructions. The AI notice lists what is sent when you invoke an AI feature.",
        ],
      },
      {
        heading: "How long we keep it",
        bullets: [
          "Workspace content: until you delete it or close the workspace.",
          "Audit events: retained as an append-only record for governance purposes; they are not editable, including by us through the product.",
          "Product and security events: retained for a rolling operational window, then aggregated.",
          "Support conversations: retained while the request is open and for a reasonable period afterwards for continuity.",
        ],
      },
      {
        heading: "Your choices",
        body: [
          "You can access, export, correct or delete your content, and ask us to delete your account. The data export and deletion page explains exactly how, and what an audit trail means for deletion.",
        ],
      },
      {
        heading: "Security posture — stated plainly",
        body: [
          "We apply workspace-scoped row-level security, server-side authorisation on downloads and exports, signed URLs with short lifetimes, upload type and size limits, rate limits on AI endpoints, and alerting on repeated denied access attempts. Provider secrets are never present in browser code or public configuration.",
          "We do not claim any certification, audit outcome or regulatory compliance status, and we do not promise that a breach cannot occur. Report a suspected vulnerability to the security contact below and we will investigate.",
        ],
      },
      {
        heading: "Contact",
        body: [
          `Privacy questions: ${PRIVACY_CONTACT}. Product and support questions: ${SUPPORT_EMAIL}. If you are in a jurisdiction with a statutory data protection authority, you may also complain to it.`,
        ],
      },
    ],
  },
  {
    key: "acceptable-use",
    path: "/acceptable-use",
    navLabel: "Acceptable Use",
    title: "Acceptable Use policy",
    metaTitle: "Acceptable Use Policy — UseCasesX",
    metaDescription:
      "What is and is not acceptable use of UseCasesX, including bulk extraction, AI abuse, uploads, collaboration conduct and how we enforce the policy.",
    intro:
      "This policy protects the repository, the platform and other workspaces. It applies to every edition.",
    sections: [
      {
        heading: "Use the product for real work",
        bullets: [
          "Evaluate and use UseCasesX for your own organisation's AI portfolio work.",
          "Invite colleagues individually, with the role they actually need.",
          "Attribute repository material when you reuse it in your own documents.",
        ],
      },
      {
        heading: "Do not extract the repository in bulk",
        bullets: [
          "No scraping, crawling for republication, automated enumeration of records, or systematic export intended to reproduce the repository.",
          "No reselling, sublicensing or redistributing curated repository content as your own dataset or product.",
          "Reasonable manual research, comparisons and individual exports are fine.",
        ],
      },
      {
        heading: "Do not abuse AI assistance",
        bullets: [
          "No attempts to bypass fair-use limits through multiple accounts, shared credentials or automation.",
          "No prompt content designed to extract system instructions, other workspaces' data, or provider credentials.",
          "No use of AI features to generate unlawful, harmful, deceptive or discriminatory material.",
        ],
      },
      {
        heading: "Do not upload what you should not",
        bullets: [
          "No malware, and nothing outside the published file type and size limits — the upload dialog states both.",
          "No special-category personal data, credentials, secrets or export-controlled material.",
          "No content you do not have the right to share.",
        ],
      },
      {
        heading: "Respect other people and other workspaces",
        bullets: [
          "No probing or attempting to access another workspace's data, share links or reports. Attempts are logged and alerted on.",
          "No harassment or abuse in comments, workshops, assignments or support messages.",
          "No penetration testing of the platform without written agreement.",
        ],
      },
      {
        heading: "How we enforce this",
        body: [
          "Automated controls block most abuse patterns directly: rate limits, retry cooldowns after authorisation failures, upload validation and workspace-scoped policies. Repeated or deliberate breaches lead to a warning, then suspension, then closure. Where we can do so safely we will tell you before closing an account so you can export your content.",
        ],
      },
    ],
  },
  {
    key: "ai-notice",
    path: "/ai-notice",
    navLabel: "AI notice",
    title: "AI notice",
    metaTitle: "AI Notice — How UseCasesX Uses AI",
    metaDescription:
      "How AI assistance works in UseCasesX: what it drafts, what is sent to providers, what is never used for training, fair-use metering and where human validation is required.",
    intro: AI_DECISION_SUPPORT,
    sections: [
      {
        heading: "Where AI is used",
        bullets: [
          "Drafting use case descriptions, problem statements and expected benefits in AI Use Case Studio™.",
          "Suggesting scoring rationale for feasibility, data readiness and value — never the final score you commit to.",
          "Summarising a portfolio or roadmap into narrative sections of a report.",
          "Helping you phrase an opportunity captured from a workshop or conversation.",
        ],
      },
      {
        heading: "Where AI is never used",
        bullets: [
          "Approving a submission into the public repository. Publication requires a human reviewer with an admin role.",
          "Granting entitlements, roles or workspace access.",
          "Deciding what your organisation should fund. The product records your decision; it does not make it.",
        ],
      },
      {
        heading: "What is sent to an AI provider",
        body: [
          "Only the fields relevant to the feature you invoked — for example the use case you are editing — plus our instructions to the model. Requests run server-side. Provider credentials never reach your browser.",
        ],
        bullets: [
          "We do not send your workspace membership list, other workspaces' content, or your credentials.",
          "We do not use your private workspace content to train models, and we instruct providers not to.",
          "Inputs are validated and sanitised before they are sent, which also limits prompt-injection paths through pasted content.",
        ],
      },
      {
        heading: "Accuracy and human validation",
        bullets: [
          "AI output can be confidently wrong, out of date, or generic. Treat every draft as a starting point.",
          "Check figures, benefit claims, regulatory statements and technical feasibility against your own sources before circulating them.",
          "The person who accepts a draft owns it. Audit events record who saved, scored, published or exported — not the model.",
          "Where AI drafted content, the product shows it as a draft you must confirm rather than saving silently on your behalf.",
        ],
      },
      {
        heading: "Fair-use metering",
        body: [
          `AI assistance is metered per user and per workspace over a rolling 24-hour window, with a short-burst limit to stop runaway automation. When a limit is reached, AI generation pauses until the window resets and everything you have already created stays available. Current limits are published on the Founding Access terms page and remain in force through ${FOUNDING_ACCESS_END}.`,
        ],
      },
      {
        heading: "Reporting a bad AI output",
        body: [
          `If AI output is wrong, unsafe or inappropriate, report it from Help & Support. Include the surface you were on and what you expected. Reports are triaged with priority and tracked to resolution, and can be sent to ${SUPPORT_EMAIL}.`,
        ],
      },
    ],
  },
  {
    key: "founding-access-terms",
    path: "/founding-access-terms",
    navLabel: "Founding Access terms",
    title: "Pro Founding Access terms",
    metaTitle: "Founding Access Terms — UseCasesX Pro",
    metaDescription:
      "Pro Founding Access is complimentary through 31 December 2026, subject to published fair-use limits. What is included, what is metered and what happens next.",
    intro: `Pro Founding Access is complimentary from launch on ${LAUNCH_DATE} through ${FOUNDING_ACCESS_END}. No card is required and no charge is applied in that period.`,
    sections: [
      {
        heading: "The offer in one paragraph",
        body: [
          `Register a Pro Founding Access workspace at no cost. It stays complimentary until ${FOUNDING_ACCESS_END}. AI assistance is subject to the published fair-use limits. Pricing after that date has not been set; we will give written notice before any paid plan applies, and your content remains exportable throughout.`,
        ],
      },
      { heading: "Terms in detail", bullets: [...FOUNDING_ACCESS_TERMS] },
      {
        heading: "What is not included",
        bullets: [
          "No uptime, response-time or service-credit commitment during Founding Access.",
          "No Enterprise capabilities that the product labels as designed but not live — for example group-level portfolio roll-up, SSO and directory provisioning, or automated ERP benefit verification.",
          "No advisory or workshop delivery. Those are separate engagements.",
        ],
      },
      {
        heading: `What happens after ${FOUNDING_ACCESS_END}`,
        bullets: [
          "You will be notified in writing before any paid plan applies to your workspace.",
          "You will not be charged automatically at the end of Founding Access.",
          "If you choose not to continue, your export rights and the deletion process described on the data page still apply.",
        ],
      },
    ],
  },
  {
    key: "data-rights",
    path: "/data-rights",
    navLabel: "Export & deletion",
    title: "Export and delete your data",
    metaTitle: "Data Export & Deletion — UseCasesX",
    metaDescription:
      "How to export your UseCasesX portfolios, roadmaps, scorecards and deliverables, how to delete content or your whole account, and what the audit trail means for deletion.",
    intro:
      "You can take your work out of UseCasesX at any time, and you can ask us to delete it. This page states exactly how, and it is honest about the one thing deletion does not remove.",
    sections: [
      {
        heading: "Export it yourself, now",
        bullets: [
          "Portfolios and roadmaps: open the portfolio or roadmap and use its export action for PDF or CSV.",
          "Reports and deliverables: generate the report, then export the package. An export receipt records who exported what and when.",
          "Repository research: individual use case PDFs are available from each use case page.",
          "Saved items, boards and collections: export from the list view.",
          "Admin exports: workspace and platform admins can export request queues, pilot funnels, checkpoint answers and audit trails as CSV.",
        ],
      },
      {
        heading: "Ask for a full copy",
        body: [
          `If you want a single machine-readable copy of everything in your workspace, request it from Help & Support or email ${PRIVACY_CONTACT} from the address on the account. We verify that you own or administer the workspace before sending anything, and we aim to respond within 30 days.`,
        ],
      },
      {
        heading: "Delete specific content",
        bullets: [
          "You can delete opportunities, use cases, scores, portfolios, roadmaps, boards, collections and uploads you own directly in the product.",
          "Deleting an item removes it from your workspace views immediately.",
          "Revoke a share link to stop further access through that link.",
        ],
      },
      {
        heading: "Delete your account or workspace",
        body: [
          `Request account or workspace deletion from Help & Support, or email ${PRIVACY_CONTACT} from the account address. Export first — deletion is not reversible. We confirm the request, verify ownership, and then remove account data and workspace content.`,
        ],
      },
      {
        heading: "What deletion does not remove — and why",
        bullets: [
          "Append-only audit events remain. They record that an action happened (who, what, when) so a governance record cannot be rewritten after the fact. They are minimised and are not used to reconstruct deleted content.",
          "Aggregate, de-identified product metrics remain, because they no longer identify you.",
          "Content you deliberately published to the public repository, or shared into another workspace through a handoff, stays with the receiving surface. Ask us if you need a published record withdrawn.",
          "Ordinary backups roll off on their normal cycle.",
        ],
      },
      {
        heading: "Correcting your data",
        body: [
          "Profile details are editable in your account. If something outside your control is wrong, contact support and we will correct it.",
        ],
      },
    ],
  },
];

export function legalDocument(key: LegalDocumentKey): LegalDocument {
  const doc = LEGAL_DOCUMENTS.find((entry) => entry.key === key);
  if (!doc) throw new Error(`Unknown legal document: ${key}`);
  return doc;
}

/** Cross-links rendered at the foot of every legal and help page. */
export const TRANSPARENCY_LINKS: { label: string; to: string; note: string }[] = [
  ...LEGAL_DOCUMENTS.map((doc) => ({
    label: doc.navLabel,
    to: doc.path,
    note: doc.metaDescription,
  })),
  {
    label: "Getting started",
    to: "/getting-started",
    note: "A short guided path through the journey, from discovery to an exported portfolio.",
  },
  { label: "FAQs", to: "/faq", note: "Editions, limits, reports, AI, privacy and support." },
  {
    label: "Help & Support",
    to: "/support",
    note: "Report a bug, request a feature and track the status of your requests.",
  },
  {
    label: "About & trust",
    to: "/about",
    note: "What we claim about the platform, stated as verifiable facts.",
  },
];
