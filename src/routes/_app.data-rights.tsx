import { createFileRoute } from "@tanstack/react-router";

import { breadcrumbJsonLd, publicHead } from "@/lib/seo";
import { LegalDocumentView } from "@/components/legal/LegalDocumentView";
import { legalDocument } from "@/lib/legal/legal-content";

const doc = legalDocument("data-rights");

export const Route = createFileRoute("/_app/data-rights")({
  head: () =>
    publicHead({
      path: doc.path,
      title: doc.metaTitle,
      description: doc.metaDescription,
      jsonLd: [
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Export & deletion", path: doc.path },
        ]),
      ],
    }),
  component: DataRightsPage,
});

function DataRightsPage() {
  return <LegalDocumentView document={doc} />;
}
