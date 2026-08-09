import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, Check, Download, GitMerge, Loader2, Plus, Trash2, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState, ErrorState, CardSkeleton } from "@/components/ui-kit";
import {
  BUCKET_LABEL,
  CRITERION_LABEL,
  ITEM_KIND_LABEL,
  ITEM_STATUS_LABEL,
  KIND_STAGE,
  STAGE_META,
  VOTE_CRITERIA,
  WORKSHOP_STAGES,
  WORKSHOP_STATUS_LABEL,
  classify,
  nextStage,
  scoreItems,
  similarityHints,
  stageIndex,
  type WorkshopItem,
  type WorkshopItemKind,
  type WorkshopItemStatus,
  type WorkshopStage,
} from "@/lib/workshops";
import {
  addParticipantFn,
  castWorkshopVoteFn,
  convertWorkshopItemsFn,
  generateWorkshopOutcomeFn,
  getWorkshopBoardFn,
  mergeWorkshopItemsFn,
  publishWorkshopOutcomeFn,
  removeParticipantFn,
  submitWorkshopItemFn,
  updateWorkshopFn,
  updateWorkshopItemFn,
} from "@/lib/workshops.functions";
import { downloadWorkshopOutcomePDF } from "@/lib/workshops.collab";
import { WorkshopInvitePanel } from "@/components/workshop/WorkshopInvitePanel";
import { WorkshopAuditTrail } from "@/components/workshop/WorkshopAuditTrail";

const KIND_FOR_STAGE: Partial<Record<WorkshopStage, WorkshopItemKind>> = {
  context: "context",
  pain_points: "pain_point",
  capture: "opportunity",
  generation: "use_case",
};

