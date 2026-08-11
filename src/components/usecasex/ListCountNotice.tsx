import { AlertTriangle, HelpCircle, Info } from "lucide-react";

import { MAX_PAGE_SIZE, describeListMeta, type ListMeta } from "@/lib/domain/pagination";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  meta: ListMeta;
  /** Plural lowercase noun for the rows, e.g. "saved use cases". */
  noun: string;
  /** Optional extra guidance shown when the list is capped. */
  action?: string;
  className?: string;
}

/**
 * Honest completeness line for a bounded list: "Showing 12 of 12" is silent,
 * "Showing the first 500 of 1,240" is stated plainly with a warning tone.
 *
 * Lists in this product are capped so a large workspace cannot pull its whole
 * table into the browser. A cap the user cannot see is a correctness bug, so
 * every capped surface renders this.
 */
export function ListCountNotice({ meta, noun, action, className }: Props) {
  const message = describeListMeta(meta, noun);
  if (!message) return null;

  const Icon = meta.truncated ? AlertTriangle : Info;
  const pageCap = Math.min(meta.cap, MAX_PAGE_SIZE);
  const help = [
    `This list loads at most ${meta.cap.toLocaleString()} ${noun}, in pages of up to ${pageCap.toLocaleString()} rows, so a large workspace never pulls its whole table into the browser.`,
    meta.truncated
      ? meta.total !== null
        ? `Results are truncated: ${meta.total.toLocaleString()} ${noun} match, and ${meta.loaded.toLocaleString()} were loaded. Narrow with search or filters to reach the rest.`
        : `Results are truncated at the ${meta.cap.toLocaleString()}-row cap. Narrow with search or filters to reach the rest.`
      : `Nothing is hidden: all ${meta.loaded.toLocaleString()} matching ${noun} are shown.`,
  ].join(" ");

  return (
    <p
      role="status"
      className={[
        "flex items-start gap-2 rounded-md border px-3 py-2 text-xs",
        meta.truncated
          ? "border-amber-500/40 bg-amber-500/10 text-foreground"
          : "border-border bg-muted/40 text-muted-foreground",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>
        {message}
        {meta.truncated && action ? <> {action}</> : null}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="ml-1 inline-flex align-middle text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`How this list is limited: ${help}`}
              >
                <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs">{help}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </span>
    </p>
  );
}
