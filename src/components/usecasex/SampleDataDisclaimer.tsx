import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/**
 * Banner clarifying that the seeded use cases are AI-generated sample data,
 * intended as a reference/starting point and to be validated before operational use.
 */
export function SampleDataDisclaimer({ className }: { className?: string }) {
  return (
    <Alert className={`border-primary/30 bg-primary/5 ${className ?? ""}`}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="h-4 w-4 text-primary"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4M12 8h.01" strokeLinecap="round" />
      </svg>
      <AlertTitle className="text-foreground">AI-generated sample data</AlertTitle>
      <AlertDescription className="text-muted-foreground">
        These use cases are AI-generated samples provided as a reference and starting point for
        organizations exploring AI opportunities. Validate feasibility, value, risk and compliance
        against your own context and data before operational use.
      </AlertDescription>
    </Alert>
  );
}