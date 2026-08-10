/**
 * Shared marketing building blocks for the public conversion pages.
 * Presentation only — all copy is sourced from `@/lib/founding-access`.
 */
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Check, Info, Minus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { trackCTAEvent } from "@/lib/usecasex.tracking";
import {
  EDITIONS,
  FOUNDING_ACCESS_END,
  FOUNDING_ACCESS_TERMS,
  fairUseTable,
} from "@/lib/founding-access";

/** Primary CTA that records a conversion event before navigating. */
export function TrackedCta({
  to,
  hash,
  label,
  location,
  variant = "primary",
  className = "",
}: {
  to: string;
  hash?: string;
  label: string;
  /** Where on the site the CTA was clicked — stored with the event. */
  location: string;
  variant?: "primary" | "secondary";
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center rounded-md px-5 py-2.5 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
  const style =
    variant === "primary"
      ? "bg-primary text-primary-foreground hover:brightness-110"
      : "border border-border bg-background text-foreground hover:bg-secondary";

  return (
    <Link
      to={to as never}
      {...(hash ? { hash } : {})}
      data-analytics-id={`cta-${location}`}
      onClick={() =>
        trackCTAEvent("cta_clicked", {
          target_route: hash ? `${to}#${hash}` : to,
          location,
          label,
        })
      }
      className={`${base} ${style} ${className}`}
    >
      {label}
    </Link>
  );
}

export function PageHero({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children?: ReactNode;
}) {
  return (
    <section className="border-b border-border bg-secondary/30">
      <div className="mx-auto max-w-[1100px] px-6 py-16 sm:py-20">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
        <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
          {title}
        </h1>
        <p className="mt-4 max-w-3xl text-lg text-muted-foreground">{intro}</p>
        {children ? <div className="mt-8 flex flex-wrap gap-3">{children}</div> : null}
      </div>
    </section>
  );
}

export function Section({
  title,
  lead,
  children,
  tone = "default",
  id,
}: {
  title: string;
  lead?: string;
  children: ReactNode;
  tone?: "default" | "muted";
  id?: string;
}) {
  return (
    <section
      id={id}
      className={`border-b border-border ${tone === "muted" ? "bg-secondary/30" : "bg-background"}`}
    >
      <div className="mx-auto max-w-[1100px] px-6 py-14 sm:py-16">
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h2>
        {lead ? <p className="mt-3 max-w-3xl text-muted-foreground">{lead}</p> : null}
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}

/** Three-edition comparison used on the landing page, /editions and /pricing. */
export function EditionMatrix({ ctaLocation }: { ctaLocation: string }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {EDITIONS.map((edition) => (
        <article
          key={edition.key}
          className={
            "flex h-full flex-col rounded-2xl border bg-card p-6 " +
            (edition.key === "pro"
              ? "border-primary/40 ring-1 ring-primary/20"
              : "border-border")
          }
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
            {edition.positioning}
          </p>
          <h3 className="mt-2 text-xl font-bold text-foreground">{edition.name}</h3>
          <p className="mt-1 text-sm font-semibold text-foreground">{edition.price}</p>
          <p className="mt-1 text-xs text-muted-foreground">{edition.priceNote}</p>
          <p className="mt-4 text-sm text-muted-foreground">{edition.audience}</p>

          <ul className="mt-5 flex-1 space-y-2 text-sm text-foreground">
            {edition.includes.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          {edition.notLive?.length ? (
            <div className="mt-5 rounded-lg border border-border bg-secondary/50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Designed, not yet live
              </p>
              <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                {edition.notLive.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Minus className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <TrackedCta
            to={edition.cta.to}
            label={edition.cta.label}
            location={`${ctaLocation}-${edition.key}`}
            variant={edition.key === "pro" ? "primary" : "secondary"}
            className="mt-6 w-full"
          />
        </article>
      ))}
    </div>
  );
}

/** Founding Access terms plus the enforced fair-use limits. */
export function FoundingAccessTerms({ id = "founding-access" }: { id?: string }) {
  const rows = fairUseTable();
  return (
    <div id={id} className="scroll-mt-20 space-y-6">
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
        <Badge variant="secondary" className="mb-3">
          Complimentary through {FOUNDING_ACCESS_END}
        </Badge>
        <ul className="space-y-3 text-sm text-foreground">
          {FOUNDING_ACCESS_TERMS.map((term) => (
            <li key={term} className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span>{term}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full min-w-[520px] text-sm">
          <caption className="px-4 pt-4 text-left text-xs text-muted-foreground">
            AI assistance fair-use limits, per rolling 24 hours. These are the limits the platform
            enforces.
          </caption>
          <thead>
            <tr className="border-b border-border text-left">
              <th scope="col" className="px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Edition
              </th>
              <th scope="col" className="px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Per user / day
              </th>
              <th scope="col" className="px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Per workspace / day
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.edition} className="border-b border-border last:border-0">
                <th scope="row" className="px-4 py-3 text-left font-medium text-foreground">
                  {row.edition}
                </th>
                <td className="px-4 py-3 font-mono text-foreground">{row.perUserPerDay}</td>
                <td className="px-4 py-3 font-mono text-foreground">{row.perWorkspacePerDay}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
