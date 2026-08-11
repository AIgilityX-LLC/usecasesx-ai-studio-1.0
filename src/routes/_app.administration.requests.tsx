import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Inbox, Bug, Sparkles, Crown, Search } from "lucide-react";

import { privateHead } from "@/lib/seo";
import { RequireRoles } from "@/components/RequireRoles";
import { PLATFORM_ADMIN_ROLES } from "@/lib/admin/platform-admin";
import {
  getFeedbackQueue,
  listRequestOwners,
  setRequestTriage,
  updateFeedbackStatus,
} from "@/lib/feedback/feedback.functions";
import {
  RequestTriageControls,
  type RequestOwnerOption,
} from "@/components/feedback/RequestTriageControls";
import { slaState } from "@/lib/feedback/sla";
import {
  FEEDBACK_STATUSES,
  FEEDBACK_STATUS_TONE,
  feedbackStatusLabel,
  type FeedbackStatus,
} from "@/lib/feedback/feedback.model";
import * as adminRepo from "@/lib/domain/admin.repository";
import { toUserMessage } from "@/lib/domain/errors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_app/administration/requests")({
  head: () => privateHead("Requests inbox"),
  component: RequestsInboxRoute,
});

/**
 * Which feedback categories count as which kind of request. Bugs and feature
 * asks arrive through the same form, so the split is by category rather than by
 * a separate table.
 */
const BUG_CATEGORIES = new Set(["bug", "data_quality", "performance"]);
const FEATURE_CATEGORIES = new Set(["missing_capability", "usability", "other"]);
const ACCESS_CATEGORIES = new Set(["enterprise_interest"]);

const LEAD_STATUSES = ["pending", "eligible", "approved", "rejected"] as const;

type Lead = {
  id: string;
  full_name: string;
  email: string;
  company: string | null;
  cta: string | null;
  eligible: boolean | null;
  waitlist_status: string;
  created_at: string;
};

function leadTone(status: string): "default" | "secondary" | "outline" | "destructive" {
  if (status === "approved") return "default";
  if (status === "rejected") return "destructive";
  if (status === "eligible") return "secondary";
  return "outline";
}

/**
 * Consolidated inbox for everything users ask us for: bug reports, feature
 * requests and free-Pro / Enterprise access requests, in one place with one
 * search box. Each tab still writes back to the system that owns the record —
 * product feedback statuses to the feedback queue, access requests to the
 * waitlist — so this page is a view, not a second source of truth.
 */
