import { createFileRoute } from "@tanstack/react-router";

import { breadcrumbJsonLd, publicHead } from "@/lib/seo";
import { LegalDocumentView } from "@/components/legal/LegalDocumentView";
import { legalDocument } from "@/lib/legal/legal-content";

const doc = legalDocument("terms");

export const Route = createFileRoute("/_app/terms")({
  head: () =>
    publicHead({
      path: doc.path,
      title: doc.metaTitle,
      description: doc.metaDescription,
      jsonLd: [
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Terms of Use", path: doc.path },
        ]),
      ],
    }),
  component: TermsPage,
});

function TermsPage() {
  return <LegalDocumentView document={doc} />;
}
