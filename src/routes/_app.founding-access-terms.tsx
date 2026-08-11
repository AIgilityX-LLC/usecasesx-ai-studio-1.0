import { createFileRoute } from "@tanstack/react-router";

import { breadcrumbJsonLd, publicHead } from "@/lib/seo";
import { LegalDocumentView } from "@/components/legal/LegalDocumentView";
import { legalDocument } from "@/lib/legal/legal-content";

const doc = legalDocument("founding-access-terms");

export const Route = createFileRoute("/_app/founding-access-terms")({
  head: () =>
    publicHead({
      path: doc.path,
      title: doc.metaTitle,
      description: doc.metaDescription,
      jsonLd: [
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Founding Access terms", path: doc.path },
        ]),
      ],
    }),
  component: FoundingAccessTermsPage,
});

function FoundingAccessTermsPage() {
  return <LegalDocumentView document={doc} />;
}
