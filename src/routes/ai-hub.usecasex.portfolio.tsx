import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MOCK_USE_CASES } from "@/lib/usecasex.mock";
import {
  useUseCaseXStore,
  computeTotalScore,
  PORTFOLIO_TYPES,
  PORTFOLIO_STATUSES,
  type Portfolio,
  type PortfolioType,
  type PortfolioStatus,
} from "@/lib/usecasex.store";
import { trackCTAEvent } from "@/lib/usecasex.tracking";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Pencil, X } from "lucide-react";

export const Route = createFileRoute("/ai-hub/usecasex/portfolio")({
  head: () => ({
    meta: [
      { title: "AI Opportunity Portfolios — UseCaseX™ Pro" },
      { name: "description", content: "Build, score, and govern AI opportunity portfolios across quick wins, strategic and high-risk initiatives." },
    ],
  }),
  component: PortfolioPage,
});

function PortfolioPage() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const store = useUseCaseXStore();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        navigate({ to: "/ai-hub/usecasex/pro", replace: true });
        return;
      }
      setAuthChecked(true);
    })();
  }, [navigate]);

  if (!authChecked) {
    return <div className="mx-auto max-w-4xl px-6 py-16 text-sm text-muted-foreground">Loading your portfolios…</div>;
  }

  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-[1280px] px-6 py-12 space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">AI Opportunity Portfolios</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Group saved use cases into strategic packs ready for readiness, ROI, governance or pilot.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline"><Link to="/ai-hub/usecasex/saved">Saved use cases</Link></Button>
            <CreatePortfolioDialog onCreate={store.createPortfolio} />
          </div>
        </header>

        {store.portfolios.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center space-y-3">
              <p className="text-lg font-medium">No portfolios yet</p>
              <p className="text-sm text-muted-foreground">Create your first portfolio to start grouping AI opportunities.</p>
              <CreatePortfolioDialog onCreate={store.createPortfolio} />
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {store.portfolios.map((p) => (
              <PortfolioCard key={p.id} portfolio={p} store={store} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function PortfolioCard({ portfolio, store }: { portfolio: Portfolio; store: ReturnType<typeof useUseCaseXStore> }) {
  const items = useMemo(() => {
    return portfolio.useCaseSlugs
      .map((slug) => {
        const entry = store.saved.find((s) => s.useCaseSlug === slug);
        const uc = MOCK_USE_CASES.find((u) => u.slug === slug);
        return uc ? { uc, score: entry?.score } : null;
      })
      .filter(Boolean) as Array<{ uc: typeof MOCK_USE_CASES[number]; score?: Parameters<typeof computeTotalScore>[0] }>;
  }, [portfolio.useCaseSlugs, store.saved]);

  const avgScore = items.length
    ? Math.round(items.reduce((acc, i) => acc + computeTotalScore(i.score), 0) / items.length)
    : 0;

  const availableToAdd = store.saved.filter((s) => !portfolio.useCaseSlugs.includes(s.useCaseSlug));

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg leading-snug">{portfolio.name}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Created {new Date(portfolio.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-1">
            <EditPortfolioDialog portfolio={portfolio} store={store} />
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                store.deletePortfolio(portfolio.id);
                trackCTAEvent("portfolio_deleted", { id: portfolio.id });
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary">{portfolio.type}</Badge>
          <StatusBadge status={portfolio.status} />
          {portfolio.targetDepartment && <Badge variant="outline">{portfolio.targetDepartment}</Badge>}
          {portfolio.targetQuarter && <Badge variant="outline">{portfolio.targetQuarter}</Badge>}
        </div>

        {portfolio.objective && (
          <p className="text-xs text-muted-foreground italic">“{portfolio.objective}”</p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Use cases" value={items.length.toString()} />
          <Stat label="Avg score" value={avgScore ? avgScore.toString() : "—"} />
          <Stat label="Status" value={portfolio.status} small />
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Items</p>
            {availableToAdd.length > 0 && (
              <AddItemDialog portfolio={portfolio} store={store} />
            )}
          </div>
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground py-3">No use cases yet. Add saved use cases to start scoring this portfolio.</p>
          ) : (
            <ul className="space-y-1.5">
              {items.map(({ uc, score }) => (
                <li key={uc.slug} className="flex items-center justify-between gap-2 text-sm rounded-md border bg-card px-3 py-2">
                  <Link
                    to="/ai-hub/usecasex/$slug"
                    params={{ slug: uc.slug }}
                    className="truncate hover:underline flex-1"
                  >
                    {uc.title}
                  </Link>
                  <span className="text-xs tabular-nums text-muted-foreground w-10 text-right">
                    {score ? computeTotalScore(score) : "—"}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => store.removeFromPortfolio(portfolio.id, uc.slug)}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Separator />

        <div className="flex flex-wrap gap-2">
          <StatusPicker
            status={portfolio.status}
            onChange={(s) => {
              store.updatePortfolio(portfolio.id, { status: s });
              trackCTAEvent("portfolio_status_changed", { id: portfolio.id, status: s });
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="rounded-md border bg-muted/30 p-2 text-center">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={small ? "text-xs font-medium mt-1 truncate" : "text-xl font-semibold tabular-nums mt-0.5"}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: PortfolioStatus }) {
  const tone =
    status === "Ready for Pilot" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" :
    status === "Ready for Governance" ? "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30" :
    status === "Ready for ROI" ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30" :
    status === "Ready for Readiness" ? "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30" :
    status === "Under Review" ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30" :
    "bg-muted text-muted-foreground border-border";
  return <span className={`text-[10px] px-2 py-0.5 rounded-full border ${tone}`}>{status}</span>;
}

function StatusPicker({ status, onChange }: { status: PortfolioStatus; onChange: (s: PortfolioStatus) => void }) {
  return (
    <Select value={status} onValueChange={(v) => onChange(v as PortfolioStatus)}>
      <SelectTrigger className="h-9 w-full text-xs">
        <SelectValue placeholder="Status" />
      </SelectTrigger>
      <SelectContent>
        {PORTFOLIO_STATUSES.map((s) => (
          <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function CreatePortfolioDialog({ onCreate }: { onCreate: ReturnType<typeof useUseCaseXStore>["createPortfolio"] }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<PortfolioType>("Quick Wins");
  const [objective, setObjective] = useState("");
  const [dept, setDept] = useState("");
  const [quarter, setQuarter] = useState("");

  const reset = () => { setName(""); setType("Quick Wins"); setObjective(""); setDept(""); setQuarter(""); };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button><Plus className="w-4 h-4 mr-1" /> Create portfolio</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create portfolio</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Q4 Operations Quick Wins" />
          </Field>
          <Field label="Type">
            <Select value={type} onValueChange={(v) => setType(v as PortfolioType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PORTFOLIO_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Objective">
            <Textarea rows={2} value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="Business objective this portfolio addresses" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Target department"><Input value={dept} onChange={(e) => setDept(e.target.value)} placeholder="e.g. Finance" /></Field>
            <Field label="Target quarter"><Input value={quarter} onChange={(e) => setQuarter(e.target.value)} placeholder="e.g. Q1 2027" /></Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            disabled={!name.trim()}
            onClick={() => {
              onCreate({ name: name.trim(), type, objective: objective.trim() || undefined, targetDepartment: dept.trim() || undefined, targetQuarter: quarter.trim() || undefined });
              trackCTAEvent("portfolio_created", { type });
              setOpen(false);
              reset();
            }}
          >Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditPortfolioDialog({ portfolio, store }: { portfolio: Portfolio; store: ReturnType<typeof useUseCaseXStore> }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(portfolio.name);
  const [type, setType] = useState<PortfolioType>(portfolio.type);
  const [objective, setObjective] = useState(portfolio.objective ?? "");
  const [dept, setDept] = useState(portfolio.targetDepartment ?? "");
  const [quarter, setQuarter] = useState(portfolio.targetQuarter ?? "");

  useEffect(() => {
    if (open) {
      setName(portfolio.name);
      setType(portfolio.type);
      setObjective(portfolio.objective ?? "");
      setDept(portfolio.targetDepartment ?? "");
      setQuarter(portfolio.targetQuarter ?? "");
    }
  }, [open, portfolio]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon"><Pencil className="w-4 h-4" /></Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit portfolio</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Type">
            <Select value={type} onValueChange={(v) => setType(v as PortfolioType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PORTFOLIO_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Objective"><Textarea rows={2} value={objective} onChange={(e) => setObjective(e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Target department"><Input value={dept} onChange={(e) => setDept(e.target.value)} /></Field>
            <Field label="Target quarter"><Input value={quarter} onChange={(e) => setQuarter(e.target.value)} /></Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            disabled={!name.trim()}
            onClick={() => {
              store.updatePortfolio(portfolio.id, {
                name: name.trim(),
                type,
                objective: objective.trim() || undefined,
                targetDepartment: dept.trim() || undefined,
                targetQuarter: quarter.trim() || undefined,
              });
              trackCTAEvent("portfolio_updated", { id: portfolio.id });
              setOpen(false);
            }}
          >Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddItemDialog({ portfolio, store }: { portfolio: Portfolio; store: ReturnType<typeof useUseCaseXStore> }) {
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState("");
  const available = store.saved.filter((s) => !portfolio.useCaseSlugs.includes(s.useCaseSlug));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-xs">
          <Plus className="w-3.5 h-3.5 mr-1" /> Add use case
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add saved use case</DialogTitle></DialogHeader>
        <Select value={slug} onValueChange={setSlug}>
          <SelectTrigger><SelectValue placeholder="Choose from your saved use cases" /></SelectTrigger>
          <SelectContent>
            {available.map((s) => {
              const uc = MOCK_USE_CASES.find((u) => u.slug === s.useCaseSlug);
              return uc ? <SelectItem key={s.useCaseSlug} value={s.useCaseSlug}>{uc.title}</SelectItem> : null;
            })}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            disabled={!slug}
            onClick={() => {
              if (!slug) return;
              store.addToPortfolio(portfolio.id, slug);
              trackCTAEvent("portfolio_item_added", { id: portfolio.id, slug });
              setOpen(false);
              setSlug("");
            }}
          >Add</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
