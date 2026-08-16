import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AlertTriangle, BellRing, Eye, MailCheck, ShieldAlert } from "lucide-react";

import { privateHead } from "@/lib/seo";
import { RequireRoles } from "@/components/RequireRoles";
import { PLATFORM_ADMIN_ROLES } from "@/lib/admin/platform-admin";
import {
  getEmailDeliveryHealth,
  notifyEmailDeliveryAlerts,
  previewConfirmationTemplates,
} from "@/lib/leads/email-admin.functions";
import {
  DELIVERY_ALERT_THRESHOLDS,
  SAMPLE_REFERENCE_ID,
  SENDER_DOMAIN,
  type DeliveryAlert,
  type DeliveryHealth,
} from "@/lib/leads/email-health";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_app/administration/email-delivery")({
  head: () => privateHead("Confirmation email delivery"),
  component: EmailDeliveryRoute,
});

function EmailDeliveryRoute() {
  return (
    <RequireRoles anyOf={PLATFORM_ADMIN_ROLES} action="review confirmation email delivery">
      <EmailDeliveryDashboard />
    </RequireRoles>
  );
}

interface Preview {
  template: string;
  displayName: string;
  subject: string;
  html: string;
  text: string;
}

function EmailDeliveryDashboard() {
  const loadHealth = useServerFn(getEmailDeliveryHealth);
  const loadPreview = useServerFn(previewConfirmationTemplates);
  const notify = useServerFn(notifyEmailDeliveryAlerts);

  const [referenceId, setReferenceId] = useState(SAMPLE_REFERENCE_ID);
  const [focusArea, setFocusArea] = useState("Public sector service automation");
  const [name, setName] = useState("Alex Morgan");
  const [previews, setPreviews] = useState<Preview[] | null>(null);

  const health = useQuery({
    queryKey: ["email-delivery-health"],
    queryFn: () =>
      loadHealth({ data: {} }) as Promise<{
        health: DeliveryHealth;
        alerts: DeliveryAlert[];
        summary: string;
      }>,
  });

  const preview = useMutation({
    mutationFn: () =>
      loadPreview({
        data: { referenceId, focusArea: focusArea || null, name },
      }) as Promise<Preview[]>,
    onSuccess: (data) => setPreviews(data),
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "We could not render the templates."),
  });

  const alertNow = useMutation({
    mutationFn: () => notify({ data: {} }),
    onSuccess: (result) => {
      if (result.alerts === 0) toast.info("No delivery alerts are active right now.");
      else if (result.notified) toast.success(`Sent ${result.alerts} alert(s) to operations.`);
      else
        toast.warning(
          `${result.alerts} alert(s) recorded, but no alert destination is configured yet.`,
        );
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "The alert dispatch failed."),
  });

  const data = health.data?.health;
  const alerts = health.data?.alerts ?? [];

  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-[1200px] space-y-6 px-6 py-10">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Confirmation email delivery</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Preview both confirmation templates before sending, and watch delivery health for{" "}
              {SENDER_DOMAIN}.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => alertNow.mutate()}
            disabled={alertNow.isPending}
          >
            <BellRing className="mr-2 h-4 w-4" aria-hidden />
            {alertNow.isPending ? "Sending…" : "Send alerts now"}
          </Button>
        </header>

        {health.isLoading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading delivery health…</p>
        ) : health.isError ? (
          <p className="py-10 text-center text-sm text-destructive">
            We could not load delivery health.
          </p>
        ) : data ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Metric
                icon={<MailCheck className="h-4 w-4" aria-hidden />}
                label={`Attempts (last ${data.windowHours}h)`}
                value={data.total}
                hint={`${data.sent} delivered · ${data.pending} pending`}
              />
              <Metric
                icon={<AlertTriangle className="h-4 w-4" aria-hidden />}
                label="Failure rate"
                value={`${(data.failureRate * 100).toFixed(1)}%`}
                hint={`Alert above ${(DELIVERY_ALERT_THRESHOLDS.failureRateWarn * 100).toFixed(0)}%`}
              />
              <Metric
                icon={<ShieldAlert className="h-4 w-4" aria-hidden />}
                label="Suppressed"
                value={data.suppressed}
                hint="Bounced, spam-reported or opted out"
              />
              <Metric
                label="Retries exhausted"
                value={data.exhausted}
                hint="Need a manual resend from the lead pipeline"
              />
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Active alerts</CardTitle>
              </CardHeader>
              <CardContent>
                {alerts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Delivery is within thresholds. Alerts fire above{" "}
                    {(DELIVERY_ALERT_THRESHOLDS.failureRateWarn * 100).toFixed(0)}% failures,{" "}
                    {(DELIVERY_ALERT_THRESHOLDS.suppressionRateWarn * 100).toFixed(0)}%
                    suppressions, or {DELIVERY_ALERT_THRESHOLDS.exhaustedCritical} leads with every
                    retry used.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {alerts.map((alert) => (
                      <li key={alert.id} className="rounded-lg border border-border p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            className={
                              alert.severity === "critical"
                                ? "bg-destructive/15 text-destructive"
                                : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                            }
                          >
                            {alert.severity}
                          </Badge>
                          <span className="text-sm font-medium">{alert.title}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{alert.detail}</p>
                      </li>
                    ))}
                  </ul>
                )}
                {data.lastError ? (
                  <p className="mt-3 text-xs text-destructive">Last error: {data.lastError}</p>
                ) : null}
              </CardContent>
            </Card>
          </>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Template preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="preview-name">Sample name</Label>
                <Input
                  id="preview-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Morgan"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="preview-reference">Sample reference ID</Label>
                <Input
                  id="preview-reference"
                  value={referenceId}
                  onChange={(e) => setReferenceId(e.target.value)}
                  placeholder={SAMPLE_REFERENCE_ID}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="preview-focus">Focus area</Label>
                <Input
                  id="preview-focus"
                  value={focusArea}
                  onChange={(e) => setFocusArea(e.target.value)}
                  placeholder="Public sector service automation"
                />
              </div>
            </div>
            <Button onClick={() => preview.mutate()} disabled={preview.isPending}>
              <Eye className="mr-2 h-4 w-4" aria-hidden />
              {preview.isPending ? "Rendering…" : "Render both templates"}
            </Button>

            {previews ? (
              <Tabs defaultValue={previews[0]?.template ?? "waitlist-confirmation"}>
                <TabsList>
                  {previews.map((p) => (
                    <TabsTrigger key={p.template} value={p.template}>
                      {p.displayName}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {previews.map((p) => (
                  <TabsContent key={p.template} value={p.template} className="space-y-3">
                    <p className="text-sm">
                      <span className="text-muted-foreground">Subject:</span> {p.subject}
                    </p>
                    <iframe
                      title={`${p.displayName} preview`}
                      srcDoc={p.html}
                      sandbox=""
                      className="h-[620px] w-full rounded-lg border border-border bg-background"
                    />
                    <details className="rounded-lg border border-border p-3 text-xs">
                      <summary className="cursor-pointer font-medium">Plain-text version</summary>
                      <pre className="mt-2 whitespace-pre-wrap">{p.text}</pre>
                    </details>
                  </TabsContent>
                ))}
              </Tabs>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nothing rendered yet — set the sample details above and render the templates.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function Metric({
  icon,
  label,
  value,
  hint,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
          {icon}
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
