import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { breadcrumbJsonLd, publicHead } from "@/lib/seo";
import { PageHero, Section, TrackedCta } from "@/components/marketing/MarketingPrimitives";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FOUNDING_ACCESS_END, LAUNCH_DATE, LAUNCH_TIMESTAMP_UTC } from "@/lib/founding-access";
import { getLaunchPageContext } from "@/lib/launch.functions";

const LAUNCH_MS = Date.parse(LAUNCH_TIMESTAMP_UTC);

const MILESTONES = [
  {
    date: "Now",
    title: "Release candidate in preview",
    body: "The full journey — repository, Opportunity Map, Studio, scoring, portfolios and exports — is running against the launch corpus.",
  },
  {
    date: "Pilot window",
    title: "Pilot participants onboard",
    body: "Invited participants complete onboarding intake and checkpoint responses so launch readiness is evidenced, not asserted.",
  },
  {
    date: LAUNCH_DATE,
    title: "Lite and Pro Founding Access go live",
    body: "Public Lite discovery opens with no account required, and Pro Founding Access sign-up opens to work emails.",
  },
  {
    date: FOUNDING_ACCESS_END,
    title: "Founding Access period ends",
    body: "Founding Access stays complimentary until this date, subject to published fair-use limits. Any paid plan is announced in writing beforehand.",
  },
];

/** Minimal RFC 5545 calendar invite for the launch moment. */
function icsHref(): string {
  const stamp = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AIgilityX//UseCasesX//EN",
    "BEGIN:VEVENT",
    `UID:usecasesx-launch-${LAUNCH_MS}@aigilityx.com`,
    `DTSTAMP:${stamp(LAUNCH_MS)}`,
    `DTSTART:${stamp(LAUNCH_MS)}`,
    `DTEND:${stamp(LAUNCH_MS + 60 * 60 * 1000)}`,
    "SUMMARY:UseCasesX™ launch — Lite and Pro Founding Access",
    "DESCRIPTION:UseCasesX™ by AIgilityX™ opens Lite discovery and Pro Founding Access.",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(body)}`;
}

export const Route = createFileRoute("/_app/launch-calendar")({
  loader: async () => getLaunchPageContext(),
  head: ({ loaderData }) => {
    const live = loaderData?.live ?? false;
    return publicHead({
      path: "/launch-calendar",
      title: live ? "UseCasesX™ launch calendar" : "UseCasesX™ launch calendar — candidate",
      description: `Launch calendar for UseCasesX™: Lite and Pro Founding Access are scheduled for ${LAUNCH_DATE}, with a live countdown and the Founding Access timeline.`,
      noindex: !live,
      jsonLd: [
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Launch calendar", path: "/launch-calendar" },
        ]),
        ...(live
          ? [
              {
                "@context": "https://schema.org",
                "@type": "Event",
                name: "UseCasesX™ launch — Lite and Pro Founding Access",
                startDate: LAUNCH_TIMESTAMP_UTC,
                eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
                eventStatus: "https://schema.org/EventScheduled",
                organizer: { "@type": "Organization", name: "AIgilityX™" },
              },
            ]
          : []),
      ],
    });
  },
  errorComponent: () => (
    <PageHero
      eyebrow="Launch calendar"
      title={`UseCasesX™ launches on ${LAUNCH_DATE}`}
      intro="The launch calendar is temporarily unavailable. The scheduled date is unchanged."
    />
  ),
  component: LaunchCalendarPage,
});

interface Remaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  passed: boolean;
}

function remainingFrom(now: number): Remaining {
  const diff = LAUNCH_MS - now;
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, passed: true };
  const seconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(seconds / 86400),
    hours: Math.floor((seconds % 86400) / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    seconds: seconds % 60,
    passed: false,
  };
}

/** Client-only so server and first client render agree. */
function useCountdown(): Remaining | null {
  const [value, setValue] = useState<Remaining | null>(null);
  useEffect(() => {
    setValue(remainingFrom(Date.now()));
    const id = window.setInterval(() => setValue(remainingFrom(Date.now())), 1000);
    return () => window.clearInterval(id);
  }, []);
  return value;
}

function CountdownCell({ value, label }: { value: number | null; label: string }) {
  return (
    <div className="rounded-lg border border-border bg-background px-4 py-5 text-center">
      <div
        className="text-3xl font-bold tabular-nums tracking-tight text-foreground sm:text-4xl"
        aria-hidden={value === null}
      >
        {value === null ? "—" : String(value).padStart(2, "0")}
      </div>
      <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function LaunchCalendarPage() {
  const { live } = Route.useLoaderData();
  const countdown = useCountdown();
  const launched = countdown?.passed ?? false;
  const announced = live && launched;

  return (
    <main>
      <PageHero
        eyebrow={announced ? "Now live" : `Scheduled · ${LAUNCH_DATE}`}
        title={
          announced
            ? "UseCasesX™ is live"
            : `UseCasesX™ launches on ${LAUNCH_DATE}`
        }
        intro={
          announced
            ? `Lite discovery is open with no account, and Pro Founding Access is complimentary through ${FOUNDING_ACCESS_END}.`
            : `Lite and Pro Founding Access are scheduled to open at 09:00 UTC on ${LAUNCH_DATE}. Add it to your calendar and browse the repository in the meantime.`
        }
      >
        <TrackedCta
          to={announced ? "/auth" : "/repository"}
          label={announced ? "Create your account" : "Browse the repository"}
          location="launch-calendar-hero"
        />
        <Button asChild variant="secondary">
          <a href={icsHref()} download="usecasesx-launch.ics">
            Add to calendar
          </a>
        </Button>
      </PageHero>

      <Section
        title={launched ? "Launch moment reached" : "Countdown to launch"}
        lead={
          launched
            ? live
              ? "The scheduled launch moment has passed and the announced release is live."
              : "The scheduled launch moment has passed. This preview host still serves the release candidate; the announcement applies to the published site."
            : "Time remaining until Lite and Pro Founding Access open at 09:00 UTC."
        }
      >
        {launched ? (
          <Badge variant="secondary" className="text-sm">
            {LAUNCH_DATE} · 09:00 UTC
          </Badge>
        ) : (
          <div
            className="grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4"
            role="timer"
            aria-live="off"
            aria-label={`Countdown to the UseCasesX launch on ${LAUNCH_DATE}`}
          >
            <CountdownCell value={countdown?.days ?? null} label="Days" />
            <CountdownCell value={countdown?.hours ?? null} label="Hours" />
            <CountdownCell value={countdown?.minutes ?? null} label="Minutes" />
            <CountdownCell value={countdown?.seconds ?? null} label="Seconds" />
          </div>
        )}
      </Section>

      <Section
        title="Launch timeline"
        lead="What happens before, on and after the launch date."
        tone="muted"
      >
        <ol className="grid gap-4 md:grid-cols-2">
          {MILESTONES.map((item) => (
            <li key={item.title}>
              <Card className="h-full">
                <CardHeader className="space-y-2">
                  <Badge variant="secondary" className="w-fit">
                    {item.date}
                  </Badge>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">{item.body}</CardContent>
              </Card>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Be ready on day one">
        <div className="flex flex-wrap gap-3">
          <TrackedCta to="/launch" label="Read the release detail" location="launch-calendar-foot" />
          <TrackedCta
            to="/editions"
            label="Compare editions"
            location="launch-calendar-editions"
            variant="secondary"
          />
        </div>
      </Section>
    </main>
  );
}
