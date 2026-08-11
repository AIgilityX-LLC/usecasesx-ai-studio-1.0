import { createFileRoute } from "@tanstack/react-router";

import { breadcrumbJsonLd, publicHead } from "@/lib/seo";
import { LegalDocumentView } from "@/components/legal/LegalDocumentView";
import { legalDocument } from "@/lib/legal/legal-content";

const doc = legalDocument("privacy");

export const Route = createFileRoute("/_app/privacy")({
  head: () =>
    publicHead({
      path: doc.path,
      title: doc.metaTitle,
      description: doc.metaDescription,
      jsonLd: [
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Privacy notice", path: doc.path },
        ]),
      ],
    }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return <LegalDocumentView document={doc} />;
}
