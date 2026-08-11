/**
 * Renderer for a published legal/transparency document.
 *
 * One component so every document carries the same review notice, effective
 * date, in-page contents and cross-links — a reader can always find the other
 * documents from whichever page they landed on.
 */
import { Link } from "@tanstack/react-router";
import { Info } from "lucide-react";

import { PageHero, Section } from "@/components/marketing/MarketingPrimitives";
import {
  LEGAL_EFFECTIVE_DATE,
  LEGAL_LAST_UPDATED,
  LEGAL_REVIEW_NOTICE,
  TRANSPARENCY_LINKS,
  type LegalDocument,
} from "@/lib/legal/legal-content";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const slug = (heading: string) =>
  heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export function LegalReviewNotice() {
  return (
    <Alert>
      <Info className="h-4 w-4" aria-hidden="true" />
      <AlertTitle>Plain-language document, legal review pending</AlertTitle>
      <AlertDescription>{LEGAL_REVIEW_NOTICE}</AlertDescription>
    </Alert>
  );
}

export function TransparencyLinks({ currentPath }: { currentPath: string }) {
  const links = TRANSPARENCY_LINKS.filter((link) => link.to !== currentPath);
  return (
    <nav aria-label="Legal, transparency and help pages">
      <ul className="grid gap-3 sm:grid-cols-2">
        {links.map((link) => (
          <li key={link.to} className="rounded-lg border border-border p-4">
            <Link
              to={link.to as never}
              className="text-sm font-semibold text-foreground underline-offset-4 hover:underline"
            >
              {link.label}
            </Link>
            <p className="mt-1 text-sm text-muted-foreground">{link.note}</p>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function LegalDocumentView({ document: doc }: { document: LegalDocument }) {
  return (
    <>
      <PageHero eyebrow="Legal & transparency" title={doc.title} intro={doc.intro} />

      <Section title="Before you read this" tone="muted">
        <div className="space-y-4">
          <LegalReviewNotice />
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-lg border border-border p-4">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Effective date
              </dt>
              <dd className="mt-1 font-semibold text-foreground">{LEGAL_EFFECTIVE_DATE}</dd>
            </div>
            <div className="rounded-lg border border-border p-4">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Last updated
              </dt>
              <dd className="mt-1 font-semibold text-foreground">{LEGAL_LAST_UPDATED}</dd>
            </div>
          </dl>
          <nav aria-label={`Contents of ${doc.title}`}>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-foreground">
              On this page
            </p>
            <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              {doc.sections.map((section) => (
                <li key={section.heading}>
                  <a
                    href={`#${slug(section.heading)}`}
                    className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    {section.heading}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </Section>

      <Section title={doc.title}>
        <div className="space-y-10">
          {doc.sections.map((section) => (
            <article key={section.heading} id={slug(section.heading)} className="scroll-mt-24">
              <h3 className="text-lg font-semibold text-foreground">{section.heading}</h3>
              {section.body?.map((paragraph) => (
                <p key={paragraph} className="mt-3 max-w-3xl text-muted-foreground">
                  {paragraph}
                </p>
              ))}
              {section.bullets ? (
                <ul className="mt-3 max-w-3xl list-disc space-y-2 pl-5 text-muted-foreground">
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </div>
      </Section>

      <Section title="Related pages" tone="muted">
        <TransparencyLinks currentPath={doc.path} />
      </Section>
    </>
  );
}
