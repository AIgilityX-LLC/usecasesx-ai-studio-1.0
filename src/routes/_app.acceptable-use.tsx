import { createFileRoute } from "@tanstack/react-router";

import { breadcrumbJsonLd, publicHead } from "@/lib/seo";
import { LegalDocumentView } from "@/components/legal/LegalDocumentView";
import { legalDocument } from "@/lib/legal/legal-content";

const doc = legalDocument("acceptable-use");

export const Route = createFileRoute("/_app/acceptable-use")({
  head: () =>
    publicHead({
      path: doc.path,
      title: doc.metaTitle,
      description: doc.metaDescription,
      jsonLd: [
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Acceptable Use", path: doc.path },
        ]),
      ],
    }),
  component: AcceptableUsePage,
});

function AcceptableUsePage() {
  return <LegalDocumentView document={doc} />;
}
