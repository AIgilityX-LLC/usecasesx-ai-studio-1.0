import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Bookmark, BookmarkCheck, Lightbulb, Printer, Share2, Wand2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";

import { supabase } from "@/integrations/supabase/client";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { customizeUseCase } from "@/lib/customize.functions";
import { trackCTAEvent } from "@/lib/usecasex.tracking";

export type DetailIntent = "save" | "customize";

interface DecisionActionsProps {
  useCaseId: string;
  slug: string;
  title: string;
  /** Short public summary — safe to put in a share payload. */
  summary?: string | null;
  /** Intent carried back from the sign-in round trip, resumed automatically. */
  pendingIntent?: DetailIntent;
  onIntentResolved?: () => void;
}

/**
 * Decision actions for a curated repository entry: shortlist it, start a
 * private workspace copy in the Studio, share the public link, or print.
 *
 * Signed-out users are sent to /auth with the intended action encoded in the
 * URL, and the action resumes automatically once they return.
 */
export function DecisionActions({
  useCaseId,
  slug,
  title,
  summary,
  pendingIntent,
  onIntentResolved,
}: DecisionActionsProps) {
  const session = useSupabaseSession();
  const navigate = useNavigate();
  const customize = useServerFn(customizeUseCase);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState<DetailIntent | null>(null);
  const resumed = useRef(false);

  // Reflect existing shortlist membership so the control never lies.
  useEffect(() => {
    if (!session?.user) {
      setSaved(false);
      return;
    }
    let active = true;
    void supabase
      .from("saved_use_cases")
      .select("use_case_id")
      .eq("user_id", session.user.id)
      .eq("use_case_id", useCaseId)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setSaved(!!data);
      });
    return () => {
      active = false;
    };
  }, [session?.user, useCaseId]);

  const requireSignIn = useCallback(
    (intent: DetailIntent) => {
      toast.info("Sign in to continue — we'll bring you straight back.");
      navigate({
        to: "/auth",
        search: { redirect: `/use-cases/${slug}`, intent } as never,
      });
    },
    [navigate, slug],
  );

  const doSave = useCallback(async () => {
    setBusy("save");
    try {
      const { saveUseCase } = await import("@/lib/usecasex.services");
      await saveUseCase(useCaseId, { priority: "Medium" });
      setSaved(true);
      trackCTAEvent("save_to_shortlist", { use_case_id: useCaseId, slug });
      toast.success("Saved to your shortlist.", {
        action: { label: "View shortlist", onClick: () => navigate({ to: "/my-use-cases" }) },
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save this use case.");
    } finally {
      setBusy(null);
    }
  }, [navigate, slug, useCaseId]);

  const doCustomize = useCallback(async () => {
    setBusy("customize");
    try {
      const res = await customize({ data: { slug } });
      trackCTAEvent("customize_in_studio", {
        use_case_id: useCaseId,
        slug,
        target_route: `/studio/use-case/${res.draftId}`,
      });
      toast.success(
        res.reused
          ? "Opening your existing private draft."
          : "Private draft created in your workspace.",
      );
      navigate({ to: "/studio/use-case/$id", params: { id: res.draftId } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start your draft.");
    } finally {
      setBusy(null);
    }
  }, [customize, navigate, slug, useCaseId]);

  // Resume the action the user chose before signing in.
  useEffect(() => {
    if (!pendingIntent || resumed.current) return;
    if (session === undefined) return; // session still resolving
    resumed.current = true;
    onIntentResolved?.();
    if (!session) return;
    if (pendingIntent === "save") void doSave();
    if (pendingIntent === "customize") void doCustomize();
  }, [pendingIntent, session, doSave, doCustomize, onIntentResolved]);

  const onSave = () => (session ? void doSave() : requireSignIn("save"));
  const onCustomize = () => (session ? void doCustomize() : requireSignIn("customize"));

  const onShare = async () => {
    // Only the public, published URL and public summary are shared — no
    // workspace, draft, or account data ever leaves this component.
    const url = `${window.location.origin}/use-cases/${slug}`;
    trackCTAEvent("share_use_case", { use_case_id: useCaseId, slug });
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title, text: summary ?? undefined, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Public link copied to clipboard.");
    } catch {
      /* user dismissed the share sheet */
    }
  };

  const onPrint = () => {
    trackCTAEvent("print_use_case", { use_case_id: useCaseId, slug });
    window.print();
  };

  const btn =
    "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60";

  return (
    <div className="no-print flex flex-wrap gap-2" role="group" aria-label="Use case actions">
      <button
        type="button"
        onClick={onSave}
        disabled={busy !== null}
        aria-pressed={saved}
        className={`${btn} bg-primary text-primary-foreground hover:bg-primary/90`}
      >
        {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
        {saved ? "Saved to shortlist" : busy === "save" ? "Saving…" : "Save to shortlist"}
      </button>
      <Link
        to="/opportunities/new"
        search={{ source: "repository" as const, fromUseCase: useCaseId, title }}
        className={`${btn} border border-border bg-background hover:bg-muted`}
      >
        <Lightbulb className="h-4 w-4" />
        Capture as opportunity
      </Link>
      <button
        type="button"
        onClick={onCustomize}
        disabled={busy !== null}
        className={`${btn} border border-primary/40 bg-primary/5 text-primary hover:bg-primary/10`}
      >
        <Wand2 className="h-4 w-4" />
        {busy === "customize" ? "Creating draft…" : "Customize in Studio"}
      </button>
      <button
        type="button"
        onClick={onShare}
        className={`${btn} border border-border bg-background text-foreground hover:bg-secondary`}
      >
        <Share2 className="h-4 w-4" />
        Share
      </button>
      <button
        type="button"
        onClick={onPrint}
        className={`${btn} border border-border bg-background text-foreground hover:bg-secondary`}
      >
        <Printer className="h-4 w-4" />
        Print
      </button>
    </div>
  );
}
