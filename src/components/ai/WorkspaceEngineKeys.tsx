/**
 * Workspace-level research engine keys.
 *
 * Workspace owners and admins can store their own provider key for an engine
 * the platform allows. Keys are write-only from the browser's point of view.
 */

import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  clearWorkspaceEngineKeyFn,
  listStudioEnginesFn,
  saveWorkspaceEngineKeyFn,
} from "@/lib/ai/engines.functions";
import type { EngineSummary } from "@/lib/ai/engines";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export function WorkspaceEngineKeys() {
  const load = useServerFn(listStudioEnginesFn);
  const save = useServerFn(saveWorkspaceEngineKeyFn);
  const clear = useServerFn(clearWorkspaceEngineKeyFn);

  const [engines, setEngines] = useState<EngineSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await load({ data: {} as never });
      setEngines(res.engines.filter((e) => e.allowWorkspaceKeys && e.route !== "gateway"));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [load]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-4 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading engines…
      </div>
    );
  }

  if (engines.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your own AI engine keys</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No engine currently accepts a workspace key. The Studio uses the platform default engine.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Your own AI engine keys</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Add your organization&apos;s provider key to run Studio research on your own account. Keys
          are encrypted and never shown again.
        </p>
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        {engines.map((engine) => (
          <div key={engine.slug} className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{engine.label}</span>
              {engine.hasWorkspaceKey ? (
                <Badge variant="secondary">Workspace key {engine.workspaceKeyHint}</Badge>
              ) : (
                <Badge variant="outline">No workspace key</Badge>
              )}
            </div>
            <Label htmlFor={`ws-key-${engine.slug}`} className="sr-only">
              API key for {engine.label}
            </Label>
            <div className="flex flex-wrap gap-2">
              <Input
                id={`ws-key-${engine.slug}`}
                type="password"
                autoComplete="off"
                placeholder="Paste your provider API key"
                className="max-w-md"
                value={drafts[engine.slug] ?? ""}
                onChange={(e) => setDrafts((p) => ({ ...p, [engine.slug]: e.target.value }))}
              />
              <Button
                size="sm"
                disabled={busy === engine.slug || (drafts[engine.slug] ?? "").trim().length < 8}
                onClick={async () => {
                  setBusy(engine.slug);
                  setMessage(null);
                  try {
                    await save({
                      data: { slug: engine.slug, apiKey: (drafts[engine.slug] ?? "").trim() },
                    });
                    setDrafts((p) => ({ ...p, [engine.slug]: "" }));
                    setMessage(`${engine.label} key saved.`);
                    await refresh();
                  } catch (error) {
                    setMessage(error instanceof Error ? error.message : "Could not save the key.");
                  } finally {
                    setBusy(null);
                  }
                }}
              >
                Save key
              </Button>
              {engine.hasWorkspaceKey ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy === engine.slug}
                  onClick={async () => {
                    setBusy(engine.slug);
                    try {
                      await clear({ data: { slug: engine.slug } });
                      await refresh();
                    } finally {
                      setBusy(null);
                    }
                  }}
                >
                  Remove
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
