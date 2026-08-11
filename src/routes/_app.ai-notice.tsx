import { createFileRoute } from "@tanstack/react-router";

import { breadcrumbJsonLd, publicHead } from "@/lib/seo";
import { LegalDocumentView } from "@/components/legal/LegalDocumentView";
import { legalDocument } from "@/lib/legal/legal-content";

const doc = legalDocument("ai-notice");

export const Route = createFileRoute("/_app/ai-notice")({
  head: () =>
    publicHead({
      path: doc.path,
      title: doc.metaTitle,
      description: doc.metaDescription,
      jsonLd: [
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "AI notice", path: doc.path },
        ]),
      ],
    }),
  component: AiNoticePage,
});

function AiNoticePage() {
  return <LegalDocumentView document={doc} />;
}
