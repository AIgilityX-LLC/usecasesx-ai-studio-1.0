/**
 * Printable report document.
 *
 * Presentation only: every value comes from the `PortfolioReport` model, which
 * is derived exclusively from workspace records. This component adds no facts,
 * no estimates and no sample content — a blank field renders as an explicit
 * gap so a reader can see what has not been captured yet.
 */

import {
  PROVENANCE_LABELS,
  orGap,
  type PortfolioReport,
  type ReportField,
  type ReportItemInput,
  type UseCaseReport,
} from "@/lib/reports/report-model";
import { SCORE_LABELS, type ScoreDimensions } from "@/lib/usecasex.store";
import {
  BENEFIT_CATEGORY_LABELS,
  BENEFIT_PERIOD_LABELS,
  BENEFIT_STATE_LABELS,
  BENEFIT_UNIT_LABELS,
  ERP_VERIFICATION_LABELS,
  type Benefit,
} from "@/lib/value/benefits.model";

interface Props {
  reportType: string;
  /** Lead with per-use-case detail rather than portfolio roll-ups. */
  useCaseLed: boolean;
  report: PortfolioReport;
  items: ReportItemInput[];
  narrative: string;
  narrativeEdited: boolean;
  generatedAt: Date;
  organization: string | null;
  author: string | null;
  authorRole: string | null;
  industry: string | null;
}

const BAND_TONE: Record<string, string> = {
  quick_win: "bg-emerald-50 border-emerald-200",
  candidate: "bg-blue-50 border-blue-200",
  readiness: "bg-amber-50 border-amber-200",
  low: "bg-slate-50 border-slate-200",
};