function RequestsInbox() {
  const loadFeedback = useServerFn(getFeedbackQueue);
  const updateStatus = useServerFn(updateFeedbackStatus);
  const loadOwners = useServerFn(listRequestOwners);
  const saveTriage = useServerFn(setRequestTriage);
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<string>("open");
  const [includeDemo, setIncludeDemo] = useState(false);
  const [search, setSearch] = useState("");

  const feedback = useQuery({
    queryKey: ["requests-inbox", "feedback", status, includeDemo],
    queryFn: () =>
      loadFeedback({
        data: {
          status: status === "open" || status === "all" ? null : (status as FeedbackStatus),
          category: null,
          includeDemo,
        },
      }),
  });

  const leads = useQuery({
    queryKey: ["requests-inbox", "leads"],
    queryFn: () => adminRepo.listWaitlistLeads<Lead>(),
  });

  const owners = useQuery({
    queryKey: ["requests-inbox", "owners"],
    queryFn: () => loadOwners(),
    retry: false,
  });

  const triage = useMutation({
    mutationFn: (input: {
      id: string;
      assignedTo: string | null;
      priority: string;
      dueAt: string;
    }) => saveTriage({ data: input }),
    onSuccess: () => {
      toast.success("Owner and SLA saved.");
      void queryClient.invalidateQueries({ queryKey: ["requests-inbox", "feedback"] });
    },
    onError: (error: unknown) =>
      toast.error(toUserMessage(error, "Could not save the owner and due date.")),
  });

  const setFeedbackStatus = useMutation({
    mutationFn: (input: { id: string; status: FeedbackStatus }) =>
      updateStatus({ data: { id: input.id, status: input.status, resolutionNote: null } }),
    onSuccess: () => {
      toast.success("Request updated.");
      void queryClient.invalidateQueries({ queryKey: ["requests-inbox"] });
      void queryClient.invalidateQueries({ queryKey: ["feedback-queue"] });
    },
    onError: (error: unknown) =>
      toast.error(toUserMessage(error, "Could not update this request.")),
  });

  const setLeadStatus = useMutation({
    mutationFn: (input: { id: string; status: string }) =>
      adminRepo.updateLeadWaitlistStatus(input.id, input.status),
    onSuccess: () => {
      toast.success("Access request updated.");
      void queryClient.invalidateQueries({ queryKey: ["requests-inbox", "leads"] });
    },
    onError: (error: unknown) =>
      toast.error(toUserMessage(error, "Could not update this access request.")),
  });

  const term = search.trim().toLowerCase();

  const feedbackItems = useMemo(() => {
    const rows = feedback.data ?? [];
    const open = status === "open";
    return rows.filter((item) => {
      if (open && (item.status === "resolved" || item.status === "declined")) return false;
      if (!term) return true;
      return (
        item.message.toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term) ||
        (item.contextRoute ?? "").toLowerCase().includes(term)
      );
    });
  }, [feedback.data, status, term]);

  const leadItems = useMemo(() => {
    const rows = leads.data ?? [];
    if (!term) return rows;
    return rows.filter(
      (lead) =>
        lead.full_name.toLowerCase().includes(term) ||
        lead.email.toLowerCase().includes(term) ||
        (lead.company ?? "").toLowerCase().includes(term) ||
        (lead.cta ?? "").toLowerCase().includes(term),
    );
  }, [leads.data, term]);

  const bugs = feedbackItems.filter((item) => BUG_CATEGORIES.has(item.category));
  const features = feedbackItems.filter((item) => FEATURE_CATEGORIES.has(item.category));
  const interest = feedbackItems.filter((item) => ACCESS_CATEGORIES.has(item.category));
  const pendingLeads = leadItems.filter(
    (lead) => lead.waitlist_status !== "approved" && lead.waitlist_status !== "rejected",
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Requests inbox</h1>
        <p className="text-sm text-muted-foreground">
          Everything users ask for in one queue — bug reports, feature requests and free-Pro or
          Enterprise access requests. Statuses written here update the system that owns each record.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-4">
        <SummaryTile icon={Bug} label="Open bug reports" value={bugs.length} />
        <SummaryTile icon={Sparkles} label="Feature requests" value={features.length} />
        <SummaryTile icon={Crown} label="Access requests waiting" value={pendingLeads.length} />
        <SummaryTile icon={Inbox} label="Enterprise interest" value={interest.length} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <Label htmlFor="requests-search">Search</Label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="requests-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Message, email, company, route…"
                className="w-64 pl-8"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="requests-status">Feedback status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="requests-status" className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open only</SelectItem>
                <SelectItem value="all">All statuses</SelectItem>
                {FEEDBACK_STATUSES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {feedbackStatusLabel(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 pb-2">
            <Checkbox
              id="requests-demo"
              checked={includeDemo}
              onCheckedChange={(value) => setIncludeDemo(value === true)}
            />
            <Label htmlFor="requests-demo" className="text-sm font-normal">
              Include demo / internal activity
            </Label>
          </div>
          <Button asChild variant="outline" size="sm" className="mb-2">
            <Link to="/administration/feedback">Full feedback queue</Link>
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="bugs">
        <TabsList className="flex-wrap">
          <TabsTrigger value="bugs">Bugs ({bugs.length})</TabsTrigger>
          <TabsTrigger value="features">Features ({features.length})</TabsTrigger>
          <TabsTrigger value="access">Pro access ({leadItems.length})</TabsTrigger>
          <TabsTrigger value="enterprise">Enterprise ({interest.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="bugs" className="mt-4">
          <FeedbackList
            items={bugs}
            loading={feedback.isLoading}
            error={feedback.isError ? "Could not load bug reports." : null}
            emptyLabel="No bug reports match these filters."
            busy={setFeedbackStatus.isPending}
            onStatus={(id, next) => setFeedbackStatus.mutate({ id, status: next })}
          />
        </TabsContent>

        <TabsContent value="features" className="mt-4">
          <FeedbackList
            items={features}
            loading={feedback.isLoading}
            error={feedback.isError ? "Could not load feature requests." : null}
            emptyLabel="No feature requests match these filters."
            busy={setFeedbackStatus.isPending}
            onStatus={(id, next) => setFeedbackStatus.mutate({ id, status: next })}
          />
        </TabsContent>

        <TabsContent value="access" className="mt-4">
          {leads.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading access requests…</p>
          ) : leads.isError ? (
            <p role="alert" className="text-sm text-destructive">
              Could not load access requests.
            </p>
          ) : leadItems.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No free-Pro or demo access requests yet.
              </CardContent>
            </Card>
          ) : (
            <ul className="space-y-3">
              {leadItems.map((lead) => (
                <li key={lead.id}>
                  <Card>
                    <CardContent className="space-y-3 pt-6">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={leadTone(lead.waitlist_status)}>
                          {lead.waitlist_status}
                        </Badge>
                        {lead.eligible ? <Badge variant="secondary">eligible</Badge> : null}
                        {lead.cta ? <Badge variant="outline">{lead.cta}</Badge> : null}
                        <span className="text-xs text-muted-foreground">
                          <time dateTime={lead.created_at}>
                            {new Date(lead.created_at).toLocaleString()}
                          </time>
                        </span>
                      </div>
                      <p className="text-sm">
                        <span className="font-medium">{lead.full_name}</span>{" "}
                        <span className="text-muted-foreground">{lead.email}</span>
                        {lead.company ? (
                          <span className="text-muted-foreground"> · {lead.company}</span>
                        ) : null}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {LEAD_STATUSES.filter((value) => value !== lead.waitlist_status).map(
                          (value) => (
                            <Button
                              key={value}
                              size="sm"
                              variant="outline"
                              disabled={setLeadStatus.isPending}
                              onClick={() => setLeadStatus.mutate({ id: lead.id, status: value })}
                            >
                              Mark {value}
                            </Button>
                          ),
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="enterprise" className="mt-4">
          <FeedbackList
            items={interest}
            loading={feedback.isLoading}
            error={feedback.isError ? "Could not load Enterprise interest." : null}
            emptyLabel="No Enterprise interest logged through in-app feedback yet."
            busy={setFeedbackStatus.isPending}
            onStatus={(id, next) => setFeedbackStatus.mutate({ id, status: next })}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SummaryTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Inbox;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <Icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        <div>
          <p className="text-xl font-semibold leading-none">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

interface FeedbackItem {
  id: string;
  status: string;
  category: string;
  severity: string;
  message: string;
  contextRoute: string | null;
  createdAt: string;
  allowContact: boolean;
  isRealActivity: boolean;
}

function FeedbackList({
  items,
  loading,
  error,
  emptyLabel,
  busy,
  onStatus,
}: {
  items: FeedbackItem[];
  loading: boolean;
  error: string | null;
  emptyLabel: string;
  busy: boolean;
  onStatus: (id: string, status: FeedbackStatus) => void;
}) {
  if (loading) return <p className="text-sm text-muted-foreground">Loading requests…</p>;
  if (error)
    return (
      <p role="alert" className="text-sm text-destructive">
        {error}
      </p>
    );
  if (items.length === 0)
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          {emptyLabel}
        </CardContent>
      </Card>
    );

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.id}>
          <Card>
            <CardContent className="space-y-3 pt-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">Ref {item.id.slice(0, 8).toUpperCase()}</Badge>
                <Badge variant={FEEDBACK_STATUS_TONE[item.status as FeedbackStatus] ?? "outline"}>
                  {feedbackStatusLabel(item.status)}
                </Badge>
                <Badge variant="secondary">{item.severity}</Badge>
                <Badge variant="outline">{item.category}</Badge>
                {!item.isRealActivity ? <Badge variant="secondary">demo</Badge> : null}
                <span className="text-xs text-muted-foreground">
                  <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time>
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm">{item.message}</p>
              <p className="text-xs text-muted-foreground">
                Context: <span className="font-mono">{item.contextRoute ?? "—"}</span>
                {item.allowContact ? " · contact consented" : " · no contact consent"}
              </p>
              <div className="flex flex-wrap gap-2">
                {FEEDBACK_STATUSES.filter((value) => value !== item.status).map((value) => (
                  <Button
                    key={value}
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => onStatus(item.id, value)}
                  >
                    Mark {feedbackStatusLabel(value)}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}

function RequestsInboxRoute() {
  return (
    <RequireRoles anyOf={PLATFORM_ADMIN_ROLES} action="triage user requests">
      <RequestsInbox />
    </RequireRoles>
  );
}
