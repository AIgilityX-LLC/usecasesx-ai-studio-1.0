/**
 * UseCasesX shared UI kit.
 *
 * A thin composition layer over the existing shadcn/Radix primitives — it does
 * not replace them. Prefer these for page chrome and the standard
 * loading / empty / error / confirmation states so surfaces stay consistent
 * across Lite, Pro and future Enterprise editions.
 */
export { PageHeader } from "./PageHeader";
export { ErrorState } from "./ErrorState";
export { StatusChip, type StatusTone } from "./StatusChip";
export { ConfirmDialog } from "./ConfirmDialog";
export { useUnsavedChanges } from "./useUnsavedChanges";
export { AutosaveStatus } from "./AutosaveStatus";
export { DraftRecoveryBanner } from "./DraftRecoveryBanner";

export { ResponsiveTable, type ResponsiveColumn } from "./ResponsiveTable";
export { EmptyState } from "../EmptyState";
export { LoadingSkeleton, CardSkeleton } from "../LoadingSkeleton";
