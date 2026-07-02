import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { PageHero } from "@/components/usecasex/PageHero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, MousePointerClick, Lock, Unlock } from "lucide-react";
import { moduleLabel, type ModuleEventType } from "@/lib/module-analytics";

export const Route = createFileRoute("/_app/module-analytics")({
  head: () => ({
    meta: [
      { title: "Module Analytics — UseCasesX™" },
      { name: "description", content: "See views, clicks, and lock/unlock attempts across your UseCasesX modules." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ModuleAnalyticsPage,
});

type Ev = { module_key: string; event_type: ModuleEventType; created_at: string; metadata: Record<string, unknown> | null };
type Agg = { key: string; view: number; click: number; lock_attempt: number; unlock_attempt: number; total: number };

function ModuleAnalyticsPage() {
  const session = useSupabaseSession();
  const [events, setEvents] = useState<Ev[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("module_events")
      .select("module_key, event_type, created_at, metadata")
      .order("created_at", { ascending: false })
      .limit(5000);
    setEvents((data as Ev[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { if (session) load(); else if (session === null) setLoading(false); }, [session]);

  const { rows, totals, interactions } = useMemo(() => {
    const map = new Map<string, Agg>();
    const t = { view: 0, click: 0, lock_attempt: 0, unlock_attempt: 0 };
    const ix = new Map<string, number>();
    for (const e of events) {
      const a = map.get(e.module_key) ?? { key: e.module_key, view: 0, click: 0, lock_attempt: 0, unlock_attempt: 0, total: 0 };
      a[e.event_type] = (a[e.event_type] ?? 0) + 1;
      a.total += 1;
      map.set(e.module_key, a);
      if (e.event_type in t) t[e.event_type as keyof typeof t] += 1;
      const label = typeof e.metadata?.interaction === "string" ? (e.metadata.interaction as string) : null;
      if (label) ix.set(label, (ix.get(label) ?? 0) + 1);
    }
    return {
      rows: [...map.values()].sort((a, b) => b.total - a.total),
      totals: t,
      interactions: [...ix.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count),
    };
  }, [events]);

  if (session === null) {
    return (
      <>
        <PageHero tone="dark" eyebrow="Analytics" title="Module analytics" description="Sign in to view engagement across your modules." />
        <div className="mx-auto max-w-2xl px-6 py-16 text-center"><Button asChild><Link to="/auth">Sign in</Link></Button></div>
      </>
    );
  }

  const cards = [
    { label: "Views", value: totals.view, icon: Eye },
    { label: "Clicks", value: totals.click, icon: MousePointerClick },
    { label: "Lock attempts", value: totals.lock_attempt, icon: Lock },
    { label: "Unlock attempts", value: totals.unlock_attempt, icon: Unlock },
  ];
  const maxTotal = Math.max(1, ...rows.map((r) => r.total));

  return (
    <>
      <PageHero
        tone="dark"
        eyebrow="Analytics · Engagement"
        title="Module engagement analytics"
        description="Understand which UseCasesX modules drive engagement — views, clicks, and lock/unlock attempts."
      />
      <section className="bg-background">
        <div className="mx-auto max-w-[1200px] space-y-8 px-6 py-12">
          <div className="grid gap-4 sm:grid-cols-4">
            {cards.map((c) => (
              <Card key={c.label}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm text-muted-foreground">{c.label}</CardTitle>
                  <c.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold">{c.value.toLocaleString()}</div></CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Engagement by module</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
              ) : rows.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No engagement recorded yet. Interact with modules to populate analytics.</p>
              ) : (
                <div className="space-y-4">
                  {rows.map((r) => (
                    <div key={r.key}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{moduleLabel(r.key)}</span>
                        <span className="text-muted-foreground">{r.total.toLocaleString()} events</span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${(r.total / maxTotal) * 100}%` }} />
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                        <span>{r.view} views</span>
                        <span>{r.click} clicks</span>
                        <span>{r.lock_attempt} lock</span>
                        <span>{r.unlock_attempt} unlock</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
}
