import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Building2, Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  getOrganizationSetupFn,
  saveOrganizationUnitFn,
  deleteOrganizationUnitFn,
  createPrivateTaxonomyEntryFn,
  deletePrivateTaxonomyEntryFn,
} from "@/lib/organization.functions";
import { getOpportunityMapFn } from "@/lib/opportunity-map.functions";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { TaxonomySetupChecklist } from "@/components/opportunities/TaxonomySetupChecklist";
import { EnterpriseIdentityPanel } from "@/components/enterprise/EnterpriseIdentityPanel";
import type { MapRecord } from "@/lib/opportunity-map";

export const Route = createFileRoute("/_app/account/organization")({
  head: () => ({
    meta: [
      { title: "Organization & Taxonomy — UseCasesX™" },
      {
        name: "description",
        content:
          "Define your organization structure and the shared or private taxonomy used to classify AI opportunities.",
      },
      { property: "og:title", content: "Organization & Taxonomy — UseCasesX™" },
      {
        property: "og:description",
        content: "Set up units, processes, strategic themes and value themes for your workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrganizationSetupPage,
});

const UNIT_TYPES = [
  { value: "group", label: "Group" },
  { value: "company", label: "Company" },
  { value: "business_unit", label: "Business unit" },
  { value: "department", label: "Department" },
  { value: "team", label: "Team" },
  { value: "program", label: "Program" },
  { value: "project", label: "Project" },
] as const;

const TAXONOMY_PANELS = [
  {
    table: "taxonomy_processes",
    title: "Processes",
    hint: "Business processes an opportunity improves.",
  },
  {
    table: "taxonomy_strategic_themes",
    title: "Strategic themes",
    hint: "Strategy pillars an opportunity supports.",
  },
  { table: "taxonomy_value_themes", title: "Value themes", hint: "Where the value shows up." },
] as const;

function OrganizationSetupPage() {
  const fetchSetup = useServerFn(getOrganizationSetupFn);
  const saveUnit = useServerFn(saveOrganizationUnitFn);
  const removeUnit = useServerFn(deleteOrganizationUnitFn);
  const addEntry = useServerFn(createPrivateTaxonomyEntryFn);
  const removeEntry = useServerFn(deletePrivateTaxonomyEntryFn);
  const qc = useQueryClient();
  // Both reads are authenticated server fns: wait for the session so the
  // bearer attacher can send a token instead of 401-ing.
  const session = useSupabaseSession();

  const query = useQuery({
    queryKey: ["organization-setup"],
    queryFn: () => fetchSetup(),
    enabled: Boolean(session),
  });

  const fetchMap = useServerFn(getOpportunityMapFn);
  const mapQuery = useQuery({
    queryKey: ["opportunity-map"],
    queryFn: () => fetchMap(),
    enabled: Boolean(session),
    staleTime: 60_000,
  });

  const [unitName, setUnitName] = useState("");
  const [unitType, setUnitType] = useState<string>("department");
  const [parentId, setParentId] = useState<string>("none");

  const invalidate = () => qc.invalidateQueries({ queryKey: ["organization-setup"] });

  const createUnit = useMutation({
    mutationFn: () =>
      saveUnit({
        data: {
          name: unitName,
          unitType: unitType as never,
          parentId: parentId === "none" ? null : parentId,
        },
      }),
    onSuccess: () => {
      setUnitName("");
      toast.success("Unit added");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteUnit = useMutation({
    mutationFn: (id: string) => removeUnit({ data: { id } }),
    onSuccess: () => {
      toast.success("Unit removed");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const data = query.data;
  const canManage = !!data?.canManage;
  const units = data?.units ?? [];

  const tree = useMemo(() => {
    const byParent = new Map<string | null, any[]>();
    for (const u of units) {
      const key = (u.parent_id ?? null) as string | null;
      byParent.set(key, [...(byParent.get(key) ?? []), u]);
    }
    const walk = (parent: string | null, depth: number): { unit: any; depth: number }[] =>
      (byParent.get(parent) ?? []).flatMap((u) => [{ unit: u, depth }, ...walk(u.id, depth + 1)]);
    return walk(null, 0);
  }, [units]);

  if (query.isPending) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="mx-auto max-w-[1200px] px-6 py-16 text-sm text-muted-foreground"
      >
        <Loader2 className="mr-2 inline h-4 w-4 animate-spin" aria-hidden />
        Loading organization setup…
      </div>
    );
  }

  if (query.isError) {
    return (
      <div role="alert" className="mx-auto max-w-[1200px] px-6 py-16">
        <p className="text-sm text-destructive">We could not load your organization setup.</p>
        <Button variant="outline" className="mt-4" onClick={() => query.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-8 px-6 py-10">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Building2 className="h-5 w-5 text-primary" aria-hidden />
          Organization &amp; taxonomy
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {data?.organization?.name ? `${data.organization.name} — ` : ""}
          add the departments, teams or programs you plan to map opportunities to. The same
          structure supports multi-company groups later without re-modelling your data.
        </p>
        {!canManage && (
          <p className="text-sm text-muted-foreground">
            You have read-only access. Workspace owners and admins can make changes.
          </p>
        )}
      </header>

      {canManage ? <EnterpriseIdentityPanel /> : null}

      <TaxonomySetupChecklist
        counts={{
          orgUnits: units.length,
          strategicThemes: data?.taxonomy?.taxonomy_strategic_themes?.length ?? 0,
          valueThemes: data?.taxonomy?.taxonomy_value_themes?.length ?? 0,
          processes: data?.taxonomy?.taxonomy_processes?.length ?? 0,
          opportunities: mapQuery.data?.records.length ?? 0,
          classifiedOpportunities: (mapQuery.data?.records ?? []).filter(
            (r: MapRecord) => (r.orgUnitId || r.businessFunction.trim()) && r.strategicThemeId,
          ).length,
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Organization units</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {canManage && (
            <form
              className="grid gap-3 sm:grid-cols-[1fr_170px_190px_auto]"
              onSubmit={(e) => {
                e.preventDefault();
                if (unitName.trim()) createUnit.mutate();
              }}
            >
              <div className="space-y-1">
                <Label htmlFor="unit-name">Name</Label>
                <Input
                  id="unit-name"
                  value={unitName}
                  onChange={(e) => setUnitName(e.target.value)}
                  placeholder="e.g. Customer Operations"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="unit-type">Type</Label>
                <Select value={unitType} onValueChange={setUnitType}>
                  <SelectTrigger id="unit-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="unit-parent">Sits under</Label>
                <Select value={parentId} onValueChange={setParentId}>
                  <SelectTrigger id="unit-parent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Workspace root</SelectItem>
                    {units.map((u: any) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={createUnit.isPending || !unitName.trim()}>
                  <Plus className="mr-1 h-4 w-4" aria-hidden />
                  Add
                </Button>
              </div>
            </form>
          )}

          {tree.length === 0 ? (
            <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No units yet. Most teams start with two or three departments.
            </p>
          ) : (
            <ul className="divide-y divide-border" aria-label="Organization units">
              {tree.map(({ unit, depth }) => (
                <li key={unit.id} className="flex items-center justify-between gap-3 py-2">
                  <div style={{ paddingInlineStart: depth * 16 }} className="min-w-0">
                    <span className="truncate text-sm font-medium">{unit.name}</span>
                    <Badge variant="secondary" className="ml-2 align-middle text-[11px]">
                      {UNIT_TYPES.find((t) => t.value === unit.unit_type)?.label ?? unit.unit_type}
                    </Badge>
                  </div>
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${unit.name}`}
                      onClick={() => deleteUnit.mutate(unit.id)}
                      disabled={deleteUnit.isPending}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {TAXONOMY_PANELS.map((panel) => (
          <TaxonomyPanel
            key={panel.table}
            title={panel.title}
            hint={panel.hint}
            table={panel.table}
            entries={(data?.taxonomy as any)?.[panel.table] ?? []}
            canManage={canManage}
            onAdd={(name) => addEntry({ data: { table: panel.table as never, name } })}
            onRemove={(id) => removeEntry({ data: { table: panel.table as never, id } })}
            onChanged={invalidate}
          />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Shared reference lists</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          <ReadOnlyList title="Risk levels" entries={(data?.taxonomy as any)?.risk_levels ?? []} />
          <ReadOnlyList
            title="Lifecycle stages"
            entries={(data?.taxonomy as any)?.lifecycle_stages ?? []}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function TaxonomyPanel({
  title,
  hint,
  entries,
  canManage,
  onAdd,
  onRemove,
  onChanged,
}: {
  title: string;
  hint: string;
  table: string;
  entries: any[];
  canManage: boolean;
  onAdd: (name: string) => Promise<unknown>;
  onRemove: (id: string) => Promise<unknown>;
  onChanged: () => void;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const inputId = `add-${title.replace(/\s+/g, "-").toLowerCase()}`;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await onAdd(name.trim());
      setName("");
      toast.success(`${title} entry added`);
      onChanged();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {canManage && (
          <form className="flex gap-2" onSubmit={submit}>
            <Label htmlFor={inputId} className="sr-only">
              Add a private {title.toLowerCase()} entry
            </Label>
            <Input
              id={inputId}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Add your own…"
            />
            <Button
              type="submit"
              size="icon"
              disabled={busy || !name.trim()}
              aria-label={`Add ${title} entry`}
            >
              <Plus className="h-4 w-4" aria-hidden />
            </Button>
          </form>
        )}
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing available yet.</p>
        ) : (
          <ul className="space-y-1" aria-label={title}>
            {entries.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">{e.name}</span>
                <span className="flex items-center gap-1">
                  <Badge
                    variant={e.organization_id ? "default" : "outline"}
                    className="text-[10px]"
                  >
                    {e.organization_id ? "Private" : "Shared"}
                  </Badge>
                  {canManage && e.organization_id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${e.name}`}
                      onClick={async () => {
                        try {
                          await onRemove(e.id);
                          onChanged();
                        } catch (err) {
                          toast.error((err as Error).message);
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ReadOnlyList({ title, entries }: { title: string; entries: any[] }) {
  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold">{title}</h2>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">Not available yet.</p>
      ) : (
        <ul className="flex flex-wrap gap-2" aria-label={title}>
          {entries.map((e) => (
            <li key={e.id}>
              <Badge variant="outline">{e.name}</Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
