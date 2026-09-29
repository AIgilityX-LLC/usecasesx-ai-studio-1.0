/**
 * Workshop Mode V2 facilitator controls — agenda, teams, challenges,
 * timeboxes, anonymity, voting mode, AI cluster proposals.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Workshop } from "@/lib/workshops";
import {
  decideWorkshopClusterProposalFn,
  listWorkshopClusterProposalsFn,
  proposeWorkshopClustersFn,
  updateWorkshopFn,
} from "@/lib/workshops.functions";

function newId() {
  return crypto.randomUUID();
}

export function WorkshopFacilitatorV2Panel({
  workshop,
  onUpdated,
}: {
  workshop: Workshop;
  onUpdated?: () => void;
}) {
  const qc = useQueryClient();
  const [agendaText, setAgendaText] = useState(
    workshop.agenda.map((a) => a.title).join("\n") || "",
  );
  const [challengesText, setChallengesText] = useState(
    workshop.challengeStatements.map((c) => c.text).join("\n") || "",
  );
  const [teamsText, setTeamsText] = useState(
    workshop.teams.map((t) => t.name).join("\n") || "",
  );
  const [allowAnonymous, setAllowAnonymous] = useState(workshop.allowAnonymous);
  const [votingMode, setVotingMode] = useState<"score" | "dot">(workshop.votingMode);

  const save = useMutation({
    mutationFn: () =>
      updateWorkshopFn({
        data: {
          id: workshop.id,
          agenda: agendaText
            .split("\n")
            .map((t) => t.trim())
            .filter(Boolean)
            .map((title) => ({ id: newId(), title })),
          challengeStatements: challengesText
            .split("\n")
            .map((t) => t.trim())
            .filter(Boolean)
            .map((text) => ({ id: newId(), text })),
          teams: teamsText
            .split("\n")
            .map((t) => t.trim())
            .filter(Boolean)
            .map((name) => ({ id: newId(), name, memberNames: [] })),
          timeboxes: workshop.agenda.length
            ? workshop.agenda.map((a) => ({
                id: a.id,
                label: a.title,
                minutes: a.minutes ?? 15,
              }))
            : agendaText
                .split("\n")
                .map((t) => t.trim())
                .filter(Boolean)
                .map((label) => ({ id: newId(), label, minutes: 15 })),
          allowAnonymous,
          votingMode,
        },
      }),
    onSuccess: () => {
      toast.success("Workshop session settings saved");
      onUpdated?.();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const proposals = useQuery({
    queryKey: ["workshop-clusters", workshop.id],
    queryFn: () => listWorkshopClusterProposalsFn({ data: { workshopId: workshop.id } }),
  });

  const propose = useMutation({
    mutationFn: () => proposeWorkshopClustersFn({ data: { workshopId: workshop.id } }),
    onSuccess: (rows) => {
      toast.success(
        rows.length
          ? `${rows.length} cluster proposal(s) ready for confirmation`
          : "No similar groups found",
      );
      void qc.invalidateQueries({ queryKey: ["workshop-clusters", workshop.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const decide = useMutation({
    mutationFn: (input: {
      proposalId: string;
      decision: "accepted" | "rejected";
      finalLabel?: string;
    }) =>
      decideWorkshopClusterProposalFn({
        data: { workshopId: workshop.id, ...input },
      }),
    onSuccess: () => {
      toast.success("Cluster decision recorded");
      void qc.invalidateQueries({ queryKey: ["workshop-clusters", workshop.id] });
      onUpdated?.();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4 rounded-md border p-4">
      <div>
        <h3 className="text-base font-semibold">Session design (V2)</h3>
        <p className="text-sm text-muted-foreground">
          Agenda, teams, challenges, anonymity and voting. AI may propose clusters — you confirm
          every merge and final label.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ws-agenda">Agenda (one item per line)</Label>
        <Textarea
          id="ws-agenda"
          rows={4}
          value={agendaText}
          onChange={(e) => setAgendaText(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ws-challenges">Challenge statements (one per line)</Label>
        <Textarea
          id="ws-challenges"
          rows={3}
          value={challengesText}
          onChange={(e) => setChallengesText(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ws-teams">Teams (one name per line)</Label>
        <Textarea
          id="ws-teams"
          rows={3}
          value={teamsText}
          onChange={(e) => setTeamsText(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-2">
          <Switch
            id="ws-anon"
            checked={allowAnonymous}
            onCheckedChange={setAllowAnonymous}
          />
          <Label htmlFor="ws-anon">Allow anonymous ideation</Label>
        </div>
        <div className="space-y-1">
          <Label>Voting mode</Label>
          <Select value={votingMode} onValueChange={(v) => setVotingMode(v as "score" | "dot")}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="score">1–5 scoring</SelectItem>
              <SelectItem value="dot">Dot voting</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button onClick={() => save.mutate()} disabled={save.isPending}>
        Save session design
      </Button>

      <div className="border-t pt-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="font-medium">AI cluster proposals</h4>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => propose.mutate()}
            disabled={propose.isPending}
          >
            Propose clusters
          </Button>
        </div>
        {(proposals.data?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">No pending proposals.</p>
        ) : (
          <ul className="space-y-3">
            {proposals.data?.map((p) => (
              <li key={p.id as string} className="rounded-md border p-3 text-sm space-y-2">
                <p className="font-medium">{p.proposed_label as string}</p>
                <p className="text-muted-foreground">{p.summary as string}</p>
                <p className="text-xs text-muted-foreground">{p.reason as string}</p>
                <div className="flex flex-wrap gap-2 items-end">
                  <div className="space-y-1 flex-1 min-w-[12rem]">
                    <Label htmlFor={`label-${p.id}`}>Final label</Label>
                    <Input
                      id={`label-${p.id}`}
                      defaultValue={p.proposed_label as string}
                      data-proposal-label={p.id as string}
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      const input = document.getElementById(
                        `label-${p.id}`,
                      ) as HTMLInputElement | null;
                      decide.mutate({
                        proposalId: p.id as string,
                        decision: "accepted",
                        finalLabel: input?.value,
                      });
                    }}
                  >
                    Confirm merge
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      decide.mutate({ proposalId: p.id as string, decision: "rejected" })
                    }
                  >
                    Reject
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
