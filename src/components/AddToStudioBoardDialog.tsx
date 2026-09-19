import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { UseCaseCardData } from "@/components/UseCaseCard";

type Board = { id: string; title: string; workspace_id: string };

export function AddToStudioBoardDialog({
  open,
  onOpenChange,
  pattern,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  pattern: UseCaseCardData | null;
}) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [boards, setBoards] = useState<Board[]>([]);
  const [selected, setSelected] = useState<string>("__new");
  const [newTitle, setNewTitle] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);
      const { data: b } = await supabase
        .from("use_case_boards")
        .select("id, title, workspace_id")
        .order("created_at", { ascending: false });
      setBoards(b ?? []);
      setSelected(b && b.length ? b[0].id : "__new");
      setNewTitle(pattern ? `${pattern.title} board` : "My AI Use Case Board");
      setLoading(false);
    })();
  }, [open, pattern]);

  async function ensureWorkspace(): Promise<string | null> {
    if (!userId) return null;
    // get org from profile
    const { data: prof } = await supabase
      .from("profiles")
      .select("organization_id, organization, full_name, email")
      .eq("user_id", userId)
      .maybeSingle();
    let orgId = prof?.organization_id ?? null;
    if (!orgId) {
      const { data: org, error } = await supabase
        .from("organizations")
        .insert({
          name: prof?.organization || prof?.full_name || prof?.email || "My Organization",
          plan: "lite",
        })
        .select("id")
        .single();
      if (error || !org) {
        toast.error("Could not create organization.");
        return null;
      }
      orgId = org.id;
      await supabase.from("profiles").update({ organization_id: orgId }).eq("user_id", userId);
    }
    // find or create a workspace
    const { data: ws } = await supabase
      .from("workspaces")
      .select("id")
      .eq("organization_id", orgId)
      .limit(1)
      .maybeSingle();
    if (ws?.id) return ws.id;
    const { data: newWs, error: wsErr } = await supabase
      .from("workspaces")
      .insert({ organization_id: orgId, name: "Default Workspace", created_by: userId })
      .select("id")
      .single();
    if (wsErr || !newWs) {
      toast.error("Could not create workspace.");
      return null;
    }
    return newWs.id;
  }

  async function handleConfirm() {
    if (!pattern || !userId) return;
    setBusy(true);
    try {
      let boardId: string | null = null;
      let workspaceId: string | null = null;

      if (selected !== "__new") {
        const b = boards.find((x) => x.id === selected);
        if (!b) {
          toast.error("Board not found.");
          setBusy(false);
          return;
        }
        boardId = b.id;
        workspaceId = b.workspace_id;
      } else {
        workspaceId = await ensureWorkspace();
        if (!workspaceId) {
          setBusy(false);
          return;
        }
        const { data: nb, error } = await supabase
          .from("use_case_boards")
          .insert({
            workspace_id: workspaceId,
            title: newTitle.trim() || "New Board",
            board_type: "studio",
            status: "active",
            created_by: userId,
          })
          .select("id")
          .single();
        if (error || !nb) {
          toast.error(error?.message ?? "Could not create board.");
          setBusy(false);
          return;
        }
        boardId = nb.id;
      }

      const { data: uc, error: ucErr } = await supabase
        .from("ai_use_cases")
        .insert({
          board_id: boardId,
          title: pattern.title,
          problem_statement: pattern.summary ?? null,
          ai_type: pattern.use_case_capabilities?.[0]?.ai_capabilities?.name ?? null,
          status: "idea",
          created_by: userId,
        })
        .select("id")
        .single();
      if (ucErr || !uc) {
        toast.error(ucErr?.message ?? "Could not create use case.");
        setBusy(false);
        return;
      }

      toast.success("Pattern added to your board.");
      onOpenChange(false);
      navigate({ to: "/ai-use-case-studio", search: { useCase: uc.id, board: boardId } as never });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to AI Use Case Studio Board</DialogTitle>
          <DialogDescription>
            {pattern ? (
              <>
                Adds <span className="font-semibold text-foreground">{pattern.title}</span> as a new
                AI use case on a board.
              </>
            ) : (
              "Select or create a board."
            )}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading boards…
          </div>
        ) : !userId ? (
          <p className="py-4 text-sm text-muted-foreground">
            You must be signed in to add patterns to a board.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Destination board</Label>
              <Select value={selected} onValueChange={setSelected}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__new">+ Create new board</SelectItem>
                  {boards.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selected === "__new" && (
              <div className="space-y-2">
                <Label htmlFor="newBoardTitle">New board title</Label>
                <Input
                  id="newBoardTitle"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Q1 AI opportunities"
                />
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={busy || loading || !userId}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add &amp; open canvas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
