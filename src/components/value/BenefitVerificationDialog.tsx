/**
 * Per-benefit verification status and audit trail.
 *
 * Shows what has actually been verified against a connected ERP source versus
 * what is only asserted by the benefit owner, followed by the append-only
 * change history recorded by the database trigger.
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/ui-kit";
import { ShieldCheck, ShieldQuestion } from "lucide-react";

import { useBenefitAuditForBenefit } from "@/hooks/useBenefits";
import { toUserMessage } from "@/lib/domain/errors";
import { ENTERPRISE_VALUE_FEATURES } from "@/lib/feature-flags";
import {
  ERP_VERIFICATION_HELP,
  ERP_VERIFICATION_LABELS,
  type Benefit,
} from "@/lib/value/benefits.model";

const EVENT_LABELS: Record<string, string> = {
  "benefit.created": "Benefit created",
  "benefit.updated": "Benefit updated",
  "benefit.removed": "Benefit removed",
  "benefit.verification_changed": "Verification status changed",
  "benefit.evidence_changed": "Evidence changed",
};

export function BenefitVerificationDialog({
  benefit,
  open,
  onOpenChange,
}: {
  benefit: Benefit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { entries, isLoading, error } = useBenefitAuditForBenefit(
    benefit?.useCaseId ?? null,
    benefit?.id ?? null,
  );

  const verified = benefit?.erpVerificationStatus === "verified";
  const enterpriseOn = ENTERPRISE_VALUE_FEATURES.erpBenefitVerification;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Verification and history</DialogTitle>
          <DialogDescription>{benefit?.name}</DialogDescription>
        </DialogHeader>

        {benefit && (
          <div className="space-y-4">
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2">
                {verified ? (
                  <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />
                ) : (
                  <ShieldQuestion className="h-4 w-4 text-muted-foreground" aria-hidden />
                )}
                <Badge variant={verified ? "default" : "outline"}>
                  {ERP_VERIFICATION_LABELS[benefit.erpVerificationStatus]}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {ERP_VERIFICATION_HELP[benefit.erpVerificationStatus]}
              </p>
              {(benefit.erpSystem || benefit.erpReference || benefit.erpLastVerifiedAt) && (
                <dl className="mt-2 grid gap-1 text-xs sm:grid-cols-3">
                  {benefit.erpSystem && (
                    <div>
                      <dt className="text-muted-foreground">Source</dt>
                      <dd>{benefit.erpSystem}</dd>
                    </div>
                  )}
                  {benefit.erpReference && (
                    <div>
                      <dt className="text-muted-foreground">Reference</dt>
                      <dd className="truncate">{benefit.erpReference}</dd>
                    </div>
                  )}
                  {benefit.erpLastVerifiedAt && (
                    <div>
                      <dt className="text-muted-foreground">Last checked</dt>
                      <dd>{new Date(benefit.erpLastVerifiedAt).toLocaleString()}</dd>
                    </div>
                  )}
                </dl>
              )}
              {!enterpriseOn && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Automated ERP verification is an Enterprise capability and is not active here.
                  This benefit is owner-asserted, with the attached evidence as its proof.
                </p>
              )}
              <p className="mt-2 text-[11px] text-muted-foreground">
                {benefit.evidenceLinks.length} evidence attachment
                {benefit.evidenceLinks.length === 1 ? "" : "s"} ·{" "}
                {benefit.benefitOwner || "No owner assigned"}
              </p>
            </div>

            <Separator />

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Change history
              </p>
              {error ? (
                <ErrorState description={toUserMessage(error)} />
              ) : isLoading ? (
                <LoadingSkeleton />
              ) : entries.length === 0 ? (
                <EmptyState
                  title="No recorded changes"
                  description="Changes to this benefit will appear here as they happen."
                />
              ) : (
                <ol className="space-y-2">
                  {entries.map((entry) => (
                    <li key={entry.id} className="rounded-md border px-3 py-2 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">
                          {EVENT_LABELS[entry.eventType] ?? entry.eventType}
                        </span>
                        <span className="text-muted-foreground">
                          {new Date(entry.at).toLocaleString()}
                        </span>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
