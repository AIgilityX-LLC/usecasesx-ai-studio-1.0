/**
 * Getting Started and FAQ content.
 *
 * Plain data so the same answers can be rendered, linked from the product and
 * checked by tests. Every "how much / until when" answer derives from the
 * Founding Access module, which reads the limits the server actually enforces —
 * the help pages cannot advertise a limit the product does not apply.
 */
import { FOUNDING_ACCESS_END, LAUNCH_DATE, fairUseTable } from "@/lib/founding-access";
import { SUPPORT_EMAIL } from "@/lib/feedback/feedback.model";
import { PRIVACY_CONTACT } from "./legal-content";

export type GettingStartedStep = {
  step: number;
  title: string;
  body: string;
  /** Where the step actually happens. */
  to: string;
  ctaLabel: string;
  /** True when the step needs a Pro Founding Access account. */
  requiresAccount: boolean;
};

export const GETTING_STARTED_STEPS: GettingStartedStep[] = [
  {
    step: 1,
    title: "Discover what is credible",
    body: "Search the public repository and filter by industry, business function, AI capability, country, public-sector function, value, complexity and risk. Every record shows its provenance and quality status. No account needed.",
    to: "/repository",
    ctaLabel: "Open the repository",
    requiresAccount: false,
  },
  {
    step: 2,
    title: "Capture an opportunity",
    body: "Turn a conversation, workshop note or repository record into a captured opportunity in your workspace, with the business problem, owner and urgency attached.",
    to: "/opportunities/new",
    ctaLabel: "Capture an opportunity",
    requiresAccount: true,
  },
  {
    step: 3,
    title: "Design it in the Studio",
    body: "Work the opportunity into a designed use case: scope, data, process, stakeholders and expected benefits. AI can draft sections for you to review — it never saves a decision on your behalf.",
    to: "/ai-use-case-studio",
    ctaLabel: "Open AI Use Case Studio™",
    requiresAccount: true,
  },
  {
    step: 4,
    title: "Score feasibility, data readiness and value",
    body: "Score the use case against the published frameworks. Results are saved per use case with their rationale, so a decision can be re-examined months later.",
    to: "/feasibility",
    ctaLabel: "Score a use case",
    requiresAccount: true,
  },
  {
    step: 5,
    title: "Prioritise into a portfolio",
    body: "Compare scored use cases and promote the defensible ones into PortfolioX™, where they sit against each other rather than in isolation.",
    to: "/portfoliox",
    ctaLabel: "Build a portfolio",
    requiresAccount: true,
  },
  {
    step: 6,
    title: "Sequence a roadmap",
    body: "Sequence the portfolio into waves with dependencies and owners, so the plan reflects capacity rather than enthusiasm.",
    to: "/roadmap",
    ctaLabel: "Sequence a roadmap",
    requiresAccount: true,
  },
  {
    step: 7,
    title: "Export the evidence",
    body: "Generate a branded deliverables package or export PDF and CSV. Each export writes a receipt recording who exported what and when.",
    to: "/reports",
    ctaLabel: "Generate a report",
    requiresAccount: true,
  },
  {
    step: 8,
    title: "Bring in advisory when it helps",
    body: "Run a facilitated workshop or hand context to the wider SovereignX suite. Handoffs require your explicit approval before anything leaves your workspace.",
    to: "/advisory",
    ctaLabel: "See workshops & advisory",
    requiresAccount: false,
  },
];

export type FaqCategory = "editions" | "limits" | "reports" | "ai" | "privacy" | "support";

export const FAQ_CATEGORY_LABEL: Record<FaqCategory, string> = {
  editions: "Editions & access",
  limits: "Limits & fair use",
  reports: "Reports & exports",
  ai: "AI assistance",
  privacy: "Privacy & data",
  support: "Support",
};

export const FAQ_CATEGORIES: FaqCategory[] = [
  "editions",
  "limits",
  "reports",
  "ai",
  "privacy",
  "support",
];

export type FaqEntry = { category: FaqCategory; question: string; answer: string };

const limits = fairUseTable();
const proLimits = limits.find((row) => row.edition === "Pro Founding Access");

