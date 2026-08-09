/**
 * Add / edit one benefit.
 *
 * Every field the value model needs is captured here, so a benefit is
 * measurable rather than descriptive: baseline, target, expected value, unit,
 * period, KPI, owner, cadence, evidence source and confidence.
 */

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BENEFIT_CATEGORIES,
  BENEFIT_CATEGORY_LABELS,
  BENEFIT_CONFIDENCES,
  BENEFIT_CONFIDENCE_LABELS,
  BENEFIT_PERIODS,
  BENEFIT_PERIOD_LABELS,
  BENEFIT_STATES,
  BENEFIT_STATE_HELP,
  BENEFIT_STATE_LABELS,
  BENEFIT_UNIT_LABELS,
  BENEFIT_UNIT_TYPES,
  COMMON_CURRENCIES,
  MEASUREMENT_FREQUENCIES,
  MEASUREMENT_FREQUENCY_LABELS,
  type Benefit,
  type BenefitCategory,
  type BenefitConfidence,
  type BenefitInput,
  type BenefitPeriod,
  type BenefitState,
  type BenefitUnitType,
  type MeasurementFrequency,
} from "@/lib/value/benefits.model";

type Draft = {
  name: string;
  category: BenefitCategory;
  kpi: string;
  unitType: BenefitUnitType;
  currency: string;
  period: BenefitPeriod;
  baselineValue: string;
  targetValue: string;
  expectedValue: string;
  confidence: BenefitConfidence;
  measurementFrequency: MeasurementFrequency;
  benefitOwner: string;
  evidenceSource: string;
  state: BenefitState;
  notes: string;
};

const EMPTY: Draft = {
  name: "",
  category: "cost_reduction",
  kpi: "",
  unitType: "currency",
  currency: "USD",
  period: "annual",
  baselineValue: "",
  targetValue: "",
  expectedValue: "",
  confidence: "medium",
  measurementFrequency: "quarterly",
  benefitOwner: "",
  evidenceSource: "",
  state: "proposed",
  notes: "",
};

function toDraft(benefit: Benefit): Draft {
  return {
    name: benefit.name,
    category: benefit.category,
    kpi: benefit.kpi ?? "",
    unitType: benefit.unitType,
    currency: benefit.currency ?? "USD",
    period: benefit.period,
    baselineValue: benefit.baselineValue?.toString() ?? "",
    targetValue: benefit.targetValue?.toString() ?? "",
    expectedValue: benefit.expectedValue?.toString() ?? "",
    confidence: benefit.confidence,
    measurementFrequency: benefit.measurementFrequency,
    benefitOwner: benefit.benefitOwner ?? "",
    evidenceSource: benefit.evidenceSource ?? "",
    state: benefit.state,
    notes: benefit.notes ?? "",
  };
}

