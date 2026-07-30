/**
 * Blank-draft entry point. Creates an empty workspace-owned use case and
 * drops the author straight into the guided wizard.
 */

import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { FilePlus2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { startWizardDraftFn } from "@/lib/studio-wizard.functions";

export function BlankDraftButton({
  variant = "default",
  size = "default",
}: {
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg";
}) {
  const navigate = useNavigate();
  const start = useServerFn(startWizardDraftFn);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const valid = title.trim().length >= 3;

  async function create() {
    if (!valid) return;
    setBusy(true);
    try {
      const res = await start({ data: { title: title.trim() } });
      toast.success("Blank draft created.");
      setOpen(false);
      setTitle("");
      navigate({ to: "/studio/use-case/$id/wizard", params: { id: res.id } });
    } catch (e) {
      console.error(e);
      toast.error("We could not create the draft. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant={variant} size={size}>
          <FilePlus2 className="mr-2 h-4 w-4" aria-hidden />
          Start a blank draft
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start a blank use case</DialogTitle>
          <DialogDescription>
            Give it a working title. You can change everything later in the guided wizard.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="blank-draft-title">Working title</Label>
          <Input
            id="blank-draft-title"
            value={title}
            placeholder="e.g. Automated invoice triage"
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && valid && !busy) {
                e.preventDefault();
                void create();
              }
            }}
          />
          <p className="text-xs text-muted-foreground">At least 3 characters.</p>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void create()} disabled={!valid || busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
            Create draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
