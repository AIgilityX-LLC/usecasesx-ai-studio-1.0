import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { RequirePlan } from "@/components/RequirePlan";
import {
  PageHeader,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  ConfirmDialog,
} from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUseCaseXPro } from "@/hooks/usecasex-pro";
import {
  PORTFOLIO_STATUSES,
  PORTFOLIO_TYPES,
  type Portfolio,
  type PortfolioStatus,
  type PortfolioType,
} from "@/lib/usecasex.store";
import {
  FUNDING_STATES,
  FUNDING_STATE_LABELS,
  PORTFOLIO_ITEM_DECISIONS,
  PORTFOLIO_ITEM_DECISION_LABELS,
  PORTFOLIO_VISIBILITIES,
  PORTFOLIO_VISIBILITY_LABELS,
  REVIEW_CADENCES,
  REVIEW_CADENCE_LABELS,
  type FundingState,
  type PortfolioEntry,
  type PortfolioItemDecision,
  type PortfolioVisibility,
  type ReviewCadence,
} from "@/lib/portfolio-model";
import {
  EntryDecisionHistory,
  PortfolioAuditTrail,
} from "@/components/portfolios/PortfolioAuditTrail";
import { ExportPortfolioDialog } from "@/components/portfolios/ExportPortfolioDialog";
import { SharePortfolioDialog } from "@/components/portfolios/SharePortfolioDialog";
import { PortfolioMetrics } from "@/components/portfolios/PortfolioMetrics";
import { PortfolioEntriesTable } from "@/components/portfolios/PortfolioEntriesTable";
import { PortfolioReviewNotes } from "@/components/portfolios/PortfolioReviewNotes";
import { PortfolioCharts } from "@/components/portfolios/PortfolioCharts";
import { PortfolioFilters } from "@/components/portfolios/PortfolioFilters";
import {
  EMPTY_PORTFOLIO_FILTERS,
  applyPortfolioFilters,
  countActiveFilters,
  type PortfolioFilterState,
} from "@/lib/portfolio-filters";
import { useAuthz } from "@/hooks/useAuthz";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export const Route = createFileRoute("/_app/portfoliox")({
  head: () => ({
    meta: [
      { title: "AI Opportunity Portfolios | UseCasesX" },
      {
        name: "description",
        content:
          "Group prioritized AI use cases into portfolios, record decisions, target periods and funding state without changing the source use case.",
      },
      { property: "og:title", content: "AI Opportunity Portfolios | UseCasesX" },
      {
        property: "og:description",
        content: "Portfolio decisions, target periods and funding state for your AI opportunities.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <RequirePlan min="pro" feature="AI Opportunity Portfolios">
      <PortfoliosPage />
    </RequirePlan>
  ),
});

function PortfoliosPage() {
  const store = useUseCaseXPro();
  const authz = useAuthz();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Client-side gate mirrors the server decision; RLS remains authoritative.
  const canManage = authz.can("portfolio.manage");
  const canView = authz.can("portfolio.view");

  const selected = useMemo(
    () => store.portfolios.find((p) => p.id === selectedId) ?? store.portfolios[0] ?? null,
    [store.portfolios, selectedId],
  );

  if (store.isLoading || authz.loading) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
        <LoadingSkeleton />
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <EmptyState
          title="You don't have access to portfolios"
          description={
            authz.explain("portfolio.view").reason ??
            "Ask a workspace owner or admin to grant you portfolio access."
          }
        />
      </div>
    );
  }

  if (store.error) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <ErrorState
          title="Portfolios could not be loaded"
          description="Something went wrong reading your portfolios."
          onRetry={() => store.refetch()}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
      <PageHeader
        eyebrow="Prioritize"
        title="AI Opportunity Portfolios"
        description="Group prioritized use cases and record portfolio-level decisions. The same use case can sit in several portfolios — its own record and scores never change."
        actions={canManage ? <CreatePortfolioDialog onCreate={store.createPortfolio} /> : undefined}
      />

      {store.portfolios.length === 0 ? (
        <EmptyState
          title="No portfolios yet"
          description={
            canManage
              ? "Create a portfolio, then add shortlisted use cases from My Use Cases."
              : "No portfolios have been shared with you yet."
          }
          action={
            <div className="flex flex-wrap justify-center gap-2">
              {canManage && <CreatePortfolioDialog onCreate={store.createPortfolio} />}
              <Button variant="outline" asChild>
                <Link to="/my-use-cases">Go to My Use Cases</Link>
              </Button>
            </div>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <nav aria-label="Portfolios" className="space-y-2">
            {store.portfolios.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedId(p.id)}
                aria-current={selected?.id === p.id ? "true" : undefined}
                className={`w-full rounded-xl border p-3 text-left transition-colors ${
                  selected?.id === p.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-secondary/50"
                }`}
              >
                <div className="truncate text-sm font-semibold text-foreground">{p.name}</div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <Badge variant="secondary" className="text-[10px]">
                    {p.status}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">
                    {p.entries.length} use case{p.entries.length === 1 ? "" : "s"}
                  </span>
                </div>
              </button>
            ))}
          </nav>

          {selected && (
            <PortfolioDetail
              key={selected.id}
              portfolio={selected}
              store={store}
              canManage={canManage}
            />
          )}
        </div>
      )}
    </div>
  );
}

