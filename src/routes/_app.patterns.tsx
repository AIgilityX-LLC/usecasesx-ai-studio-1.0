import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { EvidenceClassBadge } from "@/components/usecasex/EvidenceClassBadge";
import {
  PATTERN_TEMPLATE_SEEDS,
  SECTOR_CONTEXT_LABEL,
  SECTOR_CONTEXTS,
  TEMPLATE_KIND_LABEL,
  TEMPLATE_KINDS,
  type SectorContext,
  type TemplateKind,
} from "@/lib/content-governance";

export const Route = createFileRoute("/_app/patterns")({
  head: () => ({
    meta: [
      { title: "Pattern Library — UseCasesX™" },
      {
        name: "description",
        content:
          "Reusable AI pattern templates across GenAI, RAG, predictive ML, vision, automation and agentic workflows — reviewed shapes, not invented case studies.",
      },
    ],
  }),
  component: PatternsPage,
});

function PatternsPage() {
  const [kind, setKind] = useState<TemplateKind | "all">("all");
  const [sector, setSector] = useState<SectorContext | "all">("all");

  const rows = useMemo(
    () =>
      PATTERN_TEMPLATE_SEEDS.filter(
        (t) =>
          (kind === "all" || t.templateKind === kind) &&
          (sector === "all" || t.sectorContext === sector),
      ),
    [kind, sector],
  );

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-6 py-10">
      <header className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
          Pattern library
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Reusable AI pattern templates</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Reviewed capability shapes for GenAI, RAG, predictive ML, computer vision, automation and
          agentic workflows across enterprise, SME, government, defense and regulated contexts.
          These are <strong>pattern templates</strong> — not verified client case studies. No
          invented ROI, clients or outcomes.
        </p>
      </header>

      <div className="flex flex-wrap gap-3">
        <label className="text-sm">
          <span className="mr-2 text-muted-foreground">Modality</span>
          <select
            className="rounded-md border border-input bg-background px-2 py-1"
            value={kind}
            onChange={(e) => setKind(e.target.value as TemplateKind | "all")}
          >
            <option value="all">All</option>
            {TEMPLATE_KINDS.map((k) => (
              <option key={k} value={k}>
                {TEMPLATE_KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mr-2 text-muted-foreground">Context</span>
          <select
            className="rounded-md border border-input bg-background px-2 py-1"
            value={sector}
            onChange={(e) => setSector(e.target.value as SectorContext | "all")}
          >
            <option value="all">All</option>
            {SECTOR_CONTEXTS.map((s) => (
              <option key={s} value={s}>
                {SECTOR_CONTEXT_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <ul className="space-y-4">
        {rows.map((t) => (
          <li key={t.slug} className="rounded-xl border border-border bg-card/40 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold">{t.title}</h2>
              <EvidenceClassBadge evidenceClass="pattern_template" />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {TEMPLATE_KIND_LABEL[t.templateKind]} · {SECTOR_CONTEXT_LABEL[t.sectorContext]}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">{t.summary}</p>
            <p className="mt-2 text-sm">
              <span className="font-medium">Problem shape: </span>
              {t.businessProblem}
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Metric categories (not outcomes)
                </div>
                <ul className="mt-1 list-inside list-disc text-sm">
                  {t.kpiCategories.map((k) => (
                    <li key={k}>{k}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Control themes
                </div>
                <ul className="mt-1 list-inside list-disc text-sm">
                  {t.controlThemes.map((k) => (
                    <li key={k}>{k}</li>
                  ))}
                </ul>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
