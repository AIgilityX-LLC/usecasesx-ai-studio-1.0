/**
 * Versioned implementation brief editor (FR-10).
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  getOrCreateImplementationBriefFn,
  listImplementationBriefsFn,
  publishImplementationBriefFn,
  saveImplementationBriefFn,
} from "@/lib/roadmap/brief.functions";
import {
  BRIEF_FIELD_KEYS,
  BRIEF_FIELD_LABEL,
  briefCompleteness,
  emptyBriefDraft,
  type ImplementationBriefDraft,
} from "@/lib/roadmap/implementation-brief";
import { useAuthz } from "@/hooks/useAuthz";

export function ImplementationBriefPanel({
  useCaseId,
  title,
  portfolioId,
}: {
  useCaseId: string;
  title?: string;
  portfolioId?: string | null;
}) {
  const authz = useAuthz();
  const workspaceId = authz.workspaceId;
  const qc = useQueryClient();
  const [draft, setDraft] = useState<ImplementationBriefDraft>(emptyBriefDraft(title));
  const [briefId, setBriefId] = useState<string | null>(null);
  const [version, setVersion] = useState(1);
  const [status, setStatus] = useState<"draft" | "published">("draft");

  const listQuery = useQuery({
    queryKey: ["implementation-briefs", useCaseId],
    queryFn: () => listImplementationBriefsFn({ data: { useCaseId } }),
    enabled: Boolean(useCaseId),
  });

  const ensure = useMutation({
    mutationFn: () => {
      if (!workspaceId) throw new Error("No workspace");
      return getOrCreateImplementationBriefFn({
        data: {
          useCaseId,
          workspaceId,
          portfolioId: portfolioId ?? null,
          title: title ?? "Implementation brief",
        },
      });
    },
    onSuccess: (brief) => {
      setBriefId(brief.id);
      setVersion(brief.version);
      setStatus(brief.status);
      setDraft({
        title: brief.title,
        outcomes: brief.outcomes,
        scope: brief.scope,
        assumptions: brief.assumptions,
        architecture: brief.architecture,
        dataNeeds: brief.dataNeeds,
        humanControls: brief.humanControls,
        measures: brief.measures,
        acceptanceCriteria: brief.acceptanceCriteria,
        handoffLinks: brief.handoffLinks,
        recordVersion: brief.recordVersion,
        scoringVersion: brief.scoringVersion,
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    if (workspaceId && useCaseId) ensure.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, useCaseId]);

  const save = useMutation({
    mutationFn: () => {
      if (!briefId) throw new Error("No draft brief");
      return saveImplementationBriefFn({ data: { briefId, draft } });
    },
    onSuccess: () => {
      toast.success("Brief draft saved");
      void qc.invalidateQueries({ queryKey: ["implementation-briefs", useCaseId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const publish = useMutation({
    mutationFn: () => {
      if (!briefId) throw new Error("No draft brief");
      return publishImplementationBriefFn({ data: { briefId } });
    },
    onSuccess: (brief) => {
      setStatus(brief.status);
      toast.success(`Published brief v${brief.version}`);
      void qc.invalidateQueries({ queryKey: ["implementation-briefs", useCaseId] });
      ensure.mutate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const completeness = briefCompleteness(draft);
  const setField = (key: keyof ImplementationBriefDraft, value: string) =>
    setDraft((d) => ({ ...d, [key]: value }));

  if (!workspaceId) {
    return <p className="text-sm text-muted-foreground">Join a workspace to edit briefs.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-base font-semibold">Implementation brief</h3>
        <Badge variant="outline">v{version}</Badge>
        <Badge variant={status === "published" ? "default" : "secondary"}>{status}</Badge>
        <span className="text-xs text-muted-foreground">
          {completeness.filled}/{completeness.total} sections filled
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        Versioned delivery handoff. Publishing freezes this version; edit continues on a new draft.
      </p>

      <div className="space-y-2">
        <Label htmlFor="brief-title">Title</Label>
        <Input
          id="brief-title"
          value={draft.title}
          onChange={(e) => setField("title", e.target.value)}
          disabled={status === "published"}
        />
      </div>

      {BRIEF_FIELD_KEYS.map((key) => (
        <div key={key} className="space-y-2">
          <Label htmlFor={`brief-${key}`}>{BRIEF_FIELD_LABEL[key]}</Label>
          <Textarea
            id={`brief-${key}`}
            rows={3}
            value={draft[key]}
            onChange={(e) => setField(key, e.target.value)}
            disabled={status === "published"}
          />
        </div>
      ))}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="brief-record-ver">Record version</Label>
          <Input
            id="brief-record-ver"
            value={draft.recordVersion ?? ""}
            onChange={(e) => setField("recordVersion", e.target.value)}
            disabled={status === "published"}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="brief-score-ver">Scoring model version</Label>
          <Input
            id="brief-score-ver"
            value={draft.scoringVersion ?? ""}
            onChange={(e) => setField("scoringVersion", e.target.value)}
            disabled={status === "published"}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => save.mutate()}
          disabled={status === "published" || save.isPending || !briefId}
        >
          Save draft
        </Button>
        <Button
          variant="secondary"
          onClick={() => publish.mutate()}
          disabled={status === "published" || publish.isPending || !briefId}
        >
          Publish version
        </Button>
      </div>

      {(listQuery.data?.length ?? 0) > 0 && (
        <div className="rounded-md border p-3 text-sm">
          <p className="font-medium">Version history</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            {listQuery.data?.map((b) => (
              <li key={b.id}>
                v{b.version} · {b.status}
                {b.publishedAt ? ` · published ${new Date(b.publishedAt).toLocaleString()}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
