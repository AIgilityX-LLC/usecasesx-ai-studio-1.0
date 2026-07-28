/**
 * Curated market-segment and sector taxonomy (AIgilityX Platform 2.0).
 *
 * These are *views* layered on top of the existing `industries` taxonomy — no
 * schema change. Each segment maps to a set of industry slugs so the segment
 * pages can reuse the existing published-use-case read path.
 */
import type { LucideIcon } from "lucide-react";
import { Building2, Landmark, Shield, Factory, Store } from "lucide-react";

export interface MarketSegment {
  slug: string;
  name: string;
  short: string;
  hero: string;
  blurb: string;
  icon: LucideIcon;
  /** industry slugs (from public.industries) that make up this segment */
  industries: string[];
  /** what buyers in this segment care about (doc §7) */
  priorities: string[];
  /** representative use-case themes (doc §7) */
  themes: string[];
}

export const SEGMENTS: MarketSegment[] = [
  {
    slug: "sme",
    name: "SME AI Use Cases",
    short: "SME",
    hero: "Affordable, fast-payback AI for small and mid-sized businesses.",
    blurb:
      "Practical, low-cost, fast-return AI use cases that SMEs can deploy quickly with minimal technical complexity and a direct impact on revenue or cost.",
    icon: Store,
    industries: [
      "retail",
      "hospitality",
      "real-estate",
      "media",
      "food-agribusiness",
      "automotive",
    ],
    priorities: [
      "Low cost",
      "Fast deployment",
      "Minimal complexity",
      "Direct revenue or cost impact",
      "Light governance",
    ],
    themes: [
      "AI customer support",
      "Invoice automation",
      "Lead scoring",
      "Marketing content generation",
      "Inventory forecasting",
      "Appointment scheduling",
    ],
  },
  {
    slug: "enterprise",
    name: "Enterprise AI Use Cases",
    short: "Enterprise",
    hero: "Scalable, governed AI for large organizations and operating models.",
    blurb:
      "Enterprise-grade AI use cases built for scale, integration, governance, security and measurable transformation across functions and departments.",
    icon: Building2,
    industries: ["banking", "manufacturing", "pharma", "healthcare", "logistics", "automotive"],
    priorities: [
      "ROI",
      "Integration complexity",
      "Data maturity",
      "Security exposure",
      "Compliance",
      "Scalability",
    ],
    themes: [
      "Intelligent document processing",
      "Enterprise knowledge assistant",
      "Demand forecasting",
      "Predictive maintenance",
      "Compliance monitoring",
      "Customer 360",
    ],
  },
  {
    slug: "government",
    name: "Government & Public Sector",
    short: "Government",
    hero: "Citizen services, digital government and national programs.",
    blurb:
      "AI use cases for citizen services, regulation, public administration and digital government — with public trust, transparency and C3G governance built in.",
    icon: Landmark,
    industries: ["government", "regulatory-compliance", "education"],
    priorities: [
      "Public trust",
      "Transparency",
      "Sovereign AI relevance",
      "C3G governance mapping",
      "Citizen impact",
    ],
    themes: [
      "Citizen service chatbot",
      "Document digitization",
      "Public grievance analytics",
      "Smart permitting",
      "Policy impact simulation",
      "Procurement transparency",
    ],
  },
  {
    slug: "defense",
    name: "Defense & Security",
    short: "Defense",
    hero: "Secure, controlled, mission-critical AI.",
    blurb:
      "Secure and ethical AI use cases for defense support, operations, cyber resilience, logistics, training and intelligence workflows — with human command authority and Zero Trust by design.",
    icon: Shield,
    industries: ["defense", "law-enforcement"],
    priorities: [
      "Mission value",
      "Security classification",
      "Human command authority",
      "Data sovereignty",
      "Zero Trust",
      "Auditability",
    ],
    themes: [
      "Threat intelligence fusion",
      "Predictive maintenance for fleets",
      "ISR analytics",
      "Mission planning decision support",
      "Cyber resilience",
      "Secure logistics",
    ],
  },
  {
    slug: "critical-infrastructure",
    name: "Critical Infrastructure",
    short: "Critical Infra",
    hero: "AI for energy, transport, aviation, health and national sectors.",
    blurb:
      "AI use cases for energy, utilities, transport, aviation, healthcare, financial infrastructure and industrial sectors where resilience, safety and continuity are paramount.",
    icon: Factory,
    industries: [
      "airlines-aviation",
      "transport-travel",
      "logistics",
      "manufacturing",
      "healthcare",
      "banking",
    ],
    priorities: [
      "Operational resilience",
      "Safety",
      "Continuity",
      "Security exposure",
      "Regulatory compliance",
    ],
    themes: [
      "Predictive maintenance",
      "Asset risk scoring",
      "Demand forecasting",
      "Grid optimization",
      "Anomaly detection",
      "Resilience forecasting",
    ],
  },
];

