import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

interface Feedback {
  id: string;
  comment: string;
  sentiment: string | null;
  created_at: string;
}

export function RatingWidget({ slug }: { slug: string }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [myRating, setMyRating] = useState<number>(0);
  const [hover, setHover] = useState<number>(0);
  const [avg, setAvg] = useState<number | null>(null);
  const [count, setCount] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [sentiment, setSentiment] = useState<"positive" | "neutral" | "negative">("positive");
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id ?? null;
    setUserId(uid);

    const [agg, fb, mine] = await Promise.all([
      supabase.from("use_case_rating_aggregates").select("*").eq("use_case_slug", slug).maybeSingle(),
      supabase
        .from("use_case_feedback")
        .select("id, comment, sentiment, created_at")
        .eq("use_case_slug", slug)
        .eq("is_public", true)
        .eq("is_hidden", false)
        .order("created_at", { ascending: false })
        .limit(10),
      uid
        ? supabase.from("use_case_ratings").select("rating").eq("use_case_slug", slug).eq("user_id", uid).maybeSingle()
        : Promise.resolve({ data: null } as any),
    ]);

    setAvg(agg.data?.avg_rating ? Number(agg.data.avg_rating) : null);
    setCount(agg.data?.rating_count ?? 0);
    setFeedback(fb.data ?? []);
    setMyRating(mine.data?.rating ?? 0);
  };

  useEffect(() => {
    load();
  }, [slug]);

  const submitRating = async (rating: number) => {
    if (!userId) return;
    setSaving(true);
    setMsg(null);
    const { error } = await supabase
      .from("use_case_ratings")
      .upsert({ use_case_slug: slug, user_id: userId, rating }, { onConflict: "use_case_slug,user_id" });
    setSaving(false);
    if (error) {
      setMsg(error.message);
    } else {
      setMyRating(rating);
      setMsg("Thanks — your rating was saved.");
      await load();
    }
  };

  const submitFeedback = async () => {
    if (!userId || !comment.trim()) return;
    setSaving(true);
    setMsg(null);
    const { error } = await supabase
      .from("use_case_feedback")
      .insert({ use_case_slug: slug, user_id: userId, comment: comment.trim(), sentiment, is_public: true });
    setSaving(false);
    if (error) {
      setMsg(error.message);
    } else {
      setComment("");
      setMsg("Thanks — your feedback was published.");
      await load();
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card/60 p-6">
      <div className="text-[11px] font-bold uppercase tracking-widest text-primary">15 · Community Rating</div>
      <div className="mt-3 flex flex-wrap items-baseline gap-3">
        <div className="text-3xl font-bold text-foreground">{avg ? avg.toFixed(1) : "—"}</div>
        <div className="text-sm text-muted-foreground">
          {count} {count === 1 ? "rating" : "ratings"}
        </div>
      </div>

      <div className="mt-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your rating</div>
        {userId ? (
          <div className="mt-2 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => {
              const active = (hover || myRating) >= n;
              return (
                <button
                  key={n}
                  type="button"
                  disabled={saving}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => submitRating(n)}
                  className={`text-2xl transition ${active ? "text-amber-400" : "text-muted-foreground/40"} hover:scale-110`}
                  aria-label={`Rate ${n} star${n > 1 ? "s" : ""}`}
                >
                  ★
                </button>
              );
            })}
            {myRating > 0 && <span className="ml-2 text-xs text-muted-foreground">You rated {myRating}/5</span>}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            <Link to="/auth" className="font-semibold text-primary hover:underline">
              Sign in
            </Link>{" "}
            to rate this use case.
          </p>
        )}
      </div>

      {userId && (
        <div className="mt-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Share feedback</div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 2000))}
            placeholder="What worked, what's missing, what would you improve?"
            rows={3}
            className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select
              value={sentiment}
              onChange={(e) => setSentiment(e.target.value as any)}
              className="rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
            >
              <option value="positive">Positive</option>
              <option value="neutral">Neutral</option>
              <option value="negative">Negative</option>
            </select>
            <button
              type="button"
              disabled={saving || !comment.trim()}
              onClick={submitFeedback}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50"
            >
              Publish feedback
            </button>
            <span className="text-[10px] text-muted-foreground">{comment.length}/2000</span>
          </div>
        </div>
      )}

      {msg && <p className="mt-3 text-xs text-muted-foreground">{msg}</p>}

      {feedback.length > 0 && (
        <div className="mt-6 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent feedback</div>
          {feedback.map((f) => (
            <div key={f.id} className="rounded-lg border border-border bg-background/40 p-3">
              <div className="flex items-center justify-between">
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    f.sentiment === "positive"
                      ? "bg-emerald-500/10 text-emerald-500"
                      : f.sentiment === "negative"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {f.sentiment ?? "neutral"}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(f.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="mt-2 text-sm text-foreground/90">{f.comment}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
