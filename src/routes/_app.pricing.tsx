import { createFileRoute } from "@tanstack/react-router";
import { publicHead } from "@/lib/seo";
import { PricingPageContent } from "@/components/pricing/PricingPageContent";

export const Route = createFileRoute("/_app/pricing")({
  head: () =>
    publicHead({
      path: "/pricing",
      title: "Pricing — UseCasesX™",
      description:
        "Lite, Pro Founding Access and Enterprise plans for AI use case discovery, scoring, portfolios and governance.",
    }),
  component: PricingPageContent,
});
