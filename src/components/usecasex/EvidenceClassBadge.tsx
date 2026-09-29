import {
  EVIDENCE_CLASS_DISCLAIMER,
  EVIDENCE_CLASS_LABEL,
  type EvidenceClass,
} from "@/lib/content-governance/model";

/** Public badge distinguishing examples from verified case studies and patterns. */
export function EvidenceClassBadge({
  evidenceClass,
  className,
}: {
  evidenceClass?: string | null;
  className?: string;
}) {
  const key = (evidenceClass ?? "example") as EvidenceClass;
  const label = EVIDENCE_CLASS_LABEL[key] ?? EVIDENCE_CLASS_LABEL.example;
  const disclaimer = EVIDENCE_CLASS_DISCLAIMER[key] ?? EVIDENCE_CLASS_DISCLAIMER.example;
  return (
    <span
      className={
        className ??
        "inline-flex items-center rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-medium text-foreground"
      }
      title={disclaimer}
    >
      {label}
    </span>
  );
}
