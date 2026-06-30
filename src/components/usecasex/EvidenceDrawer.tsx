import { Link } from "@tanstack/react-router";
import { ExternalLink, FileText, Link2, BookMarked } from "lucide-react";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";

export interface EvidenceSource {
  label: string;
  detail?: string;
  /** Optional clickable reference link. */
  url?: string;
  /** Source kind shown as metadata pill. */
  kind?: string;
  /** Optional deep-link into the filtered catalog. */
  link?: { facet: "industries" | "capabilities" | "businessFunctions" | "objectives"; slug: string };
}

interface EvidenceDrawerProps {
  title: string;
  sources: EvidenceSource[];
  citations: string[];
  trigger?: React.ReactNode;
}

/**
 * Dedicated citations & evidence drawer. Renders each source with clickable
 * references, metadata pills, and optional deep links into the filtered
 * catalog, plus a numbered citations / methodology list.
 */
export function EvidenceDrawer({ title, sources, citations, trigger }: EvidenceDrawerProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger ?? (
          <button className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-foreground transition hover:border-primary/40 hover:bg-secondary">
            <BookMarked className="h-3.5 w-3.5 text-primary" />
            Evidence &amp; Citations
          </button>
        )}
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <BookMarked className="h-4 w-4 text-primary" />
            Evidence &amp; Citations
          </SheetTitle>
          <SheetDescription>
            Transparent provenance for <span className="font-medium text-foreground">{title}</span>.
            References, source metadata, and methodology.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-primary">
              Sources &amp; references
            </div>
            <ul className="mt-3 space-y-2.5">
              {sources.map((s, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-border bg-card/60 p-3"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                      {s.url ? <Link2 className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      {s.url ? (
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="inline-flex items-center gap-1 text-sm font-semibold text-foreground hover:text-primary"
                        >
                          {s.label}
                          <ExternalLink className="h-3 w-3 shrink-0 opacity-70" />
                        </a>
                      ) : (
                        <div className="text-sm font-semibold text-foreground">{s.label}</div>
                      )}
                      {s.detail && (
                        <p className="mt-0.5 break-words text-xs text-muted-foreground">{s.detail}</p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {s.kind && (
                          <span className="rounded bg-secondary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                            {s.kind}
                          </span>
                        )}
                        {s.link && (
                          <Link
                            to="/repository"
                            search={{ [s.link.facet]: [s.link.slug] } as never}
                            className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary hover:bg-primary/20"
                          >
                            Explore related →
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
              {sources.length === 0 && (
                <li className="text-xs text-muted-foreground">No structured sources recorded.</li>
              )}
            </ul>
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-primary">
              Citations &amp; methodology
            </div>
            <ol className="mt-3 space-y-2.5">
              {citations.map((cit, i) => (
                <li key={i} className="flex gap-2.5 text-xs leading-relaxed text-muted-foreground">
                  <span className="font-mono font-bold text-primary">[{i + 1}]</span>
                  <span>{cit}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}