import { createFileRoute, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getUseCaseBySlug } from "@/lib/use-cases.functions";
import { UseCaseDetail } from "@/components/UseCaseDetail";
import { LeadCaptureModal } from "@/components/LeadCaptureModal";

const caseQ = (slug: string) => queryOptions({
  queryKey: ["use-case", slug],
  queryFn: async () => {
    const c = await getUseCaseBySlug({ data: { slug } });
    if (!c) throw notFound();
    return c;
  },
});

export const Route = createFileRoute("/ai-hub/usecasex/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — UseCaseX™` },
      { name: "description", content: "AI use case detail — business problem, AI solution, value, data, KPIs, ROI, risk & governance." },
    ],
  }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(caseQ(params.slug)),
  component: Page,
  errorComponent: ({ error }) => <div className="p-12 text-center text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-12 text-center">Use case not found</div>,
});

function Page() {
  const { slug } = Route.useParams();
  const { data: c } = useSuspenseQuery(caseQ(slug));
  const [openLead, setOpenLead] = useState(false);
  return (
    <>
      <UseCaseDetail c={c} onLeadCapture={() => setOpenLead(true)} />
      <LeadCaptureModal open={openLead} onClose={() => setOpenLead(false)} sourceUseCase={slug} sourcePage="usecase-detail" />
    </>
  );
}
