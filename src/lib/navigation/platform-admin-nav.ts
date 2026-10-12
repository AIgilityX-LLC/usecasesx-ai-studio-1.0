/**
 * AIgilityX Platform Administration navigation.
 * Separate from the customer UseCasesX sidebar — do not merge into ENTERPRISE_NAV_SECTIONS.
 */

import type { LucideIcon } from "lucide-react";
import {
  Settings,
  Inbox,
  Crown,
  Users,
  Rocket,
  ShieldCheck,
  Cpu,
  MailCheck,
  Gauge,
  ServerCog,
  DatabaseZap,
  Lock,
  ListChecks,
  LineChart,
  MessageSquarePlus,
} from "lucide-react";

export type PlatformAdminNavItem = {
  id: string;
  to: string;
  label: string;
  icon: LucideIcon;
};

export type PlatformAdminNavSection = {
  id: string;
  label: string;
  items: PlatformAdminNavItem[];
};

/** Canonical /platform-admin/* destinations (post-migration). */
export const PLATFORM_ADMIN_NAV_SECTIONS: PlatformAdminNavSection[] = [
  {
    id: "operations",
    label: "Operations",
    items: [
      { id: "home", to: "/platform-admin", label: "Admin Panel", icon: Settings },
      { id: "requests", to: "/platform-admin/requests", label: "Requests Inbox", icon: Inbox },
      {
        id: "founding",
        to: "/platform-admin/founding-access",
        label: "Founding Access",
        icon: Crown,
      },
      { id: "leads", to: "/platform-admin/leads", label: "Lead Pipeline", icon: Users },
      { id: "waitlist", to: "/platform-admin/waitlist", label: "Free Pro Waitlist", icon: Users },
      {
        id: "email",
        to: "/platform-admin/email-delivery",
        label: "Email Delivery",
        icon: MailCheck,
      },
      { id: "ai-engines", to: "/platform-admin/ai-engines", label: "AI Engines", icon: Cpu },
    ],
  },
  {
    id: "content",
    label: "Content & submissions",
    items: [
      {
        id: "submissions",
        to: "/platform-admin/submissions",
        label: "Submission Review",
        icon: Inbox,
      },
      {
        id: "submission-audit",
        to: "/platform-admin/submission-audit",
        label: "Submission Audit",
        icon: ShieldCheck,
      },
    ],
  },
  {
    id: "pilot",
    label: "Pilot",
    items: [
      { id: "pilot", to: "/platform-admin/pilot", label: "Pilot Programme", icon: Rocket },
      {
        id: "pilot-milestones",
        to: "/platform-admin/pilot-milestones",
        label: "Pilot Milestones",
        icon: Rocket,
      },
    ],
  },
  {
    id: "launch",
    label: "Launch & readiness",
    items: [
      { id: "readiness", to: "/platform-admin/readiness", label: "Readiness", icon: Gauge },
      {
        id: "prod-readiness",
        to: "/platform-admin/production-readiness",
        label: "Production Readiness",
        icon: ServerCog,
      },
      {
        id: "prod-data",
        to: "/platform-admin/production-data",
        label: "Production Data Audit",
        icon: DatabaseZap,
      },
      {
        id: "launch-checks",
        to: "/platform-admin/launch-checks",
        label: "Launch Checks",
        icon: ShieldCheck,
      },
      {
        id: "release-candidate",
        to: "/platform-admin/release-candidate",
        label: "Release Candidate",
        icon: Lock,
      },
      {
        id: "launch-readiness",
        to: "/platform-admin/launch-readiness",
        label: "Readiness to Launch",
        icon: ListChecks,
      },
      {
        id: "launch-learning",
        to: "/platform-admin/launch-learning",
        label: "Launch Learning",
        icon: LineChart,
      },
    ],
  },
  {
    id: "governance",
    label: "Platform governance",
    items: [
      {
        id: "admins",
        to: "/platform-admin/platform-admins",
        label: "Platform Admins",
        icon: ShieldCheck,
      },
      {
        id: "analytics",
        to: "/platform-admin/analytics",
        label: "Platform Analytics",
        icon: LineChart,
      },
      {
        id: "feedback",
        to: "/platform-admin/feedback",
        label: "Feedback Triage",
        icon: MessageSquarePlus,
      },
    ],
  },
];

export function collectPlatformAdminNavTargets(): string[] {
  const out: string[] = [];
  for (const section of PLATFORM_ADMIN_NAV_SECTIONS) {
    for (const it of section.items) out.push(it.to);
  }
  return [...new Set(out)];
}

/** Legacy paths → canonical platform-admin paths (compatibility redirects). */
export const PLATFORM_ADMIN_REDIRECTS: Record<string, string> = {
  "/administration": "/platform-admin",
  "/administration/requests": "/platform-admin/requests",
  "/administration/founding-access": "/platform-admin/founding-access",
  "/administration/leads": "/platform-admin/leads",
  "/administration/pilot": "/platform-admin/pilot",
  "/administration/pilot-milestones": "/platform-admin/pilot-milestones",
  "/administration/ai-engines": "/platform-admin/ai-engines",
  "/administration/email-delivery": "/platform-admin/email-delivery",
  "/administration/platform-admins": "/platform-admin/platform-admins",
  "/administration/readiness": "/platform-admin/readiness",
  "/administration/production-readiness": "/platform-admin/production-readiness",
  "/administration/production-data": "/platform-admin/production-data",
  "/administration/launch-checks": "/platform-admin/launch-checks",
  "/administration/release-candidate": "/platform-admin/release-candidate",
  "/administration/launch-readiness": "/platform-admin/launch-readiness",
  "/administration/launch-learning": "/platform-admin/launch-learning",
  "/administration/feedback": "/platform-admin/feedback",
  "/administration/analytics": "/platform-admin/analytics",
  "/admin-submissions": "/platform-admin/submissions",
  "/admin-waitlist": "/platform-admin/waitlist",
  "/admin-audit": "/platform-admin/submission-audit",
};