export const FAQ_ENTRIES: FaqEntry[] = [
  {
    category: "editions",
    question: "Do I need an account to browse the repository?",
    answer:
      "No. Lite is public: search, filter, read full use case detail pages and download an individual use case PDF without registering. There is no consent gate on public browsing.",
  },
  {
    category: "editions",
    question: "What does Pro Founding Access cost?",
    answer: `Nothing through ${FOUNDING_ACCESS_END}. It is complimentary from launch on ${LAUNCH_DATE}, no card required, subject to the published fair-use limits. Pricing after that date has not been set, and you will be notified in writing before any paid plan applies.`,
  },
  {
    category: "editions",
    question: "What is the difference between Pro and Enterprise?",
    answer:
      "Pro gives one workspace the full journey: capture, design, score, prioritise, roadmap and export. Enterprise adds multi-workspace governance, advisory-led workshops and structured suite handoffs, and is sold through a paid Enterprise Design Partner engagement. Enterprise capabilities that are not live yet are labelled as such in the product.",
  },
  {
    category: "editions",
    question: "Can I invite my team?",
    answer:
      "Yes. Invite colleagues into your workspace as owner, admin, contributor, viewer or facilitator. Roles control what each person can see and change, and membership changes are written to the audit trail.",
  },
  {
    category: "limits",
    question: "What exactly is metered?",
    answer: `Only AI assistance. It is metered per user and per workspace over a rolling 24-hour window${proLimits ? `; Pro Founding Access allows ${proLimits.perUserPerDay} AI requests per user and ${proLimits.perWorkspacePerDay} per workspace per day` : ""}, with a short-burst limit to stop runaway automation.`,
  },
  {
    category: "limits",
    question: "What happens when I hit a limit?",
    answer:
      "AI generation pauses until the window resets. Nothing is deleted, and everything you already created stays available. Capturing, scoring, portfolios, roadmaps and exports are not metered by these limits.",
  },
  {
    category: "limits",
    question: "Are there upload limits?",
    answer:
      "Yes. Uploads are checked against an allowed file-type list and a maximum size, and the dialog states both before you upload. If a file is rejected, the message tells you the allowed types and size.",
  },
  {
    category: "reports",
    question: "What can I export?",
    answer:
      "Portfolios, roadmaps, scorecards, benefits and the branded deliverables package, as PDF or CSV. Admins can additionally export request queues, pilot metrics and audit trails as CSV.",
  },
  {
    category: "reports",
    question: "Can I share a report outside my workspace?",
    answer:
      "Yes, through a share link. Links are authorised server-side against workspace permissions, expire, and can be revoked. Revoking stops further access through that link.",
  },
  {
    category: "reports",
    question: "Is there a record of exports?",
    answer:
      "Yes. Every export writes a receipt with who exported what, from which workspace, and when. Workspace admins can review the export log.",
  },
  {
    category: "ai",
    question: "Can I trust what the AI writes?",
    answer:
      "Treat it as a draft. AI assistance is decision support and must be validated by a competent human before it is used to fund, approve, procure or govern anything. Check figures, benefit claims and regulatory statements against your own sources.",
  },
  {
    category: "ai",
    question: "Is my content used to train AI models?",
    answer:
      "No. Your private workspace content is not used to train models, and we instruct providers not to. Only the fields relevant to the feature you invoked are sent, server-side.",
  },
  {
    category: "ai",
    question: "Does AI approve anything?",
    answer:
      "No. Publishing to the public repository requires a human reviewer with an admin role, and entitlements or roles are never granted by AI.",
  },
  {
    category: "privacy",
    question: "Is my workspace content private?",
    answer:
      "Yes, by default. Every tenant row is owned by a workspace and protected by row-level security in the database, not only in the interface. Content leaves your workspace only when you publish, share, invite or approve a handoff.",
  },
  {
    category: "privacy",
    question: "Do you use tracking cookies?",
    answer:
      "No advertising or cross-site trackers, and we do not sell personal data. We use strictly necessary session storage plus first-party product analytics recorded in our own database.",
  },
  {
    category: "privacy",
    question: "How do I export or delete everything?",
    answer: `Export from the product at any time, or request a full copy or deletion from Help & Support or ${PRIVACY_CONTACT}. Append-only audit events remain after deletion so a governance record cannot be rewritten; the export and deletion page explains this in full.`,
  },
  {
    category: "privacy",
    question: "Are you certified or compliant with a specific standard?",
    answer:
      "We do not claim any certification, audit outcome or regulatory compliance status. The privacy notice states the controls we actually apply so you can assess them yourself.",
  },
  {
    category: "support",
    question: "How do I report a bug or request a feature?",
    answer:
      "Use “Request features / report bugs” in the sidebar or on Help & Support. You get a confirmation with a timestamp, and each request is triaged with a priority and status you can track.",
  },
  {
    category: "support",
    question: "Will I be told when my request moves?",
    answer:
      "Yes. Status changes raise an in-app notification, and the full history stays on Help & Support so nothing depends on catching the notification.",
  },
  {
    category: "support",
    question: "What support can I expect during Founding Access?",
    answer: `Best-effort support by email at ${SUPPORT_EMAIL} and through the in-product request queue. There is no contractual response-time commitment during Founding Access; Enterprise Design Partner engagements agree their own.`,
  },
];

export function faqEntries(category: FaqCategory): FaqEntry[] {
  return FAQ_ENTRIES.filter((entry) => entry.category === category);
}

/** schema.org FAQPage payload built from the same answers shown on the page. */
export function faqJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ENTRIES.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: { "@type": "Answer", text: entry.answer },
    })),
  };
}
