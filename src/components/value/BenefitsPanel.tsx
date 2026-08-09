/**
 * Studio value panel — capture and track the benefits of one use case.
 *
 * Multiple benefits per use case are supported; each carries its own unit,
 * period, owner and lifecycle state. The summary above the list applies the
 * shared aggregation rules, so incompatible units are never combined.
 */

import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/ui-kit";
import { FileClock, History, Pencil, Plus, Trash2 } from "lucide-react";

import { BenefitForm } from "@/components/value/BenefitForm";
import { BenefitEvidenceHistoryDialog } from "@/components/value/BenefitEvidenceHistoryDialog";
import { BenefitVerificationDialog } from "@/components/value/BenefitVerificationDialog";
import { ValueSummary } from "@/components/value/ValueSummary";
import { useBenefits } from "@/hooks/useBenefits";
import { toUserMessage } from "@/lib/domain/errors";
import {
  BENEFIT_CATEGORY_LABELS,
  BENEFIT_CONFIDENCE_LABELS,
  BENEFIT_PERIOD_LABELS,
  BENEFIT_STATE_LABELS,
  EVIDENCED_STATES,
  formatBenefitAmount,
  isMeasurable,
  ERP_VERIFICATION_LABELS,
  MEASUREMENT_FREQUENCY_LABELS,
  type Benefit,
  type BenefitInput,
} from "@/lib/value/benefits.model";

export function BenefitsPanel({ useCaseId }: { useCaseId: string }) {
  const { benefits, aggregate, isLoading, error, create, update, remove } = useBenefits(useCaseId);
  const [editing, setEditing] = useState<Benefit | null>(null);
  const [adding, setAdding] = useState(false);
  const [inspecting, setInspecting] = useState<Benefit | null>(null);
  const [evidenceHistoryFor, setEvidenceHistoryFor] = useState<Benefit | null>(null);

  const saving = create.isPending || update.isPending;

  const handleSubmit = async (input: BenefitInput) => {
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, input });
        toast.success("Benefit updated");
      } else {
        await create.mutateAsync(input);
        toast.success("Benefit added");
      }
      setEditing(null);
      setAdding(false);
    } catch (err) {
      toast.error(toUserMessage(err));
    }
  };

  const handleDelete = async (benefit: Benefit) => {
    try {
      await remove.mutateAsync(benefit.id);
      toast.success("Benefit removed");
    } catch (err) {
      toast.error(toUserMessage(err));
    }
  };

  if (error) return <ErrorState description={toUserMessage(error)} />;

  return (
    <div className="space-y-4">
      <ValueSummary
        aggregate={aggregate}
        loading={isLoading}
        title="Expected value"
        description="Totals are grouped by unit, currency and period. Recurring benefits are shown as an annual run rate."
        emptyHint="Add a benefit to make the business case measurable."
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">Benefits</CardTitle>
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Add benefit
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingSkeleton />
          ) : benefits.length === 0 ? (
            <EmptyState
              title="No benefits recorded"
              description="Capture baseline, target and expected value so this use case can be prioritised on evidence rather than opinion."
            />
          ) : (
            <ul className="space-y-3">
              {benefits.map((benefit) => (
                <li key={benefit.id} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium">{benefit.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {BENEFIT_CATEGORY_LABELS[benefit.category]}
                        {benefit.kpi ? ` · KPI: ${benefit.kpi}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge
                        variant={EVIDENCED_STATES.includes(benefit.state) ? "default" : "secondary"}
                      >
                        {BENEFIT_STATE_LABELS[benefit.state]}
                      </Badge>
                      <Badge variant="outline">
                        {ERP_VERIFICATION_LABELS[benefit.erpVerificationStatus]}
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Verification and history for ${benefit.name}`}
                        onClick={() => setInspecting(benefit)}
                      >
                        <History className="h-3.5 w-3.5" aria-hidden />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Evidence history for ${benefit.name}`}
                        onClick={() => setEvidenceHistoryFor(benefit)}
                      >
                        <FileClock className="h-3.5 w-3.5" aria-hidden />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Edit ${benefit.name}`}
                        onClick={() => setEditing(benefit)}
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Remove ${benefit.name}`}
                        disabled={remove.isPending}
                        onClick={() => void handleDelete(benefit)}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </Button>
                    </div>
                  </div>

                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
                    <Metric
                      label="Baseline"
                      value={formatBenefitAmount(
                        benefit.baselineValue,
                        benefit.unitType,
                        benefit.currency,
                      )}
                    />
                    <Metric
                      label="Target"
                      value={formatBenefitAmount(
                        benefit.targetValue,
                        benefit.unitType,
                        benefit.currency,
                      )}
                    />
                    <Metric
                      label={`Expected (${BENEFIT_PERIOD_LABELS[benefit.period].toLowerCase()})`}
                      value={formatBenefitAmount(
                        benefit.expectedValue,
                        benefit.unitType,
                        benefit.currency,
                      )}
                    />
                    <Metric label="Owner" value={benefit.benefitOwner || "Not assigned"} />
                  </dl>

                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {MEASUREMENT_FREQUENCY_LABELS[benefit.measurementFrequency]} ·{" "}
                    {BENEFIT_CONFIDENCE_LABELS[benefit.confidence]}
                    {benefit.evidenceSource ? ` · Evidence: ${benefit.evidenceSource}` : ""}
                    {benefit.evidenceLinks.length > 0
                      ? ` · ${benefit.evidenceLinks.length} attachment${benefit.evidenceLinks.length === 1 ? "" : "s"}`
                      : ""}
                  </p>

                  {!isMeasurable(benefit) && (
                    <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-400">
                      Add a baseline, target and owner to make this benefit measurable.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={adding || Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) {
            setAdding(false);
            setEditing(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit benefit" : "Add benefit"}</DialogTitle>
          </DialogHeader>
          <BenefitForm
            useCaseId={useCaseId}
            benefit={editing}
            saving={saving}
            onSubmit={handleSubmit}
            onCancel={() => {
              setAdding(false);
              setEditing(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <BenefitVerificationDialog
        benefit={inspecting}
        open={Boolean(inspecting)}
        onOpenChange={(open) => {
          if (!open) setInspecting(null);
        }}
      />

      <BenefitEvidenceHistoryDialog
        benefit={evidenceHistoryFor}
        open={Boolean(evidenceHistoryFor)}
        onOpenChange={(open) => {
          if (!open) setEvidenceHistoryFor(null);
        }}
      />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}