export function WorkshopBoardView({ id }: { id: string }) {
  const qc = useQueryClient();
  const key = ["workshop", id];
  const board = useQuery({ queryKey: key, queryFn: () => getWorkshopBoardFn({ data: { id } }) });
  const refresh = () => void qc.invalidateQueries({ queryKey: key });
  const [stageView, setStageView] = useState<WorkshopStage | null>(null);

  const mutate = <TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>, success: string) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useMutation({
      mutationFn: fn,
      onSuccess: () => {
        toast.success(success);
        refresh();
      },
      onError: (e: Error) => toast.error(e.message),
    });

  const setStage = mutate(
    (stage: WorkshopStage) => updateWorkshopFn({ data: { id, stage } }),
    "Stage updated",
  );
  const setStatus = mutate(
    (status: "draft" | "live" | "closed") => updateWorkshopFn({ data: { id, status } }),
    "Session updated",
  );
  const submitItem = mutate(
    (item: { kind: WorkshopItemKind; title: string; detail: string; businessFunction: string }) =>
      submitWorkshopItemFn({ data: { workshopId: id, item } }),
    "Added to the board",
  );
  const updateItem = mutate(
    (input: { id: string; status: WorkshopItemStatus }) => updateWorkshopItemFn({ data: input }),
    "Item updated",
  );

  const mergeItems = mutate(
    (input: { sourceId: string; targetId: string }) =>
      mergeWorkshopItemsFn({ data: { workshopId: id, ...input } }),
    "Merged — the duplicate is kept and linked",
  );
  const vote = mutate(
    (input: { itemId: string; criterion: (typeof VOTE_CRITERIA)[number]; score: number }) =>
      castWorkshopVoteFn({ data: { workshopId: id, ...input } }),
    "Score recorded",
  );
  const convert = mutate(
    (itemIds: string[]) => convertWorkshopItemsFn({ data: { workshopId: id, itemIds } }),
    "Converted — lineage preserved",
  );
  const generate = mutate(
    () => generateWorkshopOutcomeFn({ data: { workshopId: id } }),
    "Outcome summary generated",
  );
  const publish = mutate(
    () => publishWorkshopOutcomeFn({ data: { workshopId: id } }),
    "Outcome attached to the portfolio and Opportunity Map",
  );
  const publishedPortfolioId = publish.data?.portfolioId ?? null;

  const addParticipant = mutate(
    (participant: {
      displayName: string;
      email: string;
      role: "participant" | "observer" | "facilitator";
    }) => addParticipantFn({ data: { workshopId: id, participant } }),
    "Participant added",
  );
  const removeParticipant = mutate(
    (participantId: string) => removeParticipantFn({ data: { workshopId: id, id: participantId } }),
    "Participant removed",
  );

  const scores = useMemo(() => scoreItems(board.data?.votes ?? []), [board.data?.votes]);

  if (board.isLoading) return <CardSkeleton />;
  if (board.isError)
    return (
      <ErrorState
        title="Could not load the workshop"
        description="Please try again in a moment."
        onRetry={() => void board.refetch()}
      />
    );
  if (!board.data)
    return (
      <EmptyState
        title="Workshop not available"
        description="It may have been closed, or you are not on the participant list."
        action={
          <Button asChild variant="outline">
            <Link to="/workshops">Back to workshops</Link>
          </Button>
        }
      />
    );

  const { workshop, participants, items, viewer, outcome } = board.data;
  const active = stageView ?? workshop.stage;
  const kind = KIND_FOR_STAGE[active];
  const stageItems = kind ? items.filter((i) => i.kind === kind) : [];
  const candidates = items.filter(
    (i) =>
      (i.kind === "opportunity" || i.kind === "use_case") &&
      i.status !== "merged" &&
      i.status !== "rejected",
  );
  const shortlisted = items.filter((i) => i.status === "shortlisted");
  const myVotes = new Map(
    (board.data.votes ?? [])
      .filter((v) => v.voterId === viewer.userId)
      .map((v) => [`${v.itemId}:${v.criterion}`, v.score]),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={workshop.status === "live" ? "default" : "secondary"}>
          {WORKSHOP_STATUS_LABEL[workshop.status]}
        </Badge>
        <Badge variant="outline">{viewer.isFacilitator ? "Facilitator" : "Participant"}</Badge>
        {viewer.isFacilitator && (
          <div className="ml-auto flex flex-wrap gap-2">
            {workshop.status !== "live" && (
              <Button size="sm" onClick={() => setStatus.mutate("live")}>
                Start session
              </Button>
            )}
            {workshop.status === "live" && (
              <Button size="sm" variant="outline" onClick={() => setStatus.mutate("closed")}>
                Close session
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Stage rail — the facilitator drives, everyone follows the same screen. */}
      <nav aria-label="Workshop stages" className="flex flex-wrap gap-2">
        {WORKSHOP_STAGES.map((stage, index) => {
          const reached = index <= stageIndex(workshop.stage);
          const isActive = stage === active;
          return (
            <button
              key={stage}
              type="button"
              onClick={() => setStageView(stage)}
              aria-current={isActive ? "step" : undefined}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? "border-primary bg-primary/10 text-primary"
                  : reached
                    ? "border-border bg-secondary text-foreground"
                    : "border-dashed border-border text-muted-foreground"
              }`}
            >
              {index + 1}. {STAGE_META[stage].label}
            </button>
          );
        })}
      </nav>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="text-base">{STAGE_META[active].label}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{STAGE_META[active].description}</p>
          </div>
          {viewer.isFacilitator && nextStage(workshop.stage) && active === workshop.stage && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setStage.mutate(nextStage(workshop.stage)!)}
              disabled={setStage.isPending}
            >
              Move to {STAGE_META[nextStage(workshop.stage)!].label}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {active === "context" && (
            <ContextStage
              workshop={workshop}
              participants={participants}
              canManage={viewer.isFacilitator}
              onAdd={(p) => addParticipant.mutate(p)}
              onRemove={(pid) => removeParticipant.mutate(pid)}
              busy={addParticipant.isPending}
            />
          )}

          {kind && (
            <CollectStage
              kind={kind}
              items={stageItems}
              allItems={items}
              functions={workshop.businessFunctions}
              canSubmit={viewer.canSubmit && workshop.status !== "closed"}
              isFacilitator={viewer.isFacilitator}
              busy={submitItem.isPending}
              onSubmit={(input) => submitItem.mutate({ kind, ...input })}
              onStatus={(itemId, status) => updateItem.mutate({ id: itemId, status })}
              onMerge={(sourceId, targetId) => mergeItems.mutate({ sourceId, targetId })}
            />
          )}

          {active === "scoring" && (
            <ScoringStage
              items={candidates}
              scores={scores}
              myVotes={myVotes}
              canVote={viewer.canVote && workshop.status !== "closed"}
              onVote={(itemId, criterion, score) => vote.mutate({ itemId, criterion, score })}
            />
          )}

          {active === "shortlist" && (
            <ShortlistStage
              items={candidates}
              scores={scores}
              canCurate={viewer.isFacilitator}
              onToggle={(item) =>
                updateItem.mutate({
                  id: item.id,
                  status: item.status === "shortlisted" ? "accepted" : "shortlisted",
                })
              }
            />
          )}

          {active === "portfolio" && (
            <PortfolioStage
              items={shortlisted}
              canConvert={viewer.isFacilitator}
              busy={convert.isPending}
              onConvert={(ids) => convert.mutate(ids)}
            />
          )}

          {active === "outcomes" && (
            <OutcomeStage
              outcome={outcome}
              canGenerate={viewer.isFacilitator}
              busy={generate.isPending}
              publishing={publish.isPending}
              onGenerate={() => generate.mutate(undefined)}
              onPublish={() => publish.mutate(undefined)}
              onExport={() => outcome && downloadWorkshopOutcomePDF(outcome.summary)}
              publishedPortfolioId={publishedPortfolioId}
            />
          )}
        </CardContent>
      </Card>

      {viewer.isFacilitator && active === "context" && <WorkshopInvitePanel workshopId={id} />}

      <WorkshopAuditTrail workshopId={id} stage={active} workshopTitle={workshop.title} />
    </div>
  );
}

/* ------------------------------------------------------------------ stages */

function ContextStage({
  workshop,
  participants,
  canManage,
  onAdd,
  onRemove,
  busy,
}: {
  workshop: {
    objective: string;
    clientName: string;
    businessFunctions: string[];
    startsOn: string | null;
    endsOn: string | null;
  };
  participants: Array<{
    id: string;
    displayName: string;
    email: string | null;
    role: string;
    userId: string | null;
  }>;
  canManage: boolean;
  onAdd: (p: {
    displayName: string;
    email: string;
    role: "participant" | "observer" | "facilitator";
  }) => void;
  onRemove: (id: string) => void;
  busy: boolean;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"participant" | "observer" | "facilitator">("participant");

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-3 text-sm">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Client
          </div>
          <p>{workshop.clientName || "Not recorded"}</p>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Objective
          </div>
          <p className="whitespace-pre-wrap">{workshop.objective || "Not recorded"}</p>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Functions in scope
          </div>
          {workshop.businessFunctions.length === 0 ? (
            <p className="text-muted-foreground">None listed</p>
          ) : (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {workshop.businessFunctions.map((f) => (
                <Badge key={f} variant="secondary">
                  {f}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Dates
          </div>
          <p>
            {workshop.startsOn ?? "—"} → {workshop.endsOn ?? "—"}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Users className="h-4 w-4" /> Participants ({participants.length})
        </div>
        <ul className="space-y-2">
          {participants.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{p.displayName}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {p.email ?? "No email"} · {p.role}
                  {p.userId ? "" : " · not linked to an account yet"}
                </span>
              </span>
              {canManage && (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Remove ${p.displayName}`}
                  onClick={() => onRemove(p.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>

        {canManage && (
          <form
            className="space-y-2 rounded-md border border-dashed border-border p-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim().length < 2) return;
              onAdd({ displayName: name.trim(), email: email.trim(), role });
              setName("");
              setEmail("");
            }}
          >
            <Label htmlFor="participant-name">Add participant</Label>
            <Input
              id="participant-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
            />
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Work email (links their account when they sign in)"
              type="email"
              aria-label="Participant email"
            />
            <div className="flex gap-2">
              <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
                <SelectTrigger aria-label="Participant role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="participant">Participant — submits and votes</SelectItem>
                  <SelectItem value="observer">Observer — read only</SelectItem>
                  <SelectItem value="facilitator">Co-facilitator</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function CollectStage({
  kind,
  items,
  allItems,
  functions,
  canSubmit,
  isFacilitator,
  busy,
  onSubmit,
  onStatus,
  onMerge,
}: {
  kind: WorkshopItemKind;
  items: WorkshopItem[];
  allItems: WorkshopItem[];
  functions: string[];
  canSubmit: boolean;
  isFacilitator: boolean;
  busy: boolean;
  onSubmit: (input: { title: string; detail: string; businessFunction: string }) => void;
  onStatus: (itemId: string, status: "accepted" | "rejected") => void;
  onMerge: (sourceId: string, targetId: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [businessFunction, setBusinessFunction] = useState("");

  const hints = useMemo(
    () => (title.trim().length > 5 ? similarityHints(title, allItems) : []),
    [title, allItems],
  );

  return (
    <div className="space-y-5">
      {canSubmit ? (
        <form
          className="space-y-3 rounded-md border border-border p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim().length < 3) return;
            onSubmit({ title: title.trim(), detail: detail.trim(), businessFunction });
            setTitle("");
            setDetail("");
          }}
        >
          <Label htmlFor="item-title">{ITEM_KIND_LABEL[kind]}</Label>
          <Input
            id="item-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              kind === "pain_point"
                ? "What is going wrong today?"
                : kind === "opportunity"
                  ? "Name the business opportunity"
                  : kind === "use_case"
                    ? "Name the candidate AI use case"
                    : "Context note"
            }
            maxLength={200}
          />
          {hints.length > 0 && (
            <div className="rounded-md bg-muted/50 p-3 text-xs">
              <div className="font-medium">Possible duplicates — you can still submit</div>
              <ul className="mt-1 space-y-1 text-muted-foreground">
                {hints.map((hit) => (
                  <li key={hit.item.id}>
                    {hit.item.title} · {Math.round(hit.score * 100)}% overlap
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder="Detail, evidence or baseline (optional)"
            rows={3}
            aria-label="Detail"
            maxLength={4000}
          />
          <div className="flex flex-wrap gap-2">
            <Select
              value={businessFunction || "none"}
              onValueChange={(v) => setBusinessFunction(v === "none" ? "" : v)}
            >
              <SelectTrigger className="sm:w-64" aria-label="Business function">
                <SelectValue placeholder="Business function" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No function</SelectItem>
                {functions.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" disabled={busy}>
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Add
            </Button>
          </div>
        </form>
      ) : (
        <p className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
          This stage is read-only for you. Observers follow the facilitator&apos;s screen.
        </p>
      )}

      {items.length === 0 ? (
        <EmptyState
          title={`No ${ITEM_KIND_LABEL[kind].toLowerCase()}s yet`}
          description="Everything added in this stage appears here for the whole room."
        />
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="rounded-md border border-border p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium">{item.title}</div>
                  {item.detail && (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                      {item.detail}
                    </p>
                  )}
                  <div className="mt-1 text-xs text-muted-foreground">
                    {item.submittedByName}
                    {item.businessFunction ? ` · ${item.businessFunction}` : ""}
                  </div>
                </div>
                <Badge variant={item.status === "merged" ? "outline" : "secondary"}>
                  {ITEM_STATUS_LABEL[item.status]}
                </Badge>
              </div>

              {isFacilitator && item.status === "submitted" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => onStatus(item.id, "accepted")}>
                    <Check className="mr-1.5 h-3.5 w-3.5" /> Accept
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onStatus(item.id, "rejected")}>
                    Park
                  </Button>
                  <MergeControl item={item} siblings={items} onMerge={onMerge} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">
        Submissions belong to the {STAGE_META[KIND_STAGE[kind]].label.toLowerCase()} stage.
      </p>
    </div>
  );
}

function MergeControl({
  item,
  siblings,
  onMerge,
}: {
  item: WorkshopItem;
  siblings: WorkshopItem[];
  onMerge: (sourceId: string, targetId: string) => void;
}) {
  const options = siblings.filter((s) => s.id !== item.id && s.status !== "merged");
  if (options.length === 0) return null;
  return (
    <Select onValueChange={(target) => onMerge(item.id, target)}>
      <SelectTrigger className="h-8 w-56 text-xs" aria-label={`Merge ${item.title} into`}>
        <GitMerge className="mr-1.5 h-3.5 w-3.5" />
        <SelectValue placeholder="Merge into…" />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            {option.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ScoringStage({
  items,
  scores,
  myVotes,
  canVote,
  onVote,
}: {
  items: WorkshopItem[];
  scores: ReturnType<typeof scoreItems>;
  myVotes: Map<string, number>;
  canVote: boolean;
  onVote: (itemId: string, criterion: (typeof VOTE_CRITERIA)[number], score: number) => void;
}) {
  if (items.length === 0)
    return (
      <EmptyState
        title="Nothing to score yet"
        description="Capture opportunities and generate use cases first."
      />
    );
  return (
    <div className="space-y-3">
      {items.map((item) => {
        const score = scores.get(item.id);
        return (
          <div key={item.id} className="rounded-md border border-border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-medium">{item.title}</div>
              <div className="text-xs text-muted-foreground">
                {score?.composite != null
                  ? `Composite ${score.composite.toFixed(2)} · ${score.voters} voter${score.voters === 1 ? "" : "s"}`
                  : "Not scored yet"}
              </div>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {VOTE_CRITERIA.map((criterion) => {
                const mine = myVotes.get(`${item.id}:${criterion}`);
                const avg = score?.averages[criterion];
                return (
                  <div key={criterion}>
                    <div className="text-xs font-medium">
                      {CRITERION_LABEL[criterion]}
                      {avg != null && (
                        <span className="ml-1 text-muted-foreground">avg {avg.toFixed(1)}</span>
                      )}
                    </div>
                    <div
                      className="mt-1 flex gap-1"
                      role="group"
                      aria-label={CRITERION_LABEL[criterion]}
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          disabled={!canVote}
                          aria-pressed={mine === n}
                          onClick={() => onVote(item.id, criterion, n)}
                          className={`h-7 w-7 rounded border text-xs font-semibold transition-colors disabled:opacity-50 ${
                            mine === n
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border hover:bg-secondary"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      {!canVote && (
        <p className="text-xs text-muted-foreground">
          Voting is closed for you — observers and closed sessions are read-only.
        </p>
      )}
    </div>
  );
}

function ShortlistStage({
  items,
  scores,
  canCurate,
  onToggle,
}: {
  items: WorkshopItem[];
  scores: ReturnType<typeof scoreItems>;
  canCurate: boolean;
  onToggle: (item: WorkshopItem) => void;
}) {
  const ranked = [...items].sort(
    (a, b) => (scores.get(b.id)?.composite ?? -1) - (scores.get(a.id)?.composite ?? -1),
  );
  if (ranked.length === 0)
    return (
      <EmptyState
        title="No candidates yet"
        description="The longlist builds from earlier stages."
      />
    );
  return (
    <ol className="space-y-2">
      {ranked.map((item, index) => {
        const score = scores.get(item.id);
        const bucket = classify(score);
        return (
          <li
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3"
          >
            <div className="min-w-0">
              <div className="font-medium">
                {index + 1}. {item.title}
              </div>
              <div className="text-xs text-muted-foreground">
                {score?.composite != null ? `Composite ${score.composite.toFixed(2)}` : "Unscored"}
                {bucket ? ` · ${BUCKET_LABEL[bucket]}` : ""}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {item.status === "shortlisted" && <Badge>Shortlisted</Badge>}
              {canCurate && (
                <Button size="sm" variant="outline" onClick={() => onToggle(item)}>
                  {item.status === "shortlisted" ? "Remove" : "Shortlist"}
                </Button>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function PortfolioStage({
  items,
  canConvert,
  busy,
  onConvert,
}: {
  items: WorkshopItem[];
  canConvert: boolean;
  busy: boolean;
  onConvert: (ids: string[]) => void;
}) {
  const pending = items.filter((i) => !i.opportunityId && !i.useCaseId);
  if (items.length === 0)
    return (
      <EmptyState
        title="Nothing shortlisted yet"
        description="Confirm the shortlist before converting anything."
      />
    );
  return (
    <div className="space-y-4">
      {canConvert && pending.length > 0 && (
        <Button onClick={() => onConvert(pending.map((i) => i.id))} disabled={busy}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Convert {pending.length} shortlisted item{pending.length === 1 ? "" : "s"}
        </Button>
      )}
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="rounded-md border border-border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-medium">{item.title}</div>
              <Badge variant="outline">{ITEM_KIND_LABEL[item.kind]}</Badge>
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-sm">
              {item.opportunityId && (
                <Link
                  to="/opportunities/$id"
                  params={{ id: item.opportunityId }}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Open opportunity
                </Link>
              )}
              {item.useCaseId && (
                <Link
                  to="/studio/use-case/$id"
                  params={{ id: item.useCaseId }}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Open Studio draft
                </Link>
              )}
              {!item.opportunityId && !item.useCaseId && (
                <span className="text-muted-foreground">Not converted yet</span>
              )}
            </div>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        Converted drafts carry their workshop lineage, and appear in the Studio portfolio once
        scored.
      </p>
    </div>
  );
}

function OutcomeStage({
  outcome,
  canGenerate,
  busy,
  publishing,
  onGenerate,
  onPublish,
  onExport,
  publishedPortfolioId,
}: {
  outcome: { summary: import("@/lib/workshops").OutcomeSummary; generatedAt: string } | null;
  canGenerate: boolean;
  busy: boolean;
  publishing: boolean;
  onGenerate: () => void;
  onPublish: () => void;
  onExport: () => void;
  publishedPortfolioId: string | null;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {canGenerate && (
          <Button onClick={onGenerate} disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {outcome ? "Regenerate outcome summary" : "Generate outcome summary"}
          </Button>
        )}
        {outcome && (
          <Button variant="outline" onClick={onExport}>
            <Download className="mr-2 h-4 w-4" /> Export summary (PDF)
          </Button>
        )}
        {canGenerate && (
          <Button variant="outline" onClick={onPublish} disabled={publishing}>
            {publishing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Publish to portfolio & Opportunity Map
          </Button>
        )}
        {publishedPortfolioId && (
          <Button asChild variant="ghost">
            <Link to="/portfoliox">Open portfolio</Link>
          </Button>
        )}
      </div>

      {!outcome ? (
        <EmptyState
          title="No outcome summary yet"
          description="The facilitator generates it from what the room actually recorded."
        />
      ) : (
        <div className="space-y-5 text-sm">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {Object.entries(outcome.summary.counts).map(([label, value]) => (
              <div key={label} className="rounded-md border border-border p-3">
                <div className="text-xs capitalize text-muted-foreground">
                  {label.replace(/([A-Z])/g, " $1")}
                </div>
                <div className="text-lg font-semibold">{value}</div>
              </div>
            ))}
          </div>

          <Section title="Opportunity Map — demand by function">
            {outcome.summary.map.length === 0 ? (
              <Muted>No functions recorded.</Muted>
            ) : (
              <ul className="space-y-1">
                {outcome.summary.map.map((row) => (
                  <li key={row.businessFunction}>
                    <span className="font-medium">{row.businessFunction}</span> — {row.painPoints}{" "}
                    pain point(s), {row.opportunities} opportunity(ies), {row.useCases} use case(s)
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <div className="grid gap-5 lg:grid-cols-2">
            <Section title="Quick wins">
              <RowList rows={outcome.summary.quickWins} empty="None classified." />
            </Section>
            <Section title="Strategic bets">
              <RowList rows={outcome.summary.strategicBets} empty="None classified." />
            </Section>
            <Section title="Shortlist">
              <RowList rows={outcome.summary.shortlist} empty="Nothing shortlisted." />
            </Section>
            <Section title="Longlist">
              <RowList rows={outcome.summary.longlist} empty="No candidates." />
            </Section>
          </div>

          <Section title="Gaps">
            {outcome.summary.gaps.length === 0 ? (
              <Muted>No functions with unmet demand.</Muted>
            ) : (
              <p>{outcome.summary.gaps.join(", ")}</p>
            )}
          </Section>

          <Section title="Roadmap">
            <ul className="space-y-1">
              {outcome.summary.roadmap.map((h) => (
                <li key={h.horizon}>
                  <span className="font-medium">{h.horizon}:</span>{" "}
                  {h.items.length > 0 ? h.items.join(", ") : "—"}
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Next steps">
            <ul className="list-disc space-y-1 pl-5">
              {outcome.summary.nextSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          </Section>

          <p className="text-xs text-muted-foreground">
            Generated {new Date(outcome.generatedAt).toLocaleString()}.
          </p>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <p className="text-muted-foreground">{children}</p>;
}

function RowList({ rows, empty }: { rows: import("@/lib/workshops").OutcomeRow[]; empty: string }) {
  if (rows.length === 0) return <Muted>{empty}</Muted>;
  return (
    <ul className="space-y-1">
      {rows.map((row) => (
        <li key={row.itemId}>
          {row.title}
          <span className="text-muted-foreground">
            {row.composite != null ? ` · ${row.composite.toFixed(2)}` : " · unscored"}
            {row.converted ? " · converted" : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}
