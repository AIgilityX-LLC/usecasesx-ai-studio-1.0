import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { downloadSampleReport } from "@/lib/sample-report";

const KEY = "ucx.onboarding.dismissed.v1";

type Step = {
  id: string;
  label: string;
  hint: string;
  done: boolean;
  cta: { label: string; to?: string; onClick?: () => void };
};

interface Props {
  savedCount: number;
  scoredCount: number;
  portfolioCount: number;
  reportCount: number;
}

export function OnboardingChecklist({
  savedCount,
  scoredCount,
  portfolioCount,
  reportCount,
}: Props) {
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  const steps: Step[] = [
    {
      id: "save",
      label: "Save your first use case",
      hint: "Bookmark a use case from the repository into your workspace.",
      done: savedCount > 0,
      cta: { label: "Browse repository →", to: "/repository" },
    },
    {
      id: "score",
      label: "Score a use case",
      hint: "Rate Strategic · Value · Feasibility · Risk · Readiness · TTV.",
      done: scoredCount > 0,
      cta: { label: "Open my use cases →", to: "/my-use-cases" },
    },
    {
      id: "board",
      label: "Add to a board (portfolio)",
      hint: "Group related use cases into an AI Opportunity Portfolio.",
      done: portfolioCount > 0,
      cta: { label: "Open boards →", to: "/boards" },
    },
    {
      id: "export",
      label: "Export a board-ready PDF",
      hint: "One click: KPIs, top cases, risk posture and next actions.",
      done: reportCount > 0,
      cta: { label: "See a sample PDF ↓", onClick: downloadSampleReport },
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const pct = Math.round((doneCount / steps.length) * 100);
  const allDone = doneCount === steps.length;

  if (dismissed === null) return null;
  if (dismissed || allDone) return null;

  return (
    <section
      aria-label="Get started checklist"
      className="rounded-2xl border border-primary/30 bg-primary/5 p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
            Get started · {doneCount} of {steps.length} complete
          </div>
          <h2 className="mt-1 text-xl font-bold text-foreground">
            Set up your AI Opportunity Portfolio
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Four quick steps to your first board-ready PDF.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            try {
              localStorage.setItem(KEY, "1");
            } catch {
              /* storage unavailable */
            }
            setDismissed(true);
          }}
          className="rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          Dismiss
        </button>
      </div>

      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>

      <ol className="mt-5 grid gap-3 sm:grid-cols-2">
        {steps.map((s, i) => (
          <li
            key={s.id}
            className={`flex items-start gap-3 rounded-xl border p-4 ${
              s.done ? "border-emerald-500/40 bg-background" : "border-border bg-background"
            }`}
          >
            <div
              aria-hidden
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                s.done ? "bg-emerald-500/15 text-emerald-500" : "bg-primary/10 text-primary"
              }`}
            >
              {s.done ? "✓" : i + 1}
            </div>
            <div className="min-w-0 flex-1">
              <div
                className={`text-sm font-semibold ${s.done ? "text-muted-foreground line-through" : "text-foreground"}`}
              >
                {s.label}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{s.hint}</p>
              {!s.done &&
                (s.cta.to ? (
                  <Link
                    to={s.cta.to as "/repository"}
                    className="mt-2 inline-flex text-xs font-bold text-primary hover:underline"
                  >
                    {s.cta.label}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={s.cta.onClick}
                    className="mt-2 text-xs font-bold text-primary hover:underline"
                  >
                    {s.cta.label}
                  </button>
                ))}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
