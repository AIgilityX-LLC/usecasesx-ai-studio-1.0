import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { PageHero } from "@/components/usecasex/PageHero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { FolderPlus, Share2, Trash2, Globe, Lock, ExternalLink, X } from "lucide-react";
import { trackModuleEvent } from "@/lib/module-analytics";

export const Route = createFileRoute("/_app/boards/collections")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "My Collections — UseCasesX™" },
      {
        name: "description",
        content: "Save, organize, and share your favorite AI use cases into collections.",
      },
    ],
  }),
  component: CollectionsPage,
});

type Collection = {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  share_token: string;
  created_at: string;
};
type Item = {
  id: string;
  use_case_id: string;
  note: string | null;
  position: number;
  use_cases: { title: string; slug: string; summary: string | null } | null;
};

function CollectionsPage() {
  const session = useSupabaseSession();
  const [cols, setCols] = useState<Collection[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("collections")
      .select("*")
      .order("created_at", { ascending: false });
    const list = (data as Collection[]) ?? [];
    setCols(list);
    if (list.length) {
      const { data: items } = await supabase.from("collection_items").select("collection_id");
      const c: Record<string, number> = {};
      (items ?? []).forEach((r: { collection_id: string }) => {
        c[r.collection_id] = (c[r.collection_id] ?? 0) + 1;
      });
      setCounts(c);
    }
    setLoading(false);
  }, []);
  useEffect(() => {
    if (session) {
      load();
      trackModuleEvent("collections", "view");
    } else if (session === null) setLoading(false);
  }, [session, load]);

  const create = async () => {
    if (!session || !name.trim()) return;
    setCreating(true);
    const { error } = await supabase
      .from("collections")
      .insert({ user_id: session.user.id, name: name.trim(), description: desc || null });
    setCreating(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setName("");
    setDesc("");
    toast.success("Collection created");
    load();
  };

  const togglePublic = async (c: Collection, v: boolean) => {
    const { error } = await supabase.from("collections").update({ is_public: v }).eq("id", c.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setCols((prev) => prev.map((x) => (x.id === c.id ? { ...x, is_public: v } : x)));
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("collections").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setCols((prev) => prev.filter((c) => c.id !== id));
    toast.success("Collection deleted");
  };

  const copyShare = (c: Collection) => {
    const url = `${window.location.origin}/c/${c.share_token}`;
    navigator.clipboard.writeText(url);
    toast.success(
      c.is_public ? "Share link copied" : "Link copied — make the collection public to share",
    );
  };

  if (session === null) {
    return (
      <>
        <PageHero
          tone="dark"
          eyebrow="Workspace"
          title="Collections"
          description="Sign in to build and share collections of use cases."
        />
        <div className="mx-auto max-w-2xl px-6 py-16 text-center">
          <Button asChild>
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHero
        tone="dark"
        eyebrow="Workspace · Collections"
        title="Save, organize & share your favorite use cases"
        description="Group use cases into named collections, add notes, and share a public link with your team."
      />
      <section className="bg-background">
        <div className="mx-auto max-w-[1200px] px-6 py-12 space-y-8">
          {/* Create */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FolderPlus className="h-4 w-4" /> New collection
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-[1fr_1.5fr_auto] sm:items-end">
              <div className="space-y-1.5">
                <Label htmlFor="cname">Name</Label>
                <Input
                  id="cname"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Gov priorities Q3"
                  maxLength={120}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cdesc">Description</Label>
                <Input
                  id="cdesc"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <Button onClick={create} disabled={creating || !name.trim()}>
                Create
              </Button>
            </CardContent>
          </Card>

          {/* List */}
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : cols.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No collections yet. Create one above, then add use cases from the repository.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cols.map((c) => (
                <Card key={c.id} className="flex flex-col">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{c.name}</CardTitle>
                      <Badge
                        variant="secondary"
                        className={
                          c.is_public
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {c.is_public ? (
                          <>
                            <Globe className="mr-1 h-3 w-3" /> Public
                          </>
                        ) : (
                          <>
                            <Lock className="mr-1 h-3 w-3" /> Private
                          </>
                        )}
                      </Badge>
                    </div>
                    {c.description && (
                      <p className="text-sm text-muted-foreground">{c.description}</p>
                    )}
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-3">
                    <p className="text-xs text-muted-foreground">
                      {counts[c.id] ?? 0} use case{(counts[c.id] ?? 0) === 1 ? "" : "s"}
                    </p>
                    <div className="mt-auto flex items-center justify-between gap-2">
                      <Dialog
                        open={openId === c.id}
                        onOpenChange={(o) => setOpenId(o ? c.id : null)}
                      >
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            Open
                          </Button>
                        </DialogTrigger>
                        <CollectionDialog collection={c} onChanged={load} />
                      </Dialog>
                      <div className="flex items-center gap-1">
                        <div className="flex items-center gap-1.5 pr-1">
                          <Switch
                            checked={c.is_public}
                            onCheckedChange={(v) => togglePublic(c, v)}
                            aria-label="Public"
                          />
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => copyShare(c)}
                          title="Copy share link"
                          aria-label={`Copy share link for ${c.name}`}
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive"
                              aria-label={`Delete collection ${c.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete "{c.name}"?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This removes the collection and its items. This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => remove(c.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function CollectionDialog({
  collection,
  onChanged,
}: {
  collection: Collection;
  onChanged: () => void;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("collection_items")
      .select("id, use_case_id, note, position, use_cases(title, slug, summary)")
      .eq("collection_id", collection.id)
      .order("position", { ascending: true });
    setItems((data as unknown as Item[]) ?? []);
    setLoading(false);
  }, [collection.id]);
  useEffect(() => {
    load();
  }, [load]);

  const removeItem = async (id: string) => {
    const { error } = await supabase.from("collection_items").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
    onChanged();
  };

  return (
    <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{collection.name}</DialogTitle>
      </DialogHeader>
      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading items…</p>
      ) : items.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          No use cases yet. Browse the{" "}
          <Link to="/repository" className="font-semibold text-primary hover:underline">
            repository
          </Link>{" "}
          and add favorites to this collection.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((i) => (
            <div
              key={i.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
            >
              <div className="min-w-0">
                <p className="font-medium">{i.use_cases?.title ?? "Untitled"}</p>
                {i.use_cases?.summary && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    {i.use_cases.summary}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {i.use_cases?.slug && (
                  <Button asChild size="icon" variant="ghost" className="h-8 w-8">
                    <Link
                      to="/use-cases/$slug"
                      params={{ slug: i.use_cases.slug }}
                      title="Open"
                      aria-label="Open use case"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive"
                  onClick={() => removeItem(i.id)}
                  aria-label="Remove from collection"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <DialogFooter>
        <Button asChild variant="outline">
          <Link to="/repository">Add from repository</Link>
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
