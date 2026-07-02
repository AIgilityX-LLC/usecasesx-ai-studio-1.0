import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Star, Check, Plus } from "lucide-react";
import { toast } from "sonner";
import { trackModuleEvent } from "@/lib/module-analytics";

type Collection = { id: string; name: string };

/** Save a use case into one of the user's collections (creating one inline). */
export function AddToCollectionButton({ useCaseId, size = "sm" }: { useCaseId: string; size?: "sm" | "default" }) {
  const session = useSupabaseSession();
  const [open, setOpen] = useState(false);
  const [cols, setCols] = useState<Collection[]>([]);
  const [inIds, setInIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("collections").select("id, name").order("created_at", { ascending: false });
    setCols((data as Collection[]) ?? []);
    const { data: items } = await supabase.from("collection_items").select("collection_id").eq("use_case_id", useCaseId);
    setInIds(new Set((items ?? []).map((i: { collection_id: string }) => i.collection_id)));
    setLoading(false);
  };
  useEffect(() => { if (open && session) load(); }, [open, session]);

  const add = async (collectionId: string) => {
    const { error } = await supabase.from("collection_items").insert({ collection_id: collectionId, use_case_id: useCaseId });
    if (error) {
      if (error.code === "23505") { toast.info("Already in that collection"); return; }
      toast.error(error.message); return;
    }
    setInIds((prev) => new Set(prev).add(collectionId));
    trackModuleEvent("collections", "click", { action: "add_item" });
    toast.success("Added to collection");
  };

  const createAndAdd = async () => {
    if (!session || !newName.trim()) return;
    const { data, error } = await supabase.from("collections").insert({ user_id: session.user.id, name: newName.trim() }).select("id, name").single();
    if (error || !data) { toast.error(error?.message ?? "Failed"); return; }
    setCols((prev) => [data as Collection, ...prev]);
    setNewName("");
    await add((data as Collection).id);
  };

  if (session === null) {
    return (
      <Button asChild variant="outline" size={size}><Link to="/auth"><Star className="mr-1.5 h-4 w-4" /> Save</Link></Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size={size}><Star className="mr-1.5 h-4 w-4" /> Save to collection</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add to a collection</DialogTitle></DialogHeader>
        {loading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-2">
            {cols.length === 0 && <p className="text-sm text-muted-foreground">No collections yet — create your first below.</p>}
            {cols.map((c) => {
              const inIt = inIds.has(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => !inIt && add(c.id)}
                  disabled={inIt}
                  className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2.5 text-left text-sm hover:bg-secondary disabled:opacity-60"
                >
                  <span>{c.name}</span>
                  {inIt ? <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400"><Check className="h-3.5 w-3.5" /> Added</span> : <Plus className="h-4 w-4 text-muted-foreground" />}
                </button>
              );
            })}
          </div>
        )}
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New collection name" maxLength={120} />
          <Button onClick={createAndAdd} disabled={!newName.trim()}>Create & add</Button>
        </DialogFooter>
        <Link to="/collections" className="text-center text-xs text-muted-foreground hover:text-primary">Manage collections →</Link>
      </DialogContent>
    </Dialog>
  );
}