type Store = ReturnType<typeof useUseCaseXPro>;

function PortfolioDetail({
  portfolio,
  store,
  canManage,
}: {
  portfolio: Portfolio;
  store: Store;
  canManage: boolean;
}) {
  const [view, setView] = useState<"table" | "cards">("table");
  const [filters, setFilters] = useState<PortfolioFilterState>(EMPTY_PORTFOLIO_FILTERS);

  const visibleEntries = useMemo(
    () => applyPortfolioFilters(portfolio.entries, filters),
    [portfolio.entries, filters],
  );
  const isFiltered = countActiveFilters(filters) > 0;

  return (
    <div className="min-w-0 space-y-4">
      {!canManage && (
        <div
          role="status"
          className="rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground"
        >
          You have read-only access to portfolios. Decisions, funding and membership can only be
          changed by a workspace owner or admin.
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="truncate">{portfolio.name}</CardTitle>
            {portfolio.objective && (
              <p className="mt-1 text-sm text-muted-foreground">{portfolio.objective}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canManage && (
              <SharePortfolioDialog portfolioId={portfolio.id} portfolioName={portfolio.name} />
            )}
            <ExportPortfolioDialog portfolio={portfolio} filteredEntries={visibleEntries} />
            {canManage && <DeletePortfolioButton portfolio={portfolio} store={store} />}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <PortfolioMetrics entries={visibleEntries} lastReviewedAt={portfolio.lastReviewedAt} />


          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Status">
              <Select
                value={portfolio.status}
                disabled={!canManage}
                onValueChange={(v) =>
                  void store.updatePortfolio(portfolio.id, { status: v as PortfolioStatus })
                }
              >
                <SelectTrigger aria-label="Portfolio status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PORTFOLIO_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Visibility">
              <Select
                value={portfolio.visibility}
                disabled={!canManage}
                onValueChange={(v) =>
                  void store.updatePortfolio(portfolio.id, { visibility: v as PortfolioVisibility })
                }
              >
                <SelectTrigger aria-label="Portfolio visibility">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PORTFOLIO_VISIBILITIES.map((v) => (
                    <SelectItem key={v} value={v}>
                      {PORTFOLIO_VISIBILITY_LABELS[v]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Review cadence">
              <Select
                value={portfolio.reviewCadence ?? "none"}
                disabled={!canManage}
                onValueChange={(v) =>
                  void store.updatePortfolio(portfolio.id, { reviewCadence: v as ReviewCadence })
                }
              >
                <SelectTrigger aria-label="Review cadence">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REVIEW_CADENCES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {REVIEW_CADENCE_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </CardContent>
      </Card>

      {portfolio.entries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Portfolio analytics</CardTitle>
            <p className="text-sm text-muted-foreground">
              Decision mix, funding and delivery shape across the {visibleEntries.length} entries
              currently in view.
            </p>
          </CardHeader>
          <CardContent>
            <PortfolioCharts entries={visibleEntries} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base">Portfolio entries</CardTitle>
            <p className="text-sm text-muted-foreground">
              Rank, decision, target period and funding are recorded per portfolio. They never
              overwrite the use case or its scores.
            </p>
          </div>
          {portfolio.entries.length > 0 && (
            <div
              role="group"
              aria-label="Entry view"
              className="flex items-center gap-1 rounded-lg border border-border p-1"
            >
              <Button
                size="sm"
                variant={view === "table" ? "secondary" : "ghost"}
                aria-pressed={view === "table"}
                onClick={() => setView("table")}
              >
                Table
              </Button>
              <Button
                size="sm"
                variant={view === "cards" ? "secondary" : "ghost"}
                aria-pressed={view === "cards"}
                onClick={() => setView("cards")}
              >
                Cards
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {portfolio.entries.length === 0 ? (
            <EmptyState
              title="No use cases in this portfolio"
              description="Add shortlisted use cases from My Use Cases."
              action={
                <Button variant="outline" asChild>
                  <Link to="/my-use-cases">Go to My Use Cases</Link>
                </Button>
              }
            />
          ) : (
            <>
              <PortfolioFilters
                entries={portfolio.entries}
                filters={filters}
                onChange={setFilters}
                resultCount={visibleEntries.length}
              />

              {visibleEntries.length === 0 ? (
                <EmptyState
                  title="No entries match these filters"
                  description="Clear or widen the filters to see portfolio entries again."
                  action={
                    <Button variant="outline" onClick={() => setFilters(EMPTY_PORTFOLIO_FILTERS)}>
                      Clear filters
                    </Button>
                  }
                />
              ) : view === "table" ? (
                <PortfolioEntriesTable
                  portfolioId={portfolio.id}
                  entries={visibleEntries}
                  store={store}
                  canManage={canManage}
                />
              ) : (
                visibleEntries.map((entry) => (
                  <EntryRow
                    key={entry.useCaseId}
                    portfolioId={portfolio.id}
                    entry={entry}
                    store={store}
                  />
                ))
              )}
            </>
          )}
        </CardContent>

      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Review notes</CardTitle>
          <p className="text-sm text-muted-foreground">
            Executive summary for the next portfolio review. Kept separate from per-use-case notes.
          </p>
        </CardHeader>
        <CardContent>
          <PortfolioReviewNotes
            notes={portfolio.reviewNotes}
            lastReviewedAt={portfolio.lastReviewedAt}
            onSave={(patch) => store.updatePortfolio(portfolio.id, patch)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Audit trail</CardTitle>
          <p className="text-sm text-muted-foreground">
            Append-only record of portfolio and decision changes. Entries can never be edited or
            removed.
          </p>
        </CardHeader>
        <CardContent>
          <PortfolioAuditTrail portfolioId={portfolio.id} />
        </CardContent>
      </Card>
    </div>
  );
}

function DeletePortfolioButton({ portfolio, store }: { portfolio: Portfolio; store: Store }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Delete
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        destructive
        title="Delete this portfolio?"
        description="The portfolio and its decision records are removed. The use cases themselves are not affected."
        confirmLabel="Delete portfolio"
        onConfirm={() => {
          store.deletePortfolio(portfolio.id);
          setOpen(false);
          toast.success("Portfolio deleted");
        }}
      />
    </>
  );
}

function EntryRow({
  portfolioId,
  entry,
  store,
}: {
  portfolioId: string;
  entry: PortfolioEntry;
  store: Store;
}) {
  const [rank, setRank] = useState(entry.rank == null ? "" : String(entry.rank));
  const [targetPeriod, setTargetPeriod] = useState(entry.targetPeriod ?? "");
  const [nextAction, setNextAction] = useState(entry.nextAction ?? "");
  const [historyOpen, setHistoryOpen] = useState(false);
  const queryClient = useQueryClient();

  const save = (patch: Parameters<Store["updatePortfolioEntry"]>[2]) =>
    store
      .updatePortfolioEntry(portfolioId, entry.useCaseId, patch)
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: ["portfolio", portfolioId, "audit"] });
      })
      .catch((e: unknown) => toast.error(e instanceof Error ? e.message : "Could not save"));

  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-foreground">
            {entry.useCaseTitle ?? entry.useCaseSlug ?? "Use case"}
          </div>
          <div className="text-[11px] text-muted-foreground">
            Added {new Date(entry.addedAt).toLocaleDateString()}
          </div>
        </div>
        {entry.useCaseSlug && (
          <Button variant="ghost" size="sm" asChild>
            <Link to="/use-cases/$slug" params={{ slug: entry.useCaseSlug }}>
              View use case
            </Link>
          </Button>
        )}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Rank">
          <Input
            inputMode="numeric"
            value={rank}
            aria-label="Portfolio rank"
            onChange={(e) => setRank(e.target.value.replace(/[^0-9]/g, ""))}
            onBlur={() => save({ rank: rank === "" ? null : Number(rank) })}
          />
        </Field>

        <Field label="Decision">
          <Select
            value={entry.decision}
            onValueChange={(v) => save({ decision: v as PortfolioItemDecision })}
          >
            <SelectTrigger aria-label="Portfolio decision">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PORTFOLIO_ITEM_DECISIONS.map((d) => (
                <SelectItem key={d} value={d}>
                  {PORTFOLIO_ITEM_DECISION_LABELS[d]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Target period">
          <Input
            value={targetPeriod}
            placeholder="e.g. Q1 2027"
            aria-label="Target period"
            onChange={(e) => setTargetPeriod(e.target.value)}
            onBlur={() => save({ targetPeriod })}
          />
        </Field>

        <Field label="Funding">
          <Select
            value={entry.fundingState}
            onValueChange={(v) => save({ fundingState: v as FundingState })}
          >
            <SelectTrigger aria-label="Funding state">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FUNDING_STATES.map((f) => (
                <SelectItem key={f} value={f}>
                  {FUNDING_STATE_LABELS[f]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="mt-3">
        <Field label="Next action">
          <Input
            value={nextAction}
            placeholder="Who does what next?"
            aria-label="Next action"
            onChange={(e) => setNextAction(e.target.value)}
            onBlur={() => save({ nextAction })}
          />
        </Field>
      </div>

      <Collapsible open={historyOpen} onOpenChange={setHistoryOpen} className="mt-3">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm">
            {historyOpen ? "Hide decision history" : "Decision history"}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 rounded-lg border border-border bg-secondary/30 p-3">
          <EntryDecisionHistory portfolioId={portfolioId} useCaseId={entry.useCaseId} />
        </CollapsibleContent>
      </Collapsible>

      <div className="mt-3 flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (entry.useCaseSlug) store.removeFromPortfolio(portfolioId, entry.useCaseSlug);
          }}
          disabled={!entry.useCaseSlug}
        >
          Remove from portfolio
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function CreatePortfolioDialog({ onCreate }: { onCreate: Store["createPortfolio"] }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<PortfolioType>("Custom Portfolio");
  const [objective, setObjective] = useState("");
  const [visibility, setVisibility] = useState<PortfolioVisibility>("workspace");
  const [cadence, setCadence] = useState<ReviewCadence>("quarterly");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">New portfolio</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a portfolio</DialogTitle>
          <DialogDescription>
            Portfolios group prioritized use cases for review and funding decisions.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q1 Quick Wins"
              aria-label="Portfolio name"
            />
          </Field>
          <Field label="Strategic objective">
            <Textarea
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="What outcome should this portfolio deliver?"
              aria-label="Strategic objective"
            />
          </Field>
          <Field label="Type">
            <Select value={type} onValueChange={(v) => setType(v as PortfolioType)}>
              <SelectTrigger aria-label="Portfolio type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PORTFOLIO_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Visibility">
              <Select
                value={visibility}
                onValueChange={(v) => setVisibility(v as PortfolioVisibility)}
              >
                <SelectTrigger aria-label="Visibility">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PORTFOLIO_VISIBILITIES.map((v) => (
                    <SelectItem key={v} value={v}>
                      {PORTFOLIO_VISIBILITY_LABELS[v]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Review cadence">
              <Select value={cadence} onValueChange={(v) => setCadence(v as ReviewCadence)}>
                <SelectTrigger aria-label="Review cadence">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REVIEW_CADENCES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {REVIEW_CADENCE_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={!name.trim()}
            onClick={() => {
              onCreate({
                name: name.trim(),
                type,
                objective: objective.trim() || undefined,
                visibility,
                reviewCadence: cadence,
              });
              toast.success("Portfolio created");
              setName("");
              setObjective("");
              setOpen(false);
            }}
          >
            Create portfolio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