function numeric(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function BenefitForm({
  useCaseId,
  benefit,
  saving,
  onSubmit,
  onCancel,
}: {
  useCaseId: string;
  benefit?: Benefit | null;
  saving: boolean;
  onSubmit: (input: BenefitInput) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(benefit ? toDraft(benefit) : EMPTY);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(benefit ? toDraft(benefit) : EMPTY);
    setError(null);
  }, [benefit]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.name.trim()) {
      setError("Give the benefit a name so it can be tracked.");
      return;
    }
    const expected = numeric(draft.expectedValue);
    if (draft.expectedValue.trim() && expected == null) {
      setError("Expected value must be a number.");
      return;
    }
    setError(null);
    await onSubmit({
      useCaseId,
      name: draft.name,
      category: draft.category,
      kpi: draft.kpi,
      unitType: draft.unitType,
      currency: draft.unitType === "currency" ? draft.currency : null,
      period: draft.period,
      baselineValue: numeric(draft.baselineValue),
      targetValue: numeric(draft.targetValue),
      expectedValue: expected,
      confidence: draft.confidence,
      measurementFrequency: draft.measurementFrequency,
      benefitOwner: draft.benefitOwner,
      evidenceSource: draft.evidenceSource,
      state: draft.state,
      // Automated ERP verification is Enterprise-only and not live; every
      // benefit captured in Pro is manually evidenced.
      verificationMethod: "manual",
      notes: draft.notes,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="benefit-name">Benefit name</Label>
          <Input
            id="benefit-name"
            value={draft.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Reduced manual invoice handling"
            required
          />
        </div>

        <div>
          <Label htmlFor="benefit-category">Category</Label>
          <Select
            value={draft.category}
            onValueChange={(v) => set("category", v as BenefitCategory)}
          >
            <SelectTrigger id="benefit-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BENEFIT_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {BENEFIT_CATEGORY_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="benefit-kpi">KPI</Label>
          <Input
            id="benefit-kpi"
            value={draft.kpi}
            onChange={(e) => set("kpi", e.target.value)}
            placeholder="Cost per invoice processed"
          />
        </div>

        <div>
          <Label htmlFor="benefit-unit">Unit</Label>
          <Select
            value={draft.unitType}
            onValueChange={(v) => set("unitType", v as BenefitUnitType)}
          >
            <SelectTrigger id="benefit-unit">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BENEFIT_UNIT_TYPES.map((u) => (
                <SelectItem key={u} value={u}>
                  {BENEFIT_UNIT_LABELS[u]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {draft.unitType === "currency" ? (
          <div>
            <Label htmlFor="benefit-currency">Currency</Label>
            <Select value={draft.currency} onValueChange={(v) => set("currency", v)}>
              <SelectTrigger id="benefit-currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COMMON_CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div>
            <Label htmlFor="benefit-period-note">Currency</Label>
            <Input id="benefit-period-note" value="Not applicable" disabled />
          </div>
        )}

        <div>
          <Label htmlFor="benefit-period">Period</Label>
          <Select value={draft.period} onValueChange={(v) => set("period", v as BenefitPeriod)}>
            <SelectTrigger id="benefit-period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BENEFIT_PERIODS.map((p) => (
                <SelectItem key={p} value={p}>
                  {BENEFIT_PERIOD_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="benefit-confidence">Confidence</Label>
          <Select
            value={draft.confidence}
            onValueChange={(v) => set("confidence", v as BenefitConfidence)}
          >
            <SelectTrigger id="benefit-confidence">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BENEFIT_CONFIDENCES.map((c) => (
                <SelectItem key={c} value={c}>
                  {BENEFIT_CONFIDENCE_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="benefit-baseline">Baseline</Label>
          <Input
            id="benefit-baseline"
            inputMode="decimal"
            value={draft.baselineValue}
            onChange={(e) => set("baselineValue", e.target.value)}
            placeholder="Today's measured level"
          />
        </div>

        <div>
          <Label htmlFor="benefit-target">Target</Label>
          <Input
            id="benefit-target"
            inputMode="decimal"
            value={draft.targetValue}
            onChange={(e) => set("targetValue", e.target.value)}
            placeholder="Level once delivered"
          />
        </div>

        <div>
          <Label htmlFor="benefit-expected">Expected value</Label>
          <Input
            id="benefit-expected"
            inputMode="decimal"
            value={draft.expectedValue}
            onChange={(e) => set("expectedValue", e.target.value)}
            placeholder="Value released per period"
          />
        </div>

        <div>
          <Label htmlFor="benefit-owner">Benefit owner</Label>
          <Input
            id="benefit-owner"
            value={draft.benefitOwner}
            onChange={(e) => set("benefitOwner", e.target.value)}
            placeholder="Accountable business owner"
          />
        </div>

        <div>
          <Label htmlFor="benefit-frequency">Measurement cadence</Label>
          <Select
            value={draft.measurementFrequency}
            onValueChange={(v) => set("measurementFrequency", v as MeasurementFrequency)}
          >
            <SelectTrigger id="benefit-frequency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MEASUREMENT_FREQUENCIES.map((f) => (
                <SelectItem key={f} value={f}>
                  {MEASUREMENT_FREQUENCY_LABELS[f]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="benefit-state">State</Label>
          <Select value={draft.state} onValueChange={(v) => set("state", v as BenefitState)}>
            <SelectTrigger id="benefit-state">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BENEFIT_STATES.map((s) => (
                <SelectItem key={s} value={s}>
                  {BENEFIT_STATE_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {BENEFIT_STATE_HELP[draft.state]}
          </p>
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="benefit-evidence">Evidence source</Label>
          <Input
            id="benefit-evidence"
            value={draft.evidenceSource}
            onChange={(e) => set("evidenceSource", e.target.value)}
            placeholder="Where the measurement comes from (system, report, owner sign-off)"
          />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="benefit-notes">Notes</Label>
          <Textarea
            id="benefit-notes"
            rows={2}
            value={draft.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Assumptions behind the estimate"
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : benefit ? "Save benefit" : "Add benefit"}
        </Button>
      </div>
    </form>
  );
}
