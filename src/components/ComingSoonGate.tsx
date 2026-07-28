import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarClock, Sparkles, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LeadCaptureModal } from "@/components/LeadCaptureModal";
import { NEXT_RELEASE_LABEL } from "@/lib/launch";

type Props = {
  /** Module / feature name shown as the headline. */
  feature: string;
  description?: string;
  /** Bullet list of what's coming. */
  features?: string[];
  sourcePage?: string;
  className?: string;
};

/**
 * Full-screen gate for Pro modules that ship after launch. Instead of exposing
 * an unfinished module, we clearly mark it as coming in the next release and
 * drive users to the early-access waitlist.
 */
export function ComingSoonGate({
  feature,
  description,
  features,
  sourcePage = "/pricing",
  className,
}: Props) {
  const [waitlistOpen, setWaitlistOpen] = useState(false);

  return (
    <>
      <div className={`mx-auto max-w-2xl py-10 ${className ?? ""}`}>
        <Card className="border-dashed bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="flex flex-col gap-5 py-8">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                <CalendarClock className="h-3.5 w-3.5" /> Coming {NEXT_RELEASE_LABEL}
              </span>
              <span className="inline-flex items-center gap-1 rounded bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                <Sparkles className="h-3 w-3" /> Pro
              </span>
            </div>

            <div>
              <h1 className="text-2xl font-bold">{feature}</h1>
              <p className="mt-2 text-muted-foreground">
                {description ??
                  `${feature} is part of your Pro plan and arrives in the ${NEXT_RELEASE_LABEL} release. Join the early-access waitlist to be first in line.`}
              </p>
            </div>

            {features && features.length > 0 && (
              <ul className="grid gap-2 sm:grid-cols-2">
                {features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span dangerouslySetInnerHTML={{ __html: f }} />
                  </li>
                ))}
              </ul>
            )}

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setWaitlistOpen(true)}>
                <Sparkles className="mr-2 h-4 w-4" /> Join the early-access waitlist
              </Button>
              <Button asChild variant="outline">
                <Link to="/pricing">View plans</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <LeadCaptureModal
        open={waitlistOpen}
        onClose={() => setWaitlistOpen(false)}
        triggerCase="founding-member"
        sourcePage={sourcePage}
      />
    </>
  );
}
