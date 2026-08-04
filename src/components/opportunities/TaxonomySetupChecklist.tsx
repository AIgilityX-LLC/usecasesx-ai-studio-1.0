import { Link } from "@tanstack/react-router";
import { Check, Circle } from "lucide-react";
import {
  buildTaxonomyChecklist,
  checklistProgress,
  type TaxonomySetupCounts,
} from "@/lib/taxonomy-setup";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

/**
 * Shows exactly how far the workspace is from a readable Opportunity Map.
 * Every line reflects a real count; nothing is inferred or simulated.
 */
export function TaxonomySetupChecklist({
  counts,
  title = "Taxonomy setup checklist",
  className,
}: {
  counts: TaxonomySetupCounts;
  title?: string;
  className?: string;
}) {
  const steps = buildTaxonomyChecklist(counts);
  const progress = checklistProgress(steps);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          {title}
          <Badge variant={progress.complete ? "default" : "secondary"}>
            {progress.requiredDone} of {progress.requiredTotal} required steps
          </Badge>
        </CardTitle>
        <Progress
          value={progress.percent}
          aria-label={`Setup ${progress.percent}% complete`}
          className="mt-2 h-2"
        />
      </CardHeader>
      <CardContent>
        <ol className="divide-y divide-border" aria-label="Taxonomy setup steps">
          {steps.map((step) => (
            <li key={step.key} className="flex flex-wrap items-start gap-3 py-3">
              <span
                aria-hidden
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
                  step.done
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground",
                )}
              >
                {step.done ? <Check className="size-3" /> : <Circle className="size-2" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  {step.label}
                  <span className="sr-only">{step.done ? "— done" : "— not done"}</span>
                  {step.optional && (
                    <Badge variant="outline" className="text-[11px]">
                      Optional
                    </Badge>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
                <p className="text-xs text-muted-foreground">{step.detail}</p>
              </div>
              {!step.done && (
                <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                  <Link to={step.to}>{step.actionLabel}</Link>
                </Button>
              )}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
