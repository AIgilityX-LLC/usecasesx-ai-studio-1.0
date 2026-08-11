/**
 * Upload constraints — shows, in plain language, what a picker will accept and
 * renders a failure message next to those constraints so a refused file is
 * immediately actionable.
 */

import { AlertCircle } from "lucide-react";
import { BUCKET_POLICIES, humanBytes, type StorageBucket } from "@/lib/storage/storage-policy";
import { cn } from "@/lib/utils";

export function uploadConstraintsText(bucket: StorageBucket): string {
  const policy = BUCKET_POLICIES[bucket];
  return `Accepted: ${policy.extensions.join(", ")} · up to ${humanBytes(policy.maxBytes)} per file`;
}

export function UploadConstraints({
  bucket,
  className,
}: {
  bucket: StorageBucket;
  className?: string;
}) {
  return (
    <p className={cn("text-xs text-muted-foreground", className)}>{uploadConstraintsText(bucket)}</p>
  );
}

/** Refusal message plus the constraints that were not met. */
export function UploadError({
  bucket,
  message,
  className,
}: {
  bucket: StorageBucket;
  message: string;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive",
        className,
      )}
    >
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>
        <span className="font-medium">{message}</span>
        <span className="mt-0.5 block text-destructive/80">{uploadConstraintsText(bucket)}</span>
      </span>
    </div>
  );
}
