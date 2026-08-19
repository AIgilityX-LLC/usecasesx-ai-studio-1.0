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
  getAuthEmailDeliveryLog,
  notifyEmailDeliveryAlerts,
  previewConfirmationTemplates,
  sendBrandedAuthTestEmail,
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
          <Button variant="outline" onClick={() => alertNow.mutate()} disabled={alertNow.isPending}>
            <BellRing className="mr-2 h-4 w-4" aria-hidden />
            {alertNow.isPending ? "Sending…" : "Send alerts now"}
          </Button>
        </header>

        {health.isLoading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Loading delivery health…
          </p>
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
            <CardTitle className="text-base">Branded auth email test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <AuthEmailTester />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Confirmation template preview</CardTitle>
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

interface AuthEmailLogEvent {
  timestamp: string;
  recipient: string;
  event_type: string;
  status?: string;
}

interface AuthEmailLog {
  events: AuthEmailLogEvent[];
  historyStartsAt: string | null;
  note: string | null;
}

/**
 * Sends one real branded auth email (magic link or password reset) and shows
 * the delivery events Lovable recorded for that recipient.
 */
function AuthEmailTester() {
  const sendTest = useServerFn(sendBrandedAuthTestEmail);
  const loadLog = useServerFn(getAuthEmailDeliveryLog);

  const [recipient, setRecipient] = useState("");
  const [log, setLog] = useState<AuthEmailLog | null>(null);
  const [sendNote, setSendNote] = useState<string | null>(null);

  const refreshLog = useMutation({
    mutationFn: () =>
      loadLog({ data: { recipient: recipient.trim() || undefined } }) as Promise<AuthEmailLog>,
    onSuccess: setLog,
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "We could not read delivery events."),
  });

  const send = useMutation({
    mutationFn: (type: "magiclink" | "recovery") =>
      sendTest({
        data: {
          type,
          recipient: recipient.trim(),
          redirectTo: `${window.location.origin}/auth`,
        },
      }) as Promise<{
        send: { accepted: boolean; message: string; type: string };
        logs: AuthEmailLog;
      }>,
    onSuccess: (result) => {
      setLog(result.logs);
      setSendNote(result.send.message);
      if (result.send.accepted) toast.success("Auth email requested.");
      else toast.warning(result.send.message);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "The test send failed."),
  });

  const disabled = send.isPending || recipient.trim().length < 5;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Triggers a real branded auth email from {SENDER_DOMAIN} to an existing account, then reads
        the delivery events recorded for that address.
      </p>
      <div className="grid gap-3 sm:grid-cols-[2fr_auto_auto_auto]">
        <div className="space-y-1">
          <Label htmlFor="auth-test-recipient">Recipient (existing account)</Label>
          <Input
            id="auth-test-recipient"
            type="email"
            value={recipient}
            placeholder="admin@demo.usecasex.app"
            onChange={(event) => setRecipient(event.target.value)}
          />
        </div>
        <Button
          className="self-end"
          onClick={() => send.mutate("magiclink")}
          disabled={disabled}
          data-testid="auth-test-magiclink"
        >
          <MailCheck className="mr-2 h-4 w-4" aria-hidden />
          Send magic link
        </Button>
        <Button
          className="self-end"
          variant="outline"
          onClick={() => send.mutate("recovery")}
          disabled={disabled}
          data-testid="auth-test-recovery"
        >
          Send password reset
        </Button>
        <Button
          className="self-end"
          variant="ghost"
          onClick={() => refreshLog.mutate()}
          disabled={refreshLog.isPending}
        >
          <Eye className="mr-2 h-4 w-4" aria-hidden />
          Refresh events
        </Button>
      </div>

      {sendNote ? (
        <p role="status" className="text-xs text-muted-foreground">
          {sendNote}
        </p>
      ) : null}

      {log ? (
        <div className="space-y-2">
          {log.note ? <p className="text-xs text-destructive">{log.note}</p> : null}
          {log.events.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No delivery events recorded yet
              {log.historyStartsAt
                ? ` (history visible from ${new Date(log.historyStartsAt).toLocaleString()})`
                : ""}
              . Auth emails only send once the sender domain finishes verifying.
            </p>
          ) : (
            <ul className="space-y-2" data-testid="auth-test-events">
              {log.events.map((event, index) => (
                <li
                  key={`${event.timestamp}-${index}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-2 text-xs"
                >
                  <span className="font-mono">{event.recipient}</span>
                  <span className="flex items-center gap-2">
                    <Badge variant="outline">{event.event_type}</Badge>
                    {event.status ? (
                      <span className="text-muted-foreground">{event.status}</span>
                    ) : null}
                    <span className="text-muted-foreground">
                      {new Date(event.timestamp).toLocaleString()}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
