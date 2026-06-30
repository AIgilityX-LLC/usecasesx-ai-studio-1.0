import { Link } from "@tanstack/react-router";
import { ExternalLink, FileText, Link2, BookMarked, Download, FileJson } from "lucide-react";
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
  const buildPackage = () => ({
    title,
    exportedAt: new Date().toISOString(),
    sources: sources.map((s) => ({
      label: s.label,
      detail: s.detail ?? null,
      url: s.url ?? null,
      kind: s.kind ?? null,
      deepLink: s.link
        ? `/repository?${s.link.facet}=${encodeURIComponent(s.link.slug)}`
        : null,
    })),
    citations,
  });

  const slugify = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "evidence";

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(buildPackage(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugify(title)}-evidence.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPdf = () => {
    const pkg = buildPackage();
    const esc = (v: string) =>
      v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const sourcesHtml = pkg.sources
      .map(
        (s) => `<li><strong>${esc(s.label)}</strong>${s.kind ? ` <em>(${esc(s.kind)})</em>` : ""}
        ${s.detail ? `<div>${esc(s.detail)}</div>` : ""}
        ${s.url ? `<div><a href="${esc(s.url)}">${esc(s.url)}</a></div>` : ""}
        ${s.deepLink ? `<div>Related: <a href="${origin}${esc(s.deepLink)}">${origin}${esc(s.deepLink)}</a></div>` : ""}</li>`,
      )
      .join("");
    const citationsHtml = pkg.citations.map((c, i) => `<li>[${i + 1}] ${esc(c)}</li>`).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)} — Evidence</title>
      <style>
        body{font-family:system-ui,sans-serif;margin:40px;color:#111;line-height:1.5}
        h1{font-size:20px} h2{font-size:13px;text-transform:uppercase;letter-spacing:.1em;color:#555;margin-top:24px}
        li{margin-bottom:10px} a{color:#1a5fd0;word-break:break-all} .meta{color:#777;font-size:12px}
      </style></head><body>
      <h1>${esc(title)}</h1>
      <div class="meta">Evidence &amp; Citations — exported ${new Date(pkg.exportedAt).toLocaleString()}</div>
      <h2>Sources &amp; references</h2><ul>${sourcesHtml || "<li>None recorded.</li>"}</ul>
      <h2>Citations &amp; methodology</h2><ol>${citationsHtml || "<li>None recorded.</li>"}</ol>
      <script>window.onload=function(){window.print();}</script>
      </body></html>`;
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
    }
  };
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
          <div className="flex flex-wrap gap-2">
            <button
              onClick={downloadPdf}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-primary-foreground hover:brightness-110"
            >
              <Download className="h-3.5 w-3.5" />
              Export PDF
            </button>
            <button
              onClick={downloadJson}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-foreground hover:bg-secondary"
            >
              <FileJson className="h-3.5 w-3.5 text-primary" />
              Export JSON
            </button>
          </div>
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