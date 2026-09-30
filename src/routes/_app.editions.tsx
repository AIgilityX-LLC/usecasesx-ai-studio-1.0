import { createFileRoute } from "@tanstack/react-router";

import { breadcrumbJsonLd, publicHead } from "@/lib/seo";
import { PricingPageContent } from "@/components/pricing/PricingPageContent";

export const Route = createFileRoute("/_app/editions")({
  head: () =>
    publicHead({
      path: "/editions",
      title: "Pricing — UseCasesX™",
      description:
        "Lite, Pro Founding Access and Enterprise plans for AI use case discovery, scoring, portfolios and governance.",
      jsonLd: [
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Editions", path: "/editions" },
        ]),
      ],
    }),
  component: PricingPageContent,
});
