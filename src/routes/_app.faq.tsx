import { createFileRoute } from "@tanstack/react-router";

import { breadcrumbJsonLd, publicHead } from "@/lib/seo";
import { PageHero, Section, TrackedCta } from "@/components/marketing/MarketingPrimitives";
import { TransparencyLinks } from "@/components/legal/LegalDocumentView";
import {
  FAQ_CATEGORIES,
  FAQ_CATEGORY_LABEL,
  faqEntries,
  faqJsonLd,
} from "@/lib/legal/help-content";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/_app/faq")({
  head: () =>
    publicHead({
      path: "/faq",
      title: "FAQs — UseCasesX",
      description:
        "Answers on editions and access, fair-use limits, reports and exports, AI assistance, privacy and data deletion, and what support to expect during Founding Access.",
      jsonLd: [
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "FAQs", path: "/faq" },
        ]),
        faqJsonLd(),
      ],
    }),
  component: FaqPage,
});

function FaqPage() {
  return (
    <>
      <PageHero
        eyebrow="Frequently asked questions"
        title="Editions, limits, reports, AI, privacy and support."
        intro="Short answers, grouped by what people actually ask before they commit a portfolio decision to this product. Each answer links to the document that says it in full."
      >
        <TrackedCta to="/getting-started" label="Getting started" location="faq-hero-start" />
        <TrackedCta
          to="/support"
          label="Help & Support"
          location="faq-hero-support"
          variant="secondary"
        />
      </PageHero>

      {FAQ_CATEGORIES.map((category, index) => (
        <Section
          key={category}
          id={category}
          title={FAQ_CATEGORY_LABEL[category]}
          tone={index % 2 === 1 ? "muted" : "default"}
        >
          <Accordion type="single" collapsible className="max-w-3xl">
            {faqEntries(category).map((entry) => (
              <AccordionItem key={entry.question} value={entry.question}>
                <AccordionTrigger className="text-left">{entry.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {entry.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Section>
      ))}

      <Section title="Related pages" tone="muted">
        <TransparencyLinks currentPath="/faq" />
      </Section>
    </>
  );
}
