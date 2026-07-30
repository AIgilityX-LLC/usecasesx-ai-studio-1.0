import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { PRODUCT_EVENTS, recordProductEvent } from "@/lib/telemetry";

const KEY = "ucx.tour.seen.v1";

const STOPS = [
  {
    title: "1 · Discover",
    body: "Browse the repository and save the AI use cases that match your industry and functions.",
  },
  {
    title: "2 · Score & prioritize",
    body: "Rate value, feasibility, risk and time-to-value to rank your shortlist objectively.",
  },
  {
    title: "3 · Portfolio & export",
    body: "Group cases into a board and export a leadership-ready portfolio summary.",
  },
];

/**
 * Short, dismissible product tour shown once after activation. Purely
 * presentational — it never blocks the page and stores its state locally.
 */
export function ProductTour() {
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) !== "1") setVisible(true);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const close = (completed: boolean) => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* storage unavailable */
    }
    setVisible(false);
    if (completed) void recordProductEvent({ event: PRODUCT_EVENTS.tourCompleted });
  };

  if (!visible) return null;
  const stop = STOPS[index];

  return (
    <aside
      aria-label="Product tour"
      className="fixed bottom-4 right-4 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-border bg-card p-4 shadow-lg"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
          Quick tour
        </div>
        <button
          type="button"
          onClick={() => close(false)}
          aria-label="Close tour"
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <h2 className="mt-1 text-sm font-bold text-foreground">{stop.title}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{stop.body}</p>
      <div className="mt-4 flex items-center justify-between">
        <div className="flex gap-1.5" aria-hidden>
          {STOPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-4 rounded-full ${i === index ? "bg-primary" : "bg-secondary"}`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => (index === STOPS.length - 1 ? close(true) : setIndex(index + 1))}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:brightness-110"
        >
          {index === STOPS.length - 1 ? "Got it" : "Next"}
        </button>
      </div>
    </aside>
  );
}
