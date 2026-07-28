import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

// ---------- Local storage helpers for admin-managed config ----------
const LS = {
  studioTemplates: "ucx.admin.studio.templates",
  integrations: "ucx.admin.integrations",
  reportTemplates: "ucx.admin.report.templates",
  categories: "ucx.admin.categories",
};

function readLS<T>(k: string, fallback: T): T {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeLS<T>(k: string, v: T) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
}

// ============================================================
// 1. MANAGE PATTERNS
// ============================================================
type Pattern = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  status: "draft" | "published";
  access_tier: "lite" | "pro" | "enterprise";
  industry: string;
  domain: string;
  function_area: string;
  ai_type: string;
  data_inputs: string[];
  kpis: string[];
  risks: string[];
  controls: string[];
};

const newPattern = (): Pattern => ({
  id: crypto.randomUUID(),
  title: "",
  slug: "",
  summary: "",
  status: "draft",
  access_tier: "pro",
  industry: "",
  domain: "",
  function_area: "",
  ai_type: "",
  data_inputs: [],
  kpis: [],
  risks: [],
  controls: [],
});

export function PatternsAdminTab() {
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [editing, setEditing] = useState<Pattern | null>(null);

  useEffect(() => {
    setPatterns(readLS<Pattern[]>("ucx.admin.patterns", []));
  }, []);
  const persist = (next: Pattern[]) => {
    setPatterns(next);
    writeLS("ucx.admin.patterns", next);
  };

  const save = () => {
    if (!editing) return;
    if (!editing.title.trim()) {
      toast.error("Title required");
      return;
    }
    const exists = patterns.some((p) => p.id === editing.id);
    persist(
      exists ? patterns.map((p) => (p.id === editing.id ? editing : p)) : [editing, ...patterns],
    );
    toast.success("Pattern saved");
    setEditing(null);
  };

  const togglePublish = (p: Pattern) => {
    persist(
      patterns.map((x) =>
        x.id === p.id ? { ...x, status: x.status === "published" ? "draft" : "published" } : x,
      ),
    );
  };

  const remove = (id: string) => persist(patterns.filter((p) => p.id !== id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Use Case Patterns</h2>
          <p className="text-sm text-muted-foreground">
            Create, publish, and assign access tiers to AI patterns used across the Studio.
          </p>
        </div>
        <Button onClick={() => setEditing(newPattern())}>+ New Pattern</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {patterns.length === 0 && <p className="text-sm text-muted-foreground">No patterns yet.</p>}
        {patterns.map((p) => (
          <Card key={p.id}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">{p.title || "(untitled)"}</CardTitle>
                <Badge variant={p.status === "published" ? "default" : "secondary"}>
                  {p.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {p.access_tier.toUpperCase()} · {p.industry || "—"} · {p.ai_type || "—"}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground line-clamp-2">{p.summary}</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(p)}>
                  Edit
                </Button>
                <Button size="sm" variant="outline" onClick={() => togglePublish(p)}>
                  {p.status === "published" ? "Unpublish" : "Publish"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(p.id)}>
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {editing && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Edit Pattern</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Title">
                <Input
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                />
              </Field>
              <Field label="Slug">
                <Input
                  value={editing.slug}
                  onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                />
              </Field>
              <Field label="Industry">
                <Input
                  value={editing.industry}
                  onChange={(e) => setEditing({ ...editing, industry: e.target.value })}
                />
              </Field>
              <Field label="Domain">
                <Input
                  value={editing.domain}
                  onChange={(e) => setEditing({ ...editing, domain: e.target.value })}
                />
              </Field>
              <Field label="Function">
                <Input
                  value={editing.function_area}
                  onChange={(e) => setEditing({ ...editing, function_area: e.target.value })}
                />
              </Field>
              <Field label="AI Type">
                <Input
                  value={editing.ai_type}
                  onChange={(e) => setEditing({ ...editing, ai_type: e.target.value })}
                />
              </Field>
              <Field label="Access Tier">
                <Select
                  value={editing.access_tier}
                  onValueChange={(v) =>
                    setEditing({ ...editing, access_tier: v as Pattern["access_tier"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lite">Lite (Free)</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Status">
                <Select
                  value={editing.status}
                  onValueChange={(v) => setEditing({ ...editing, status: v as Pattern["status"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Summary">
              <Textarea
                rows={3}
                value={editing.summary}
                onChange={(e) => setEditing({ ...editing, summary: e.target.value })}
              />
            </Field>
            <ListField
              label="Data Inputs"
              values={editing.data_inputs}
              onChange={(v) => setEditing({ ...editing, data_inputs: v })}
            />
            <ListField
              label="KPIs"
              values={editing.kpis}
              onChange={(v) => setEditing({ ...editing, kpis: v })}
            />
            <ListField
              label="Risks"
              values={editing.risks}
              onChange={(v) => setEditing({ ...editing, risks: v })}
            />
            <ListField
              label="Controls"
              values={editing.controls}
              onChange={(v) => setEditing({ ...editing, controls: v })}
            />
            <div className="flex gap-2">
              <Button onClick={save}>Save Pattern</Button>
              <Button variant="ghost" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================
// 2. MANAGE CATEGORIES
// ============================================================
type Categories = {
  industries: string[];
  domains: string[];
  gov_domains: string[];
  functions: string[];
  ai_types: string[];
  risk_levels: string[];
};

const DEFAULT_CATEGORIES: Categories = {
  industries: ["Financial Services", "Healthcare", "Public Sector", "Retail", "Manufacturing"],
  domains: ["Customer", "Operations", "Risk", "Finance", "HR"],
  gov_domains: ["Education", "Justice", "Defense", "Health", "Tax", "Social Services"],
  functions: ["Marketing", "Sales", "Service", "Supply Chain", "IT", "Legal"],
  ai_types: [
    "Generative AI",
    "Predictive AI",
    "Computer Vision",
    "NLP",
    "Agentic AI",
    "Recommendation",
  ],
  risk_levels: ["Low", "Medium", "High", "Prohibited"],
};

export function CategoriesAdminTab() {
  const [cats, setCats] = useState<Categories>(DEFAULT_CATEGORIES);
  useEffect(() => {
    setCats(readLS<Categories>(LS.categories, DEFAULT_CATEGORIES));
  }, []);
  const update = (key: keyof Categories, values: string[]) => {
    const next = { ...cats, [key]: values };
    setCats(next);
    writeLS(LS.categories, next);
  };

  const groups: { key: keyof Categories; label: string }[] = [
    { key: "industries", label: "Industries" },
    { key: "domains", label: "Domains" },
    { key: "gov_domains", label: "Government Domains" },
    { key: "functions", label: "Function Areas" },
    { key: "ai_types", label: "AI Types" },
    { key: "risk_levels", label: "Risk Levels" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Categories</h2>
        <p className="text-sm text-muted-foreground">
          Taxonomies powering filters, patterns, and the Studio.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {groups.map((g) => (
          <Card key={g.key}>
            <CardHeader>
              <CardTitle className="text-base">{g.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <ListField label="" values={cats[g.key]} onChange={(v) => update(g.key, v)} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// 3. MANAGE ORGANIZATIONS
// ============================================================
type Org = {
  id: string;
  name: string;
  plan: string;
  industry: string | null;
  country: string | null;
  type: string | null;
};

export function OrganizationsAdminTab() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("organizations")
      .select("id,name,plan,industry,country,type")
      .order("name");
    if (error) toast.error(error.message);
    setOrgs((data ?? []) as Org[]);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const updatePlan = async (org: Org, plan: string) => {
    const { error } = await supabase.from("organizations").update({ plan }).eq("id", org.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Plan updated for ${org.name}`);
    setOrgs((xs) => xs.map((x) => (x.id === org.id ? { ...x, plan } : x)));
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Organizations</h2>
        <p className="text-sm text-muted-foreground">
          View tenants, assign plans, manage users and workspaces.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {orgs.length === 0 && (
            <p className="text-sm text-muted-foreground">No organizations yet.</p>
          )}
          {orgs.map((o) => (
            <Card key={o.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{o.name}</CardTitle>
                  <Badge variant="outline">{o.plan}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {o.industry ?? "—"} · {o.country ?? "—"} · {o.type ?? "—"}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <Field label="Plan">
                  <Select value={o.plan} onValueChange={(v) => updatePlan(o, v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lite">Lite (Free)</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="enterprise">Enterprise Sovereign AI</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <a href={`/administration?org=${o.id}#users`}>Manage Users</a>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <a href={`/administration?org=${o.id}#workspaces`}>Manage Workspaces</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// 4. STUDIO TEMPLATES
// ============================================================
type StudioTemplates = {
  feasibility_questions: string[];
  data_readiness_checklist: string[];
  blueprint_sections: string[];
  governance_controls: string[];
  aia_templates: string[];
};

const DEFAULT_TEMPLATES: StudioTemplates = {
  feasibility_questions: [
    "Is the problem clearly defined?",
    "Is leadership sponsorship secured?",
    "Are required data sources accessible?",
    "Is the AI capability proven for this task?",
    "Are governance controls feasible?",
  ],
  data_readiness_checklist: [
    "Data source identified",
    "Owner assigned",
    "Format documented",
    "Availability confirmed",
    "Quality reviewed",
    "Privacy reviewed",
    "Bias risk reviewed",
    "Integration path defined",
  ],
  blueprint_sections: [
    "Executive Summary",
    "Problem Statement",
    "Strategic Alignment",
    "Target Users",
    "Current State",
    "Future State",
    "AI Approach",
    "Required Data Sources",
    "Data Readiness Summary",
    "5-Pillar Feasibility Summary",
    "Expected Benefits",
    "KPIs",
    "Risks and Governance",
    "Human Oversight",
    "Minimum Viable Prediction",
    "Pilot Scope",
    "Roadmap",
    "Budget",
    "Recommendation",
  ],
  governance_controls: [
    "Privacy control",
    "Cyber control",
    "Human oversight",
    "Bias mitigation",
    "Audit evidence",
    "Third-party assurance",
  ],
  aia_templates: [
    "Canada ATIA Algorithmic Impact Assessment",
    "EU AI Act Fundamental Rights Impact Assessment",
    "NIST AI Risk Management Framework Profile",
    "ISO/IEC 42001 AIMS Assessment",
  ],
};

export function StudioTemplatesAdminTab() {
  const [tpl, setTpl] = useState<StudioTemplates>(DEFAULT_TEMPLATES);
  useEffect(() => {
    setTpl(readLS<StudioTemplates>(LS.studioTemplates, DEFAULT_TEMPLATES));
  }, []);
  const update = (key: keyof StudioTemplates, values: string[]) => {
    const next = { ...tpl, [key]: values };
    setTpl(next);
    writeLS(LS.studioTemplates, next);
  };

  const sections: { key: keyof StudioTemplates; label: string; hint: string }[] = [
    {
      key: "feasibility_questions",
      label: "Feasibility Questions",
      hint: "Used in 5-Pillar feasibility scoring",
    },
    {
      key: "data_readiness_checklist",
      label: "Data Readiness Checklist",
      hint: "Used in data readiness module",
    },
    {
      key: "blueprint_sections",
      label: "Blueprint Sections",
      hint: "Sections generated in Blueprint Builder",
    },
    {
      key: "governance_controls",
      label: "Governance Controls",
      hint: "Options shown in C3G Governance",
    },
    {
      key: "aia_templates",
      label: "AIA Templates",
      hint: "Algorithmic Impact Assessment templates",
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Studio Templates</h2>
        <p className="text-sm text-muted-foreground">
          Configure the questions, checklists, and sections used across the AI Use Case Studio.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sections.map((s) => (
          <Card key={s.key}>
            <CardHeader>
              <CardTitle className="text-base">{s.label}</CardTitle>
              <p className="text-xs text-muted-foreground">{s.hint}</p>
            </CardHeader>
            <CardContent>
              <ListField label="" values={tpl[s.key]} onChange={(v) => update(s.key, v)} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// 5. INTEGRATIONS
// ============================================================
type IntegrationConfig = {
  enabled: boolean;
  api_url: string;
  api_key_label: string;
  notes: string;
};
type IntegrationSettings = {
  sarpi: IntegrationConfig;
  advisorx: IntegrationConfig;
  c3g: IntegrationConfig;
};

const DEFAULT_INTEGRATIONS: IntegrationSettings = {
  sarpi: {
    enabled: false,
    api_url: "",
    api_key_label: "SARPI_API_KEY",
    notes: "AI Readiness, ROI, Performance, Value",
  },
  advisorx: {
    enabled: false,
    api_url: "",
    api_key_label: "ADVISORX_API_KEY",
    notes: "Executive AI advisor reviews",
  },
  c3g: {
    enabled: false,
    api_url: "",
    api_key_label: "C3G_API_KEY",
    notes: "Governance, risk, compliance, audit",
  },
};

export function IntegrationsAdminTab() {
  const [s, setS] = useState<IntegrationSettings>(DEFAULT_INTEGRATIONS);
  useEffect(() => {
    setS(readLS<IntegrationSettings>(LS.integrations, DEFAULT_INTEGRATIONS));
  }, []);
  const update = (key: keyof IntegrationSettings, patch: Partial<IntegrationConfig>) => {
    const next = { ...s, [key]: { ...s[key], ...patch } };
    setS(next);
    writeLS(LS.integrations, next);
  };

  const cards: { key: keyof IntegrationSettings; label: string }[] = [
    { key: "sarpi", label: "SARPI™" },
    { key: "advisorx", label: "AdvisorX™" },
    { key: "c3g", label: "CyberX Sovereign AI C3G™" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Integrations</h2>
        <p className="text-sm text-muted-foreground">
          Connect Studio modules to external assessment and governance platforms.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {cards.map((c) => {
          const cfg = s[c.key];
          return (
            <Card key={c.key}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{c.label}</CardTitle>
                  <Switch
                    checked={cfg.enabled}
                    onCheckedChange={(v) => update(c.key, { enabled: v })}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{cfg.notes}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <Field label="API URL">
                  <Input
                    value={cfg.api_url}
                    onChange={(e) => update(c.key, { api_url: e.target.value })}
                    placeholder="https://…"
                  />
                </Field>
                <Field label="API Key Secret Name">
                  <Input
                    value={cfg.api_key_label}
                    onChange={(e) => update(c.key, { api_key_label: e.target.value })}
                  />
                </Field>
                <p className="text-xs text-muted-foreground">
                  Add the matching secret in Lovable Cloud settings.
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// 6. REPORT TEMPLATES
// ============================================================
type ReportTemplate = {
  id: string;
  kind: "blueprint" | "executive_summary" | "roadmap_export";
  name: string;
  description: string;
  body: string;
};

const DEFAULT_REPORTS: ReportTemplate[] = [
  {
    id: "tpl-bp",
    kind: "blueprint",
    name: "Standard Blueprint",
    description: "Default Blueprint export layout",
    body: "## Executive Summary\n## Problem\n## Approach\n## Roadmap\n## Recommendation",
  },
  {
    id: "tpl-es",
    kind: "executive_summary",
    name: "Boardroom Summary",
    description: "1-page executive briefing",
    body: "Opportunity:\nValue:\nRisk:\nAsk:",
  },
  {
    id: "tpl-rm",
    kind: "roadmap_export",
    name: "12-Month Roadmap",
    description: "Quarterly horizon export",
    body: "Q1:\nQ2:\nQ3:\nQ4:",
  },
];

export function ReportTemplatesAdminTab() {
  const [tpl, setTpl] = useState<ReportTemplate[]>(DEFAULT_REPORTS);
  const [editing, setEditing] = useState<ReportTemplate | null>(null);
  useEffect(() => {
    setTpl(readLS<ReportTemplate[]>(LS.reportTemplates, DEFAULT_REPORTS));
  }, []);
  const persist = (next: ReportTemplate[]) => {
    setTpl(next);
    writeLS(LS.reportTemplates, next);
  };

  const save = () => {
    if (!editing) return;
    const exists = tpl.some((t) => t.id === editing.id);
    persist(exists ? tpl.map((t) => (t.id === editing.id ? editing : t)) : [editing, ...tpl]);
    toast.success("Template saved");
    setEditing(null);
  };

  const add = (kind: ReportTemplate["kind"]) =>
    setEditing({
      id: crypto.randomUUID(),
      kind,
      name: "",
      description: "",
      body: "",
    });

  const groups: { kind: ReportTemplate["kind"]; label: string }[] = [
    { kind: "blueprint", label: "Blueprint Templates" },
    { kind: "executive_summary", label: "Executive Summary Templates" },
    { kind: "roadmap_export", label: "Roadmap Export Templates" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Report Templates</h2>
        <p className="text-sm text-muted-foreground">
          Templates used to generate downloadable Blueprints, summaries, and roadmaps.
        </p>
      </div>

      {groups.map((g) => (
        <div key={g.kind} className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">{g.label}</h3>
            <Button size="sm" variant="outline" onClick={() => add(g.kind)}>
              + Add
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {tpl
              .filter((t) => t.kind === g.kind)
              .map((t) => (
                <Card key={t.id}>
                  <CardHeader>
                    <CardTitle className="text-base">{t.name || "(untitled)"}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-xs text-muted-foreground">{t.description}</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEditing(t)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => persist(tpl.filter((x) => x.id !== t.id))}
                      >
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
          <Separator />
        </div>
      ))}

      {editing && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Edit Template</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="Name">
              <Input
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
            </Field>
            <Field label="Description">
              <Input
                value={editing.description}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              />
            </Field>
            <Field label="Body / Sections">
              <Textarea
                rows={10}
                value={editing.body}
                onChange={(e) => setEditing({ ...editing, body: e.target.value })}
              />
            </Field>
            <div className="flex gap-2">
              <Button onClick={save}>Save</Button>
              <Button variant="ghost" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================
// Shared field helpers
// ============================================================
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      {label && <Label className="text-xs">{label}</Label>}
      {children}
    </div>
  );
}

function ListField({
  label,
  values,
  onChange,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  return (
    <div className="space-y-2">
      {label && <Label className="text-xs">{label}</Label>}
      <div className="flex flex-wrap gap-1.5">
        {values.map((v, i) => (
          <Badge key={`${v}-${i}`} variant="secondary" className="gap-1">
            {v}
            <button
              className="ml-1 opacity-60 hover:opacity-100"
              onClick={() => onChange(values.filter((_, j) => j !== i))}
            >
              ×
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add item…"
          onKeyDown={(e) => {
            if (e.key === "Enter" && draft.trim()) {
              onChange([...values, draft.trim()]);
              setDraft("");
              e.preventDefault();
            }
          }}
        />
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            if (draft.trim()) {
              onChange([...values, draft.trim()]);
              setDraft("");
            }
          }}
        >
          Add
        </Button>
      </div>
    </div>
  );
}
