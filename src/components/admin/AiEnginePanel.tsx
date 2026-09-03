/**
 * Research engine control panel.
 *
 * Platform admins pick the default engine, enable or disable engines, store
 * provider API keys (write-only — the browser only ever sees a masked hint)
 * and run a live connection test.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  clearPlatformEngineKeyFn,
  listEngineAdminFn,
  saveEngineFn,
  savePlatformEngineKeyFn,
  setDefaultEngineFn,
  testEngineFn,
  toggleEngineFn,
} from "@/lib/ai/engines.functions";
import type { EngineSummary } from "@/lib/ai/engines";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Loader2, KeyRound, Plug, Star, Trash2 } from "lucide-react";

type UsageRow = { providerAlias: string; calls: number; failures: number; avgLatencyMs: number };

export function AiEnginePanel() {
  const load = useServerFn(listEngineAdminFn);
  const saveKey = useServerFn(savePlatformEngineKeyFn);
  const clearKey = useServerFn(clearPlatformEngineKeyFn);
  const toggle = useServerFn(toggleEngineFn);
  const makeDefault = useServerFn(setDefaultEngineFn);
  const test = useServerFn(testEngineFn);
  const saveEngine = useServerFn(saveEngineFn);

  const [engines, setEngines] = useState<EngineSummary[]>([]);
  const [usage, setUsage] = useState<UsageRow[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [keyDrafts, setKeyDrafts] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    try {
      const res = await load({ data: {} as never });
      setEngines(res.engines);
      setUsage(res.usage);
      setStatus("ready");
    } catch (error) {
      console.error(error);
      setStatus("error");
    }
  }, [load]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const usageBySlug = useMemo(() => {
    const map = new Map<string, UsageRow>();
    for (const row of usage) map.set(row.providerAlias, row);
    return map;
  }, [usage]);

  async function withBusy(slug: string, action: () => Promise<void>) {
    setBusy(slug);
    setMessage(null);
    try {
      await action();
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action failed.");
    } finally {
      setBusy(null);
    }
  }

  if (status === "loading") {
    return (
      <div className="flex items-center gap-2 text-muted-foreground p-6">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading research engines…
      </div>
    );
  }

  if (status === "error") {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Research engines could not be loaded. Only platform admins can view this panel.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Choose which research engines the Studio may use. Keys are encrypted before storage and are
        never returned to the browser.
      </div>
      {message ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {message}
        </div>
      ) : null}

      <div className="grid gap-4">
        {engines.map((engine) => {
          const stats = usageBySlug.get(engine.slug);
          const external = engine.route !== "gateway";
          return (
            <Card key={engine.slug}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base">{engine.label}</CardTitle>
                  {engine.isDefault ? <Badge>Default</Badge> : null}
                  <Badge variant={engine.enabled ? "secondary" : "outline"}>
                    {engine.enabled ? "Enabled" : "Disabled"}
                  </Badge>
                  <Badge variant="outline">{external ? "External API" : "Built-in"}</Badge>
                  {external && !engine.hasPlatformKey ? (
                    <Badge variant="outline">No key stored</Badge>
                  ) : null}
                </div>
                <p className="text-sm text-muted-foreground">
                  {engine.tagline ?? engine.provider} · model {engine.modelId}
                  {engine.baseUrl ? ` · ${engine.baseUrl}` : ""}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`enabled-${engine.slug}`}
                      checked={engine.enabled}
                      disabled={busy === engine.slug}
                      onCheckedChange={(checked) =>
                        withBusy(engine.slug, async () => {
                          await toggle({ data: { slug: engine.slug, enabled: checked } });
                        })
                      }
                    />
                    <Label htmlFor={`enabled-${engine.slug}`}>Available to users</Label>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={engine.isDefault || busy === engine.slug}
                    onClick={() =>
                      withBusy(engine.slug, async () => {
                        await makeDefault({ data: { slug: engine.slug } });
                      })
                    }
                  >
                    <Star className="mr-2 h-4 w-4" /> Make default
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy === engine.slug}
                    onClick={() =>
                      withBusy(engine.slug, async () => {
                        const res = await test({ data: { slug: engine.slug } });
                        setResults((prev) => ({ ...prev, [engine.slug]: res.message }));
                      })
                    }
                  >
                    <Plug className="mr-2 h-4 w-4" /> Test connection
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy === engine.slug}
                    onClick={() =>
                      withBusy(engine.slug, async () => {
                        await saveEngine({
                          data: {
                            slug: engine.slug,
                            label: engine.label,
                            provider: engine.provider,
                            tagline: engine.tagline,
                            route: engine.route,
                            modelId: engine.modelId,
                            baseUrl: engine.baseUrl,
                            tier: engine.tier as "fast" | "balanced" | "deep",
                            enabled: engine.enabled,
                            allowWorkspaceKeys: !engine.allowWorkspaceKeys,
                            fallbackToDefault: engine.fallbackToDefault,
                            editions: engine.editions as never,
                            sortOrder: engine.sortOrder,
                          },
                        });
                      })
                    }
                  >
                    {engine.allowWorkspaceKeys ? "Disallow workspace keys" : "Allow workspace keys"}
                  </Button>
                </div>

                {results[engine.slug] ? (
                  <p className="text-sm text-muted-foreground">{results[engine.slug]}</p>
                ) : null}

                {external ? (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <Label htmlFor={`key-${engine.slug}`} className="flex items-center gap-2">
                        <KeyRound className="h-4 w-4" /> Platform API key
                        {engine.platformKeyHint ? (
                          <span className="text-muted-foreground">
                            stored {engine.platformKeyHint}
                          </span>
                        ) : null}
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        <Input
                          id={`key-${engine.slug}`}
                          type="password"
                          autoComplete="off"
                          placeholder="Paste the provider API key"
                          className="max-w-md"
                          value={keyDrafts[engine.slug] ?? ""}
                          onChange={(e) =>
                            setKeyDrafts((prev) => ({ ...prev, [engine.slug]: e.target.value }))
                          }
                        />
                        <Button
                          size="sm"
                          disabled={
                            busy === engine.slug || (keyDrafts[engine.slug] ?? "").trim().length < 8
                          }
                          onClick={() =>
                            withBusy(engine.slug, async () => {
                              await saveKey({
                                data: {
                                  slug: engine.slug,
                                  apiKey: (keyDrafts[engine.slug] ?? "").trim(),
                                },
                              });
                              setKeyDrafts((prev) => ({ ...prev, [engine.slug]: "" }));
                            })
                          }
                        >
                          Save key
                        </Button>
                        {engine.hasPlatformKey ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy === engine.slug}
                            onClick={() =>
                              withBusy(engine.slug, async () => {
                                await clearKey({ data: { slug: engine.slug } });
                              })
                            }
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Remove
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </>
                ) : null}

                {stats ? (
                  <p className="text-xs text-muted-foreground">
                    Last 30 days: {stats.calls} calls · {stats.failures} failures · avg{" "}
                    {stats.avgLatencyMs} ms
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">No usage recorded yet.</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
