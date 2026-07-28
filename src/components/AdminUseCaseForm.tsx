import { useState } from "react";

export interface UseCaseFormValues {
  title: string;
  summary: string;
  organization: string;
  industry: string;
  ai_type: string;
  objective: string;
  maturity: string;
  value_potential: string;
  complexity: string;
  risk_level: string;
  time_to_value: string;
}

const DEFAULTS: UseCaseFormValues = {
  title: "",
  summary: "",
  organization: "",
  industry: "",
  ai_type: "",
  objective: "",
  maturity: "pilot",
  value_potential: "high",
  complexity: "medium",
  risk_level: "medium",
  time_to_value: "medium",
};

export function AdminUseCaseForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: Partial<UseCaseFormValues>;
  onSubmit?: (v: UseCaseFormValues) => void;
  onCancel?: () => void;
}) {
  const [v, setV] = useState<UseCaseFormValues>({ ...DEFAULTS, ...initial });
  const f =
    (k: keyof UseCaseFormValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setV((s) => ({ ...s, [k]: e.target.value }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.(v);
      }}
      className="space-y-5 rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-card)]"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Title">
          <input required value={v.title} onChange={f("title")} className={inputCls} />
        </Field>
        <Field label="Organization">
          <input value={v.organization} onChange={f("organization")} className={inputCls} />
        </Field>
      </div>
      <Field label="Summary">
        <textarea
          rows={3}
          value={v.summary}
          onChange={f("summary")}
          className={inputCls + " resize-none"}
        />
      </Field>
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Industry">
          <input
            value={v.industry}
            onChange={f("industry")}
            className={inputCls}
            placeholder="banking"
          />
        </Field>
        <Field label="AI Type">
          <input
            value={v.ai_type}
            onChange={f("ai_type")}
            className={inputCls}
            placeholder="Generative AI"
          />
        </Field>
        <Field label="Objective">
          <input
            value={v.objective}
            onChange={f("objective")}
            className={inputCls}
            placeholder="Risk & Compliance"
          />
        </Field>
      </div>
      <div className="grid gap-4 md:grid-cols-5">
        <Field label="Maturity">
          <Select
            value={v.maturity}
            onChange={f("maturity")}
            opts={["concept", "prototype", "pilot", "production", "scaled"]}
          />
        </Field>
        <Field label="Value">
          <Select
            value={v.value_potential}
            onChange={f("value_potential")}
            opts={["low", "medium", "high", "transformational"]}
          />
        </Field>
        <Field label="Complexity">
          <Select
            value={v.complexity}
            onChange={f("complexity")}
            opts={["low", "medium", "high"]}
          />
        </Field>
        <Field label="Risk">
          <Select
            value={v.risk_level}
            onChange={f("risk_level")}
            opts={["low", "medium", "high"]}
          />
        </Field>
        <Field label="Time to Value">
          <Select
            value={v.time_to_value}
            onChange={f("time_to_value")}
            opts={["short", "medium", "long"]}
          />
        </Field>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="rounded-md bg-primary px-5 py-2 text-sm font-bold text-primary-foreground hover:brightness-110"
        >
          Save use case
        </button>
      </div>
    </form>
  );
}

const inputCls =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
function Select({
  value,
  onChange,
  opts,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  opts: string[];
}) {
  return (
    <select value={value} onChange={onChange} className={inputCls}>
      {opts.map((o) => (
        <option key={o} value={o}>
          {o.charAt(0).toUpperCase() + o.slice(1)}
        </option>
      ))}
    </select>
  );
}