export function getSegment(slug: string): MarketSegment | undefined {
  return SEGMENTS.find((s) => s.slug === slug);
}

export interface Sector {
  slug: string; // industry slug
  name: string;
  blurb: string;
}

/** Display metadata for each industry, used by sector detail pages. */
export const SECTORS: Sector[] = [
  {
    slug: "airlines-aviation",
    name: "Airlines & Aviation",
    blurb: "Predictive maintenance, operations optimization and passenger experience AI.",
  },
  {
    slug: "automotive",
    name: "Automotive",
    blurb: "Manufacturing quality, connected vehicle and supply-chain AI.",
  },
  {
    slug: "banking",
    name: "Banking & Financial Services",
    blurb: "Risk, fraud, compliance and customer intelligence AI.",
  },
  {
    slug: "defense",
    name: "Defense",
    blurb: "Mission-critical, secure and sovereign AI use cases.",
  },
  {
    slug: "education",
    name: "Education",
    blurb: "Learning, administration and workforce development AI.",
  },
  {
    slug: "food-agribusiness",
    name: "Food & Agribusiness",
    blurb: "Yield, supply-chain and food-security AI.",
  },
  {
    slug: "government",
    name: "Government",
    blurb: "Citizen services, digital government and public administration AI.",
  },
  {
    slug: "healthcare",
    name: "Healthcare",
    blurb: "Clinical, operational and patient-experience AI.",
  },
  {
    slug: "hospitality",
    name: "Hospitality",
    blurb: "Guest experience, revenue and operations AI.",
  },
  {
    slug: "law-enforcement",
    name: "Law Enforcement",
    blurb: "Investigation, safety and intelligence AI with strict oversight.",
  },
  {
    slug: "manufacturing",
    name: "Manufacturing",
    blurb: "Predictive maintenance, quality and industrial optimization AI.",
  },
  { slug: "media", name: "Media", blurb: "Content generation, personalization and analytics AI." },
  { slug: "pharma", name: "Pharmaceuticals", blurb: "R&D, trials and compliance AI." },
  {
    slug: "real-estate",
    name: "Real Estate",
    blurb: "Valuation, lead and portfolio-management AI.",
  },
  {
    slug: "regulatory-compliance",
    name: "Regulatory & Compliance",
    blurb: "Monitoring, reporting and governance AI.",
  },
  { slug: "retail", name: "Retail", blurb: "Recommendation, demand and customer-service AI." },
  {
    slug: "logistics",
    name: "Logistics",
    blurb: "Routing, forecasting and warehouse optimization AI.",
  },
  {
    slug: "transport-travel",
    name: "Transport & Travel",
    blurb: "Mobility, scheduling and safety AI.",
  },
];

export function getSector(slug: string): Sector | undefined {
  return SECTORS.find((s) => s.slug === slug);
}

/** Sectors that belong to a segment (by industry slug intersection). */
export function sectorsForSegment(seg: MarketSegment): Sector[] {
  return SECTORS.filter((s) => seg.industries.includes(s.slug));
}
