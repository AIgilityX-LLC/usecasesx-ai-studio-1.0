import { useCallback, useEffect, useMemo, useState } from "react";
import * as adminRepo from "@/lib/domain/admin.repository";
import type { GlobalAuditEntry } from "@/lib/domain/admin.repository";
import { toUserMessage } from "@/lib/domain/errors";
import { usePlatformAdmin } from "@/lib/admin/platform-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Read-only audit trail for global catalogue changes. */
export function GlobalAuditViewer() {
  const { isPlatformAdmin } = usePlatformAdmin();
  const [rows, setRows] = useState<GlobalAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await adminRepo.listGlobalContentAudit(300));
      setError(null);
    } catch (e) {
      setError(toUserMessage(e, "We could not load the audit trail."));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const actions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.action))).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (actionFilter !== "all" && r.action !== actionFilter) return false;
      if (q && !`${r.title} ${r.slug} ${r.detail ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, query, actionFilter]);

  if (!isPlatformAdmin) {
    return (
      <p className="text-sm text-muted-foreground">
        You need platform-admin access to view the global content audit trail.
      </p>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between gap-3">
          <span>Global content audit</span>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, slug or note…"
            className="h-9 max-w-sm text-xs"
            aria-label="Search audit trail"
          />
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="h-9 w-48 text-xs" aria-label="Filter by action">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                All actions
              </SelectItem>
              {actions.map((a) => (
                <SelectItem key={a} value={a} className="text-xs">
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        {loading && <p className="text-xs text-muted-foreground">Loading audit entries…</p>}

        {!loading && filtered.length === 0 && !error && (
          <p className="text-xs text-muted-foreground">
            No audit entries match your filters yet.
          </p>
        )}

        {filtered.length > 0 && (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">When</th>
                  <th className="px-3 py-2 font-medium">Record</th>
                  <th className="px-3 py-2 font-medium">Action</th>
                  <th className="px-3 py-2 font-medium">Note</th>
                  <th className="px-3 py-2 font-medium">Actor</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t align-top">
                    <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{r.title}</div>
                      {r.slug && <div className="text-xs text-muted-foreground">/{r.slug}</div>}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className="text-[10px]">
                        {r.action}
                      </Badge>
                      {r.restorable && (
                        <Badge variant="secondary" className="ml-1 text-[10px]">
                          snapshot
                        </Badge>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{r.detail ?? "—"}</td>
                    <td className="px-3 py-2 text-[10px] text-muted-foreground">
                      {r.actorId ? `${r.actorId.slice(0, 8)}…` : "system"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
