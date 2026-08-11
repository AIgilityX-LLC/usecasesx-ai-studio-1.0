import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { publicHead, breadcrumbJsonLd } from "@/lib/seo";
import { PageHero, Section } from "@/components/marketing/MarketingPrimitives";
import { FeedbackDialog } from "@/components/feedback/FeedbackDialog";
import { listMyFeedbackFn } from "@/lib/feedback/feedback.functions";
import {
  FEEDBACK_STATUS_MEANING,
  FEEDBACK_STATUS_TONE,
  FEEDBACK_STATUSES,
  SUPPORT_EMAIL,
  SUPPORT_EXPECTATIONS,
  feedbackStatusLabel,
  type FeedbackStatus,
} from "@/lib/feedback/feedback.model";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/support")({
  head: () =>
    publicHead({
      path: "/support",
      title: "Help & Support — UseCasesX",
      description:
        "Get help with UseCasesX: support expectations for Founding Access, how to report an issue, and where to send product feedback.",
      jsonLd: [
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Support", path: "/support" },
        ]),
      ],
    }),
  component: SupportPage,
});

function SupportPage() {
  const loadMine = useServerFn(listMyFeedbackFn);
  const mine = useQuery({
    queryKey: ["my-feedback"],
    queryFn: () => loadMine(),
    retry: false,
  });

  return (
    <div>
      <PageHero
        eyebrow="Help & support"
        title="Get help, report an issue, shape the product"
        intro="UseCasesX is in Pro Founding Access. Support is human, direct and deliberately transparent about what we can commit to today."
      />

      <Section title="What to expect">
        <div className="grid gap-6 md:grid-cols-3">
          {SUPPORT_EXPECTATIONS.map((item) => (
            <Card key={item.title}>
              <CardHeader>
                <CardTitle className="text-base">{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{item.detail}</CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Contact routes">
        <Card>
          <CardHeader>
            <CardTitle>Reach the team</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              For product problems and improvement ideas, use in-app feedback — it reaches the
              internal queue with the page context attached.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <FeedbackDialog variant="default" triggerLabel="Send product feedback" />
              <Button asChild variant="outline" size="sm">
                <Link to="/contact">Contact & demo request</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
              </Button>
            </div>
            <p>
              Commercial, workshop and Enterprise Design Partner enquiries go through the contact
              form so we can route them to the right person.
            </p>
          </CardContent>
        </Card>
      </Section>

      <Section title="Your feedback">
        <Card>
          <CardHeader>
            <CardTitle>Submitted items</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="mb-5 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
              {FEEDBACK_STATUSES.map((status) => (
                <div key={status} className="flex items-start gap-2">
                  <dt>
                    <Badge variant={FEEDBACK_STATUS_TONE[status]}>
                      {FEEDBACK_STATUS_MEANING[status].label}
                    </Badge>
                  </dt>
                  <dd>{FEEDBACK_STATUS_MEANING[status].detail}</dd>
                </div>
              ))}
            </dl>
            {mine.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading your submissions…</p>
            ) : mine.isError ? (
              <p className="text-sm text-muted-foreground">
                Sign in to see the feedback you have submitted.
              </p>
            ) : (mine.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                You have not sent any feedback yet. Anything you send appears here with its status.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {(mine.data ?? []).map((item) => (
                  <li key={item.id} className="flex flex-wrap items-start gap-3 py-3">
                    <Badge
                      variant={FEEDBACK_STATUS_TONE[item.status as FeedbackStatus] ?? "outline"}
                    >
                      {feedbackStatusLabel(item.status)}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{item.message}</p>
                      <p className="text-xs text-muted-foreground">
                        Ref {item.id.slice(0, 8).toUpperCase()} · {item.category} · {item.severity}{" "}
                        · submitted{" "}
                        <time dateTime={item.createdAt}>
                          {new Date(item.createdAt).toLocaleString()}
                        </time>
                        {item.resolvedAt ? (
                          <>
                            {" · resolved "}
                            <time dateTime={item.resolvedAt}>
                              {new Date(item.resolvedAt).toLocaleString()}
                            </time>
                          </>
                        ) : null}
                      </p>
                      {item.resolutionNote ? (
                        <p className="mt-1 text-xs text-foreground">{item.resolutionNote}</p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </Section>
    </div>
  );
}
