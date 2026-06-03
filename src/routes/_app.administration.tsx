import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  useAdminStore, emptyUseCase, completionPercent,
  VISIBILITIES, STATUSES, PLATFORM_OPTIONS,
  type AdminUseCase, type Visibility, type Status, type PlatformOption,
} from "@/lib/usecasex.admin";
import { trackCTAEvent } from "@/lib/usecasex.tracking";
import { RequireRoles } from "@/components/RequireRoles";
import { useRoles } from "@/lib/usecasex.roles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Eye, Pencil, Copy, Send, Archive, CheckCircle2, XCircle, Plus, Filter, Search,
} from "lucide-react";
import {
  PatternsAdminTab, CategoriesAdminTab, OrganizationsAdminTab,
  StudioTemplatesAdminTab, IntegrationsAdminTab, ReportTemplatesAdminTab,
} from "@/components/admin/StudioAdminTabs";

const ADMIN_ROLES = ["super_admin", "ai_hub_admin", "usecasex_admin", "content_manager", "reviewer"] as const;

export const Route = createFileRoute("/_app/administration")({
  head: () => ({
    meta: [{ title: "UseCasesX™ Admin", name: "robots" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminPage,
});

function AdminPage() {
  return (
    <RequireRoles
      anyOf={["admin", "moderator", "super_admin", "ai_hub_admin", "usecasex_admin", "content_manager", "reviewer"]}
      action="open the UseCasesX admin"
    >
      <AdminPageInner />
    </RequireRoles>
  );
}

function AdminPageInner() {
  const { roles } = useRoles();
  const roleLabel = roles.length ? roles.join(", ") : "no roles";

  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-[1400px] px-6 py-10 space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">UseCasesX™ Admin</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage the AI use case catalogue, taxonomy, platform mapping, leads, and analytics.
            </p>
          </div>
          <Badge variant="secondary" className="text-xs">Signed-in role: {roleLabel}</Badge>
        </header>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="use-cases">Use Cases</TabsTrigger>
            <TabsTrigger value="add-new">Add New</TabsTrigger>
            <TabsTrigger value="patterns">Patterns</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="organizations">Organizations</TabsTrigger>
            <TabsTrigger value="studio-templates">Studio Templates</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="report-templates">Report Templates</TabsTrigger>
            <TabsTrigger value="taxonomy">Taxonomy</TabsTrigger>
            <TabsTrigger value="platforms">Platform Mapping</TabsTrigger>
            <TabsTrigger value="leads">Leads</TabsTrigger>
            <TabsTrigger value="cta">CTA Analytics</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6"><OverviewTab /></TabsContent>
          <TabsContent value="use-cases" className="mt-6"><UseCasesTab /></TabsContent>
          <TabsContent value="add-new" className="mt-6"><AddNewTab /></TabsContent>
          <TabsContent value="patterns" className="mt-6"><PatternsAdminTab /></TabsContent>
          <TabsContent value="categories" className="mt-6"><CategoriesAdminTab /></TabsContent>
          <TabsContent value="organizations" className="mt-6"><OrganizationsAdminTab /></TabsContent>
          <TabsContent value="studio-templates" className="mt-6"><StudioTemplatesAdminTab /></TabsContent>
          <TabsContent value="integrations" className="mt-6"><IntegrationsAdminTab /></TabsContent>
          <TabsContent value="report-templates" className="mt-6"><ReportTemplatesAdminTab /></TabsContent>
          <TabsContent value="taxonomy" className="mt-6"><TaxonomyTab /></TabsContent>
          <TabsContent value="platforms" className="mt-6"><PlatformsTab /></TabsContent>
          <TabsContent value="leads" className="mt-6"><LeadsTab /></TabsContent>
          <TabsContent value="cta" className="mt-6"><CtaTab /></TabsContent>
          <TabsContent value="reports" className="mt-6"><ReportsTab /></TabsContent>
          <TabsContent value="settings" className="mt-6"><SettingsTab /></TabsContent>
        </Tabs>
      </div>
    </section>
  );
}

function OverviewTab() {
  const { list } = useAdminStore();
  const stats = useMemo(() => {
    const byStatus: Record<string, number> = {};
    for (const u of list) byStatus[u.status] = (byStatus[u.status] ?? 0) + 1;
    return {
      total: list.length,
      published: byStatus["Published"] ?? 0,
      drafts: byStatus["Draft"] ?? 0,
      review: byStatus["Submitted for Review"] ?? 0,
      archived: byStatus["Archived"] ?? 0,
      featured: list.filter((u) => u.featured).length,
    };
  }, [list]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <StatCard label="Total use cases" value={stats.total} />
      <StatCard label="Published" value={stats.published} />
      <StatCard label="Drafts" value={stats.drafts} />
      <StatCard label="In review" value={stats.review} />
      <StatCard label="Archived" value={stats.archived} />
      <StatCard label="Featured" value={stats.featured} />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card><CardContent className="p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-3xl font-semibold tabular-nums mt-1">{value}</p>
    </CardContent></Card>
  );
}

function UseCasesTab() {
  const store = useAdminStore();
  const { canDelete, canPublish } = useRoles();
  const [query, setQuery] = useState("");
  const [statusF, setStatusF] = useState<string>("all");
  const [visF, setVisF] = useState<string>("all");
  const [industryF, setIndustryF] = useState<string>("all");
  const [fnF, setFnF] = useState<string>("all");
  const [aiF, setAiF] = useState<string>("all");
  const [riskF, setRiskF] = useState<string>("all");
  const [valueF, setValueF] = useState<string>("all");
  const [editing, setEditing] = useState<AdminUseCase | null>(null);

  const opts = useMemo(() => ({
    industries: Array.from(new Set(store.list.map((u) => u.industry).filter(Boolean))).sort(),
    functions: Array.from(new Set(store.list.map((u) => u.businessFunction).filter(Boolean))).sort(),
    aiTypes: Array.from(new Set(store.list.map((u) => u.aiType).filter(Boolean))).sort(),
  }), [store.list]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return store.list.filter((u) => {
      if (q && !`${u.title} ${u.slug} ${u.shortDescription}`.toLowerCase().includes(q)) return false;
      if (statusF !== "all" && u.status !== statusF) return false;
      if (visF !== "all" && u.visibility !== visF) return false;
      if (industryF !== "all" && u.industry !== industryF) return false;
      if (fnF !== "all" && u.businessFunction !== fnF) return false;
      if (aiF !== "all" && u.aiType !== aiF) return false;
      if (riskF !== "all" && u.riskLevel !== riskF) return false;
      if (valueF !== "all" && u.valuePotential !== valueF) return false;
      return true;
    });
  }, [store.list, query, statusF, visF, industryF, fnF, aiF, riskF, valueF]);

  const clearFilters = () => { setQuery(""); setStatusF("all"); setVisF("all"); setIndustryF("all"); setFnF("all"); setAiF("all"); setRiskF("all"); setValueF("all"); };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title, slug or description…" className="max-w-md" />
            <Button variant="ghost" size="sm" onClick={clearFilters}><Filter className="w-4 h-4 mr-1" /> Clear</Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2">
            <FilterSelect label="Status" value={statusF} onChange={setStatusF} options={STATUSES} />
            <FilterSelect label="Visibility" value={visF} onChange={setVisF} options={VISIBILITIES} />
            <FilterSelect label="Industry" value={industryF} onChange={setIndustryF} options={opts.industries} />
            <FilterSelect label="Function" value={fnF} onChange={setFnF} options={opts.functions} />
            <FilterSelect label="AI type" value={aiF} onChange={setAiF} options={opts.aiTypes} />
            <FilterSelect label="Risk" value={riskF} onChange={setRiskF} options={["Low", "Medium", "High", "Critical"]} />
            <FilterSelect label="Value" value={valueF} onChange={setValueF} options={["Low", "Medium", "High"]} />
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">{filtered.length} of {store.list.length} use cases</p>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Title</th>
              <th className="px-3 py-2 font-medium">Industry</th>
              <th className="px-3 py-2 font-medium">Function</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Visibility</th>
              <th className="px-3 py-2 font-medium">Risk</th>
              <th className="px-3 py-2 font-medium">Updated</th>
              <th className="px-3 py-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2">
                  <div className="font-medium">{u.title || <em className="text-muted-foreground">Untitled</em>}</div>
                  <div className="text-xs text-muted-foreground">/{u.slug}</div>
                </td>
                <td className="px-3 py-2 text-xs">{u.industry}</td>
                <td className="px-3 py-2 text-xs">{u.businessFunction}</td>
                <td className="px-3 py-2"><StatusBadge status={u.status} /></td>
                <td className="px-3 py-2"><Badge variant="outline" className="text-[10px]">{u.visibility}</Badge></td>
                <td className="px-3 py-2 text-xs">{u.riskLevel}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(u.updatedAt).toLocaleDateString()}</td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-1">
                    <Button asChild variant="ghost" size="icon" title="View">
                      <Link to="/use-cases/$slug" params={{ slug: u.slug }}><Eye className="w-4 h-4" /></Link>
                    </Button>
                    <Button variant="ghost" size="icon" title="Edit" onClick={() => setEditing(u)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" title="Duplicate" onClick={() => { store.duplicate(u.id); trackCTAEvent("admin_duplicated", { id: u.id }); }}><Copy className="w-4 h-4" /></Button>
                    {u.status !== "Published" && canPublish && (
                      <Button variant="ghost" size="icon" title="Publish" onClick={() => { store.setStatus(u.id, "Published", "Published"); trackCTAEvent("admin_published", { id: u.id }); }}>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      </Button>
                    )}
                    {u.status === "Published" && canPublish && (
                      <ConfirmAction
                        title="Unpublish use case?"
                        desc="It will no longer appear in the public catalogue."
                        action="Unpublish"
                        onConfirm={() => { store.setStatus(u.id, "Unpublished", "Unpublished"); trackCTAEvent("admin_unpublished", { id: u.id }); }}
                        trigger={<Button variant="ghost" size="icon" title="Unpublish"><XCircle className="w-4 h-4 text-amber-600" /></Button>}
                      />
                    )}
                    {canDelete && (
                      <ConfirmAction
                        title="Archive use case?"
                        desc="It will be hidden from authors and users. Reversible by editing status."
                        action="Archive"
                        onConfirm={() => { store.setStatus(u.id, "Archived", "Archived"); trackCTAEvent("admin_archived", { id: u.id }); }}
                        trigger={<Button variant="ghost" size="icon" title="Archive (admin only)"><Archive className="w-4 h-4 text-destructive" /></Button>}
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-10 text-center text-sm text-muted-foreground">No use cases match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <UseCaseFormDialog
          initial={editing}
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          onSave={(uc, action) => { store.upsert(uc, action); setEditing(null); }}
        />
      )}
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: readonly string[] | string[] }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="text-xs">All</SelectItem>
          {options.map((o) => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const tone =
    status === "Published" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" :
    status === "Approved" ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30" :
    status === "Submitted for Review" ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30" :
    status === "Unpublished" ? "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30" :
    status === "Archived" ? "bg-destructive/10 text-destructive border-destructive/30" :
    "bg-muted text-muted-foreground border-border";
  return <span className={`text-[10px] px-2 py-0.5 rounded-full border ${tone}`}>{status}</span>;
}

function ConfirmAction({ title, desc, action, onConfirm, trigger }: { title: string; desc: string; action: string; onConfirm: () => void; trigger: React.ReactNode }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{desc}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{action}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function AddNewTab() {
  const store = useAdminStore();
  const [uc, setUc] = useState<AdminUseCase>(() => emptyUseCase());

  return (
    <UseCaseForm
      uc={uc}
      onChange={setUc}
      onSave={async (next, action) => {
        const saved = await store.upsert(next, action);
        if (saved) {
          setUc(emptyUseCase());
          trackCTAEvent("admin_use_case_saved", { id: saved.id, action });
        }
      }}
    />
  );
}

function UseCaseFormDialog({ initial, open, onOpenChange, onSave }: { initial: AdminUseCase; open: boolean; onOpenChange: (o: boolean) => void; onSave: (uc: AdminUseCase, action: string) => void }) {
  const [uc, setUc] = useState<AdminUseCase>(initial);
  useEffect(() => { if (open) setUc(initial); }, [open, initial]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit use case</DialogTitle>
          <DialogDescription>{uc.title || uc.slug}</DialogDescription>
        </DialogHeader>
        <UseCaseForm uc={uc} onChange={setUc} onSave={(next, action) => { onSave(next, action); onOpenChange(false); }} />
      </DialogContent>
    </Dialog>
  );
}

function UseCaseForm({ uc, onChange, onSave }: { uc: AdminUseCase; onChange: (uc: AdminUseCase) => void; onSave: (uc: AdminUseCase, action: string) => void }) {
  const pct = completionPercent(uc);
  const [previewOpen, setPreviewOpen] = useState(false);

  const set = <K extends keyof AdminUseCase>(k: K, v: AdminUseCase[K]) => onChange({ ...uc, [k]: v });

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Completion</span>
              <span className="font-medium tabular-nums">{pct}%</span>
            </div>
            <Progress value={pct} className="mt-1" />
          </div>
          <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
            <DialogTrigger asChild><Button variant="outline"><Eye className="w-4 h-4 mr-1" /> Preview</Button></DialogTrigger>
            <DialogContent className="max-w-2xl"><PreviewUseCase uc={uc} /></DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <Tabs defaultValue="basic">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="basic">1. Basic</TabsTrigger>
          <TabsTrigger value="classification">2. Classification</TabsTrigger>
          <TabsTrigger value="value">3. Business Value</TabsTrigger>
          <TabsTrigger value="delivery">4. Delivery</TabsTrigger>
          <TabsTrigger value="governance">5. Governance & Risk</TabsTrigger>
          <TabsTrigger value="platforms">6. Platform Mapping</TabsTrigger>
          <TabsTrigger value="publish">7. Publishing</TabsTrigger>
          <TabsTrigger value="audit">Audit log</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="mt-4 space-y-3">
          <Field label="Title"><Input value={uc.title} onChange={(e) => set("title", e.target.value)} /></Field>
          <Field label="Slug"><Input value={uc.slug} onChange={(e) => set("slug", e.target.value.replace(/[^a-z0-9-]/gi, "-").toLowerCase())} placeholder="kebab-case-slug" /></Field>
          <Field label="Short description"><Textarea rows={2} value={uc.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} /></Field>
          <Field label="Full description"><Textarea rows={6} value={uc.fullDescription} onChange={(e) => set("fullDescription", e.target.value)} /></Field>
          <Field label="Tags (comma separated)">
            <Input value={uc.tags.join(", ")} onChange={(e) => set("tags", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} />
          </Field>
        </TabsContent>

        <TabsContent value="classification" className="mt-4 grid grid-cols-2 gap-3">
          <Field label="Industry slug"><Input value={uc.industry} onChange={(e) => set("industry", e.target.value)} /></Field>
          <Field label="Business function"><Input value={uc.businessFunction} onChange={(e) => set("businessFunction", e.target.value)} /></Field>
          <Field label="AI type"><Input value={uc.aiType} onChange={(e) => set("aiType", e.target.value)} placeholder="e.g. Generative AI" /></Field>
          <Field label="Business objective"><Input value={uc.businessObjective} onChange={(e) => set("businessObjective", e.target.value)} /></Field>
          <Field label="Maturity">
            <Select value={uc.maturity} onValueChange={(v) => set("maturity", v as AdminUseCase["maturity"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["Beginner", "Intermediate", "Advanced"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </TabsContent>

        <TabsContent value="value" className="mt-4 space-y-3">
          <Field label="Business problem"><Textarea rows={3} value={uc.businessProblem} onChange={(e) => set("businessProblem", e.target.value)} /></Field>
          <Field label="AI solution"><Textarea rows={3} value={uc.aiSolution} onChange={(e) => set("aiSolution", e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Value potential">
              <Select value={uc.valuePotential} onValueChange={(v) => set("valuePotential", v as AdminUseCase["valuePotential"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Low", "Medium", "High"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Time to value">
              <Select value={uc.timeToValue} onValueChange={(v) => set("timeToValue", v as AdminUseCase["timeToValue"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Short", "Medium", "Long"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="ROI areas (comma separated)">
            <Input value={uc.roiAreas.join(", ")} onChange={(e) => set("roiAreas", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} />
          </Field>
          <Field label="KPIs (comma separated)">
            <Input value={uc.kpis.join(", ")} onChange={(e) => set("kpis", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} />
          </Field>
        </TabsContent>

        <TabsContent value="delivery" className="mt-4 space-y-3">
          <Field label="Complexity">
            <Select value={uc.complexity} onValueChange={(v) => set("complexity", v as AdminUseCase["complexity"])}>
              <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{["Low", "Medium", "High"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Implementation steps"><Textarea rows={4} value={uc.implementationSteps} onChange={(e) => set("implementationSteps", e.target.value)} /></Field>
          <Field label="Data required"><Textarea rows={3} value={uc.dataRequired} onChange={(e) => set("dataRequired", e.target.value)} /></Field>
          <Field label="Required integrations"><Textarea rows={2} value={uc.integrations} onChange={(e) => set("integrations", e.target.value)} /></Field>
          <Field label="Required skills"><Textarea rows={2} value={uc.skills} onChange={(e) => set("skills", e.target.value)} /></Field>
        </TabsContent>

        <TabsContent value="governance" className="mt-4 space-y-3">
          <Field label="Risk level">
            <Select value={uc.riskLevel} onValueChange={(v) => set("riskLevel", v as AdminUseCase["riskLevel"])}>
              <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{["Low", "Medium", "High", "Critical"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Governance notes"><Textarea rows={3} value={uc.governanceNotes} onChange={(e) => set("governanceNotes", e.target.value)} /></Field>
          <Field label="Cybersecurity notes"><Textarea rows={3} value={uc.cybersecurityNotes} onChange={(e) => set("cybersecurityNotes", e.target.value)} /></Field>
          <Field label="Privacy notes"><Textarea rows={3} value={uc.privacyNotes} onChange={(e) => set("privacyNotes", e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <SwitchRow label="Governance required" checked={uc.governanceRequired} onChange={(v) => set("governanceRequired", v)} />
            <SwitchRow label="Privacy review required" checked={uc.privacyReviewRequired} onChange={(v) => set("privacyReviewRequired", v)} />
            <SwitchRow label="Cyber review required" checked={uc.cyberReviewRequired} onChange={(v) => set("cyberReviewRequired", v)} />
            <SwitchRow label="Assurance review required" checked={uc.assuranceReviewRequired} onChange={(v) => set("assuranceReviewRequired", v)} />
          </div>
        </TabsContent>

        <TabsContent value="platforms" className="mt-4">
          <p className="text-xs text-muted-foreground mb-3">Select the AIgilityX platforms this use case maps to.</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {PLATFORM_OPTIONS.map((p) => {
              const checked = uc.platforms.includes(p);
              return (
                <label key={p} className="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-muted/50">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(c) => {
                      const next = c
                        ? [...uc.platforms, p]
                        : uc.platforms.filter((x) => x !== p);
                      set("platforms", next as PlatformOption[]);
                    }}
                  />
                  <span className="text-sm">{p}</span>
                </label>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="publish" className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Visibility">
              <Select value={uc.visibility} onValueChange={(v) => set("visibility", v as Visibility)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{VISIBILITIES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={uc.status} onValueChange={(v) => set("status", v as Status)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Display order"><Input type="number" value={uc.displayOrder} onChange={(e) => set("displayOrder", parseInt(e.target.value, 10) || 0)} /></Field>
            <div className="flex items-end pb-1">
              <SwitchRow label="Featured" checked={uc.featured} onChange={(v) => set("featured", v)} />
            </div>
          </div>
          <Field label="Change notes (for audit log)"><Textarea rows={2} value={uc.changeNotes} onChange={(e) => set("changeNotes", e.target.value)} placeholder="What changed?" /></Field>
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <div className="rounded-md border divide-y">
            {uc.auditLog.slice().reverse().map((a, i) => (
              <div key={i} className="px-3 py-2 text-xs">
                <div className="flex justify-between">
                  <span className="font-medium">{a.action}</span>
                  <span className="text-muted-foreground">{new Date(a.ts).toLocaleString()}</span>
                </div>
                <div className="text-muted-foreground">by {a.actor}{a.detail ? ` — ${a.detail}` : ""}</div>
              </div>
            ))}
            {uc.auditLog.length === 0 && <p className="px-3 py-4 text-xs text-muted-foreground">No audit entries yet.</p>}
          </div>
        </TabsContent>
      </Tabs>

      <Separator />

      <div className="flex flex-wrap gap-2 justify-end">
        <Button variant="outline" onClick={() => onSave({ ...uc, status: "Draft" }, "Saved draft")}>Save Draft</Button>
        <Button variant="outline" onClick={() => onSave({ ...uc, status: "Submitted for Review" }, "Submitted for review")}>
          <Send className="w-4 h-4 mr-1" /> Submit for Review
        </Button>
        <Button variant="outline" onClick={() => onSave({ ...uc, status: "Approved" }, "Approved")}>Approve</Button>
        <Button onClick={() => onSave({ ...uc, status: "Published" }, "Published")}><CheckCircle2 className="w-4 h-4 mr-1" /> Publish</Button>
        <ConfirmAction
          title="Unpublish use case?"
          desc="It will no longer appear in the public catalogue."
          action="Unpublish"
          onConfirm={() => onSave({ ...uc, status: "Unpublished" }, "Unpublished")}
          trigger={<Button variant="outline">Unpublish</Button>}
        />
        <ConfirmAction
          title="Archive use case?"
          desc="It will be hidden from authors and users. You can restore by editing status."
          action="Archive"
          onConfirm={() => onSave({ ...uc, status: "Archived" }, "Archived")}
          trigger={<Button variant="destructive"><Archive className="w-4 h-4 mr-1" /> Archive</Button>}
        />
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function SwitchRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-md border p-2">
      <Label className="text-sm">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function PreviewUseCase({ uc }: { uc: AdminUseCase }) {
  return (
    <div className="space-y-3">
      <DialogHeader>
        <DialogTitle>{uc.title || "Untitled"}</DialogTitle>
        <DialogDescription>{uc.shortDescription}</DialogDescription>
      </DialogHeader>
      <div className="flex flex-wrap gap-1.5">
        {uc.industry && <Badge variant="secondary">{uc.industry}</Badge>}
        {uc.businessFunction && <Badge variant="outline">{uc.businessFunction}</Badge>}
        {uc.aiType && <Badge variant="outline">{uc.aiType}</Badge>}
        <Badge variant="outline">Value: {uc.valuePotential}</Badge>
        <Badge variant="outline">Complexity: {uc.complexity}</Badge>
        <Badge variant="outline">Risk: {uc.riskLevel}</Badge>
        <Badge variant="outline">TTV: {uc.timeToValue}</Badge>
      </div>
      {uc.fullDescription && <p className="text-sm">{uc.fullDescription}</p>}
      {uc.platforms.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Platforms</p>
          <div className="flex flex-wrap gap-1.5">{uc.platforms.map((p) => <Badge key={p} variant="secondary">{p}</Badge>)}</div>
        </div>
      )}
    </div>
  );
}

type TaxRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_published: boolean;
};

const TAX_TABLES = {
  sectors: { table: "taxonomy_sectors", label: "Sectors" },
  tags: { table: "taxonomy_tags", label: "Tags" },
  maturity: { table: "taxonomy_maturity_levels", label: "Maturity Levels" },
} as const;

function TaxonomyTab() {
  const [meta, setMeta] = useState<{ version: number; published_at: string } | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const loadMeta = async () => {
    const { data } = await supabase.from("taxonomy_meta").select("version, published_at").eq("id", 1).maybeSingle();
    if (data) setMeta(data as any);
  };
  useEffect(() => { loadMeta(); }, []);

  const publish = async () => {
    setPublishing(true);
    setMsg(null);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("taxonomy_meta")
      .update({ version: (meta?.version ?? 0) + 1, published_at: new Date().toISOString(), published_by: u.user?.id ?? null })
      .eq("id", 1);
    setPublishing(false);
    if (error) {
      setMsg(`Publish failed: ${error.message}`);
    } else {
      setMsg("Taxonomy published — version bumped and now live on the public API.");
      loadMeta();
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Taxonomy version: <span className="tabular-nums">v{meta?.version ?? "—"}</span></p>
            <p className="text-xs text-muted-foreground">
              Last published: {meta?.published_at ? new Date(meta.published_at).toLocaleString() : "never"}.
              Publish to bump the version exposed at <code>/api/public/usecasex/taxonomy</code>.
            </p>
          </div>
          <Button onClick={publish} disabled={publishing}>
            <Send className="w-4 h-4 mr-1" /> {publishing ? "Publishing…" : "Publish changes"}
          </Button>
        </CardContent>
      </Card>
      {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {(Object.keys(TAX_TABLES) as Array<keyof typeof TAX_TABLES>).map((k) => (
          <TaxonomyEditor key={k} table={TAX_TABLES[k].table} title={TAX_TABLES[k].label} />
        ))}
      </div>
    </div>
  );
}

function TaxonomyEditor({ table, title }: { table: string; title: string }) {
  const [rows, setRows] = useState<TaxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSlug, setNewSlug] = useState("");
  const [newName, setNewName] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from(table as any).select("*").order("sort_order").order("name");
    setRows(((data as unknown) as TaxRow[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [table]);

  const add = async () => {
    const slug = newSlug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-");
    if (!slug || !newName.trim()) return;
    const { error } = await supabase.from(table as any).insert({ slug, name: newName.trim(), sort_order: rows.length });
    if (!error) { setNewSlug(""); setNewName(""); load(); }
    else alert(error.message);
  };

  const update = async (id: string, patch: Partial<TaxRow>) => {
    const { error } = await supabase.from(table as any).update(patch).eq("id", id);
    if (!error) load(); else alert(error.message);
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from(table as any).delete().eq("id", id);
    if (!error) load(); else alert(error.message);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>{title} <span className="text-xs text-muted-foreground">({rows.length})</span></span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input value={newSlug} onChange={(e) => setNewSlug(e.target.value)} placeholder="slug" className="h-8 text-xs" />
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Display name" className="h-8 text-xs" />
          <Button size="sm" variant="outline" onClick={add}><Plus className="w-4 h-4" /></Button>
        </div>
        <ul className="space-y-1 max-h-96 overflow-y-auto">
          {loading && <li className="text-xs text-muted-foreground">Loading…</li>}
          {!loading && rows.length === 0 && <li className="text-xs text-muted-foreground">No items yet.</li>}
          {rows.map((r) => (
            <li key={r.id} className="flex items-center gap-2 border-b py-1.5">
              <Input
                defaultValue={r.name}
                onBlur={(e) => e.target.value !== r.name && update(r.id, { name: e.target.value })}
                className="h-7 text-xs flex-1"
              />
              <code className="text-[10px] text-muted-foreground w-20 truncate" title={r.slug}>{r.slug}</code>
              <label className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                <Switch checked={r.is_published} onCheckedChange={(v) => update(r.id, { is_published: v })} />
                {r.is_published ? "Pub" : "Draft"}
              </label>
              <Button size="icon" variant="ghost" onClick={() => remove(r.id)} title="Delete">
                <XCircle className="w-4 h-4 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function PlatformsTab() {
  const { list } = useAdminStore();
  const matrix = useMemo(() => {
    const m: Record<string, AdminUseCase[]> = {};
    for (const p of PLATFORM_OPTIONS) m[p] = [];
    for (const u of list) for (const p of u.platforms) m[p]?.push(u);
    return m;
  }, [list]);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {PLATFORM_OPTIONS.map((p) => (
        <Card key={p}>
          <CardHeader><CardTitle className="text-base">{p} <Badge variant="outline" className="ml-2 text-[10px]">{matrix[p].length}</Badge></CardTitle></CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1 max-h-48 overflow-y-auto">
              {matrix[p].map((u) => <li key={u.id} className="truncate">{u.title}</li>)}
              {matrix[p].length === 0 && <li className="text-xs text-muted-foreground">No mapped use cases.</li>}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function LeadsTab() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("lead_captures")
        .select("id, full_name, email, company, country, interest_area, cta, source_page, lead_status, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (!error) setLeads(data ?? []);
      setLoading(false);
    })();
  }, []);
  if (loading) return <p className="text-sm text-muted-foreground">Loading leads…</p>;
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left"><tr>
          <th className="px-3 py-2 font-medium">Name</th><th className="px-3 py-2 font-medium">Email</th>
          <th className="px-3 py-2 font-medium">Company</th><th className="px-3 py-2 font-medium">Interest</th>
          <th className="px-3 py-2 font-medium">CTA</th><th className="px-3 py-2 font-medium">Status</th>
          <th className="px-3 py-2 font-medium">When</th>
        </tr></thead>
        <tbody>
          {leads.map((l) => (
            <tr key={l.id} className="border-t">
              <td className="px-3 py-2">{l.full_name}</td>
              <td className="px-3 py-2 text-xs">{l.email}</td>
              <td className="px-3 py-2 text-xs">{l.company ?? "—"}</td>
              <td className="px-3 py-2 text-xs">{l.interest_area ?? "—"}</td>
              <td className="px-3 py-2 text-xs">{l.cta ?? "—"}</td>
              <td className="px-3 py-2"><Badge variant="outline" className="text-[10px]">{l.lead_status}</Badge></td>
              <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString()}</td>
            </tr>
          ))}
          {leads.length === 0 && <tr><td colSpan={7} className="px-3 py-10 text-center text-sm text-muted-foreground">No leads yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function CtaTab() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("cta_events")
        .select("id, cta, target_platform, target_route, source_page, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      setEvents(data ?? []);
      setLoading(false);
    })();
  }, []);
  const grouped = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of events) m[e.cta] = (m[e.cta] ?? 0) + 1;
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [events]);
  if (loading) return <p className="text-sm text-muted-foreground">Loading analytics…</p>;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card><CardHeader><CardTitle className="text-base">Top CTAs ({events.length} events)</CardTitle></CardHeader>
        <CardContent><ul className="text-sm space-y-1">
          {grouped.map(([cta, count]) => (
            <li key={cta} className="flex justify-between border-b py-1.5"><span>{cta}</span><span className="tabular-nums font-medium">{count}</span></li>
          ))}
          {grouped.length === 0 && <li className="text-xs text-muted-foreground">No CTA events recorded.</li>}
        </ul></CardContent>
      </Card>
      <Card><CardHeader><CardTitle className="text-base">Recent events</CardTitle></CardHeader>
        <CardContent><ul className="text-xs space-y-1 max-h-[420px] overflow-y-auto">
          {events.slice(0, 100).map((e) => (
            <li key={e.id} className="border-b py-1.5">
              <div className="flex justify-between"><span className="font-medium">{e.cta}</span><span className="text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span></div>
              <div className="text-muted-foreground">{e.target_platform ?? e.target_route ?? e.source_page ?? "—"}</div>
            </li>
          ))}
        </ul></CardContent>
      </Card>
    </div>
  );
}

function ReportsTab() {
  return (
    <Card><CardContent className="p-6 space-y-3">
      <p className="text-sm">Admin reports use the same engine as Pro reports.</p>
      <Button asChild><Link to="/reports">Open report generator</Link></Button>
    </CardContent></Card>
  );
}

function SettingsTab() {
  return (
    <Card><CardContent className="p-6 space-y-4">
      <div>
        <h3 className="font-semibold mb-1">Admin roles</h3>
        <p className="text-sm text-muted-foreground mb-2">These roles can access the admin panel. Mapping to the database <code>app_role</code> enum is managed separately.</p>
        <div className="flex flex-wrap gap-1.5">{ADMIN_ROLES.map((r) => <Badge key={r} variant="secondary">{r}</Badge>)}</div>
      </div>
      <Separator />
      <div>
        <h3 className="font-semibold mb-1">Catalogue source</h3>
        <p className="text-sm text-muted-foreground">Use cases, audit log, taxonomy and analytics are now persisted to Lovable Cloud. Every admin action writes an entry to <code>use_case_audit_log</code>.</p>
      </div>
    </CardContent></Card>
  );
}