export function ReportDocument({
  reportType,
  useCaseLed,
  report,
  items,
  narrative,
  narrativeEdited,
  generatedAt,
  organization,
  author,
  authorRole,
  industry,
}: Props) {
  const { totals, portfolio } = report;
  const detail = (
    <Section title="Use case detail" source={PROVENANCE_LABELS.repository}>
      <div className="space-y-5">
        {report.reports.map((uc) => (
          <UseCaseBlock key={uc.slug} report={uc} />
        ))}
      </div>
    </Section>
  );

  return (
    <>
      <header className="report-section flex items-start justify-between border-b border-slate-200 pb-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-600">
            AIgilityX™ · UseCasesX™
          </p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight">{reportType}</h1>
          <p className="mt-2 text-sm text-slate-500">
            Generated{" "}
            {generatedAt.toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div className="text-right text-xs text-slate-500">
          <p className="font-semibold text-slate-900">{organization ?? "Your organization"}</p>
          <p>{orGap(author)}</p>
          {authorRole && <p>{authorRole}</p>}
          {industry && <p>{industry}</p>}
        </div>
      </header>

      {portfolio && (
        <Section title="Portfolio" source={PROVENANCE_LABELS.portfolio}>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <Meta label="Name" value={portfolio.name} />
            <Meta label="Type" value={portfolio.type} />
            <Meta label="Status" value={portfolio.status} />
            {portfolio.objective && <Meta label="Objective" value={portfolio.objective} wide />}
            {portfolio.targetDepartment && (
              <Meta label="Department" value={portfolio.targetDepartment} />
            )}
            {portfolio.targetQuarter && <Meta label="Target" value={portfolio.targetQuarter} />}
            <Meta
              label="Last reviewed"
              value={portfolio.lastReviewedAt ? portfolio.lastReviewedAt.slice(0, 10) : "—"}
            />
          </div>
        </Section>
      )}

      <Section title="Executive summary" source={PROVENANCE_LABELS.derived}>
        <div className="grid grid-cols-4 gap-3">
          <Stat label="Use cases" value={totals.useCases} />
          <Stat label="Scored" value={`${totals.scored}/${totals.useCases}`} />
          <Stat label="Avg score" value={totals.averageScore ?? "—"} />
          <Stat label="High risk" value={totals.highRisk} />
          <Stat label="With owner" value={`${totals.withOwner}/${totals.useCases}`} />
          <Stat label="With next action" value={`${totals.withNextAction}/${totals.useCases}`} />
          <Stat label="Benefits" value={totals.benefits} />
          <Stat label="Evidenced benefits" value={totals.evidencedBenefits} />
        </div>
        <div className="mt-4 rounded-md border border-indigo-200 bg-indigo-50/60 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
            {narrativeEdited ? "Narrative — edited by author" : PROVENANCE_LABELS.narrative}
          </p>
          <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
            {narrative}
          </p>
        </div>
      </Section>

      {useCaseLed && detail}

      {totals.scored > 0 && (
        <Section title="Score breakdown" source={PROVENANCE_LABELS.score}>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2 pr-2 font-medium">Use case</th>
                {Object.values(SCORE_LABELS).map((l) => (
                  <th key={l} className="px-1 py-2 text-center font-medium">
                    {l
                      .split(" ")
                      .map((w) => w[0])
                      .join("")}
                  </th>
                ))}
                <th className="py-2 pl-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {items
                .filter((i) => i.score)
                .map((i) => (
                  <tr key={i.content.slug} className="border-b border-slate-100">
                    <td className="max-w-[280px] truncate py-2 pr-2">{i.content.title}</td>
                    {(Object.keys(SCORE_LABELS) as Array<keyof ScoreDimensions>).map((k) => (
                      <td key={k} className="px-1 py-2 text-center tabular-nums text-slate-700">
                        {i.score?.[k]}
                      </td>
                    ))}
                    <td className="py-2 pl-2 text-right font-semibold tabular-nums">
                      {report.reports.find((r) => r.slug === i.content.slug)?.score?.total ?? "—"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          <p className="mt-2 text-[10px] text-slate-400">
            Dimensions: SA Strategic Alignment · VP Value Potential · F Feasibility · TtV Time to
            Value · RM Risk Manageability · GR Governance Readiness
          </p>
        </Section>
      )}

      <Section title="Priority matrix" source={PROVENANCE_LABELS.derived}>
        <div className="grid grid-cols-2 gap-3">
          {report.bands.map((band) => (
            <div
              key={band.key}
              className={`rounded-md border p-3 ${BAND_TONE[band.key] ?? "bg-slate-50 border-slate-200"}`}
            >
              <p className="mb-2 text-xs font-semibold text-slate-700">
                {band.range} · {band.label}
              </p>
              {band.titles.length === 0 ? (
                <p className="text-[11px] italic text-slate-500">None</p>
              ) : (
                <ul className="list-disc space-y-1 pl-4 text-xs text-slate-700">
                  {band.titles.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Shortlist" source={PROVENANCE_LABELS.derived}>
        {report.shortlist.length === 0 ? (
          <Empty>No use cases selected.</Empty>
        ) : (
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2 pr-2 font-medium">#</th>
                <th className="py-2 pr-2 font-medium">Use case</th>
                <th className="py-2 pr-2 font-medium">Decision</th>
                <th className="py-2 pl-2 text-right font-medium">Score</th>
              </tr>
            </thead>
            <tbody>
              {report.shortlist.map((row, index) => (
                <tr key={row.slug} className="border-b border-slate-100">
                  <td className="py-2 pr-2 tabular-nums text-slate-500">{index + 1}</td>
                  <td className="py-2 pr-2">{row.title}</td>
                  <td className="py-2 pr-2 text-slate-600">{row.decision}</td>
                  <td className="py-2 pl-2 text-right font-semibold tabular-nums">
                    {row.total ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {!useCaseLed && detail}

      <Section title="Delivery roadmap" source={PROVENANCE_LABELS.portfolio}>
        {report.roadmap.length === 0 ? (
          <Empty>
            No delivery records. Add these use cases to a portfolio to plan stages and owners.
          </Empty>
        ) : (
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2 pr-2 font-medium">Use case</th>
                <th className="py-2 pr-2 font-medium">Stage</th>
                <th className="py-2 pr-2 font-medium">Target</th>
                <th className="py-2 pr-2 font-medium">Owner</th>
                <th className="py-2 pr-2 font-medium">Milestone</th>
                <th className="py-2 font-medium">Next action</th>
              </tr>
            </thead>
            <tbody>
              {report.roadmap.map((row) => (
                <tr key={row.slug} className="border-b border-slate-100 align-top">
                  <td className="py-2 pr-2">{row.title}</td>
                  <td className="py-2 pr-2 text-slate-600">{row.stage}</td>
                  <td className="py-2 pr-2 text-slate-600">{row.targetPeriod}</td>
                  <td className="py-2 pr-2 text-slate-600">{row.owner}</td>
                  <td className="py-2 pr-2 text-slate-600">{row.milestone}</td>
                  <td className="py-2 text-slate-600">{row.nextAction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="Benefits register" source={PROVENANCE_LABELS.studio_value}>
        <BenefitsRegister items={items} />
      </Section>

      <Section title="Risks and gaps" source={PROVENANCE_LABELS.derived}>
        {report.gaps.length === 0 ? (
          <Empty>No data gaps detected in the selected records.</Empty>
        ) : (
          <div className="space-y-2">
            {report.gaps.map((gap) => (
              <div key={gap.slug} className="rounded-md border border-slate-200 p-3">
                <p className="text-xs font-semibold text-slate-900">{gap.title}</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-slate-600">
                  {gap.issues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Recommended next steps" source={PROVENANCE_LABELS.derived}>
        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-slate-700">
          {report.recommendations.map((rec) => (
            <li key={rec}>{rec}</li>
          ))}
        </ol>
      </Section>

      <Section title="Provenance and method" source={PROVENANCE_LABELS.derived}>
        <ul className="space-y-1 text-xs text-slate-600">
          <li>
            <strong>Repository record</strong> — published use case content, classifications and
            qualifiers.
          </li>
          <li>
            <strong>Your scoring</strong> — the six-dimension scores saved in this workspace.
          </li>
          <li>
            <strong>Portfolio decision record</strong> — decision, funding, delivery stage, owner
            and next action.
          </li>
          <li>
            <strong>Studio value register</strong> — benefits, evidence and verification status.
          </li>
          <li>
            <strong>Derived</strong> — counts, bands and recommendations calculated from the records
            above.
          </li>
          <li>
            No external benchmarks, market estimates or modelled figures are used. Fields with no
            stored value are shown as “—”.
          </li>
        </ul>
      </Section>

      <footer className="flex justify-between border-t border-slate-200 pt-6 text-[10px] text-slate-400">
        <span>© AIgilityX™ — Confidential. Generated via UseCasesX™ Pro.</span>
        <span>aigilityx.ai</span>
      </footer>
    </>
  );
}

function UseCaseBlock({ report }: { report: UseCaseReport }) {
  return (
    <div className="report-section rounded-md border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900">{report.title}</h3>
          <p className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-400">{report.slug}</p>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-2xl font-semibold tabular-nums">{report.score?.total ?? "—"}</div>
          {report.score && (
            <div className="text-[10px] uppercase tracking-wide text-slate-500">
              {report.score.interpretation}
            </div>
          )}
        </div>
      </div>

      <FieldGrid title="Context" fields={report.context} />
      <FieldGrid title="Opportunity" fields={report.opportunity} />
      <FieldGrid title="Solution" fields={report.solution} />
      <FieldGrid title="Feasibility" fields={report.feasibility} />
      <FieldGrid title="Risks" fields={report.risks} />
      <FieldGrid title="Owner and decision" fields={report.owner} />
      <FieldGrid title="Roadmap" fields={report.roadmap} />

      <div className="mt-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Value</p>
        {report.value.benefits.length === 0 ? (
          <p className="text-xs italic text-slate-500">No benefits captured.</p>
        ) : (
          <p className="text-xs text-slate-700">
            {report.value.benefits.length} benefit
            {report.value.benefits.length === 1 ? "" : "s"} recorded · {report.value.evidencedCount}{" "}
            evidenced
            {report.value.ownerGaps > 0 ? ` · ${report.value.ownerGaps} without an owner` : ""}
          </p>
        )}
      </div>

      <div className="mt-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Next action
        </p>
        <p className="text-xs text-slate-700">{report.nextAction ?? "—"}</p>
      </div>
    </div>
  );
}

function FieldGrid({ title, fields }: { title: string; fields: ReportField[] }) {
  return (
    <div className="mt-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1">
        {fields.map((field) => (
          <div key={field.label} className="text-xs">
            <span className="text-slate-500">{field.label}: </span>
            <span className="text-slate-800">{field.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BenefitsRegister({ items }: { items: ReportItemInput[] }) {
  const rows: Array<{ title: string; benefit: Benefit }> = [];
  for (const item of items) {
    for (const benefit of item.benefits ?? []) rows.push({ title: item.content.title, benefit });
  }
  if (rows.length === 0) {
    return <Empty>No benefits captured in the Studio value register for these use cases.</Empty>;
  }
  return (
    <table className="w-full border-collapse text-xs">
      <thead>
        <tr className="border-b border-slate-200 text-left text-slate-500">
          <th className="py-2 pr-2 font-medium">Use case</th>
          <th className="py-2 pr-2 font-medium">Benefit</th>
          <th className="py-2 pr-2 font-medium">Category</th>
          <th className="py-2 pr-2 font-medium">Expected</th>
          <th className="py-2 pr-2 font-medium">State</th>
          <th className="py-2 pr-2 font-medium">Verification</th>
          <th className="py-2 font-medium">Evidence</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ title, benefit }) => (
          <tr key={benefit.id} className="border-b border-slate-100 align-top">
            <td className="py-2 pr-2">{title}</td>
            <td className="py-2 pr-2">
              {benefit.name}
              {benefit.kpi && <span className="block text-slate-500">KPI: {benefit.kpi}</span>}
            </td>
            <td className="py-2 pr-2 text-slate-600">
              {BENEFIT_CATEGORY_LABELS[benefit.category] ?? benefit.category}
            </td>
            <td className="py-2 pr-2 tabular-nums text-slate-700">
              {benefit.expectedValue == null
                ? "—"
                : `${benefit.expectedValue.toLocaleString()} ${
                    benefit.currency ?? BENEFIT_UNIT_LABELS[benefit.unitType]
                  } / ${BENEFIT_PERIOD_LABELS[benefit.period]}`}
            </td>
            <td className="py-2 pr-2 text-slate-600">
              {BENEFIT_STATE_LABELS[benefit.state] ?? benefit.state}
            </td>
            <td className="py-2 pr-2 text-slate-600">
              {ERP_VERIFICATION_LABELS[benefit.erpVerificationStatus] ??
                benefit.erpVerificationStatus}
              {benefit.erpLastVerifiedAt && (
                <span className="block text-slate-400">
                  {benefit.erpLastVerifiedAt.slice(0, 10)}
                </span>
              )}
            </td>
            <td className="py-2 text-slate-600">
              {benefit.evidenceLinks.length === 0 ? (
                orGap(benefit.evidenceSource)
              ) : (
                <ul className="space-y-0.5">
                  {benefit.evidenceLinks.map((evidence, index) => (
                    <li key={`${benefit.id}-${index}`} className="break-all">
                      {evidence.label || evidence.kind}
                      {evidence.kind === "link" && evidence.url ? ` — ${evidence.url}` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Section({
  title,
  source,
  children,
}: {
  title: string;
  source: string;
  children: React.ReactNode;
}) {
  return (
    <section className="report-section space-y-3">
      <div className="flex items-baseline justify-between gap-3 border-l-4 border-indigo-500 pl-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-indigo-700">{title}</h2>
        <span className="text-[10px] uppercase tracking-wide text-slate-400">{source}</span>
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-center">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function Meta({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-3" : ""}>
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm text-slate-900">{value}</p>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-xs italic text-slate-500">{children}</p>;
}
