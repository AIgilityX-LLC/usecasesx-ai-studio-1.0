import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useState } from "react";
import { MOCK_USE_CASES } from "@/lib/usecasex.mock";
import { UseCaseDetail } from "@/components/UseCaseDetail";
import { LeadCaptureModal } from "@/components/LeadCaptureModal";

function findMock(slug: string) {
  const m = MOCK_USE_CASES.find((u) => u.slug === slug);
  if (!m) return null;
  return {
    title: m.title,
    summary: m.summary,
    maturity: m.maturity,
    use_case_industries: [{ industries: { name: m.industry.name } }],
    use_case_capabilities: [{ ai_capabilities: { name: m.aiType } }],
    platforms: m.platforms.map((p) => p.name).join(", "),
    business_problem: null,
    ai_solution: null,
    business_value: `Value potential: ${m.valuePotential}. Time to value: ${m.timeToValue}.`,
    data_requirements: null,
    kpis: null,
    roi_areas: null,
    risk_governance: `Risk level: ${m.riskLevel}. Complexity: ${m.complexity}.`,
  };
}

export const Route = createFileRoute("/ai-hub/usecasex/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — UseCaseX™` },
      { name: "description", content: "AI use case detail — business problem, AI solution, value, data, KPIs, ROI, risk & governance." },
    ],
  }),
  loader: ({ params }) => {
    const c = findMock(params.slug);
    if (!c) throw notFound();
    return c;
  },
  component: Page,
  errorComponent: ({ error }) => <div className="p-12 text-center text-destructive">{error.message}</div>,
  notFoundComponent: () => (
    <div className="p-12 text-center">
      <p className="text-lg font-semibold">Use case not found</p>
      <Link to="/ai-hub/usecasex/explore" className="mt-4 inline-block text-primary hover:underline">← Back to Explore</Link>
    </div>
  ),
});

function Page() {
  const { slug } = Route.useParams();
  const c = Route.useLoaderData();
  const [openLead, setOpenLead] = useState(false);
  return (
    <>
      <UseCaseDetail c={c} onLeadCapture={() => setOpenLead(true)} />
      <LeadCaptureModal open={openLead} onClose={() => setOpenLead(false)} sourceUseCase={slug} sourcePage="usecase-detail" />
    </>
  );
}
