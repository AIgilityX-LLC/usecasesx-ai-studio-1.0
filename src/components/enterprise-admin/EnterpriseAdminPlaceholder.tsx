import { Link } from "@tanstack/react-router";
import { Construction } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EnterpriseAdminSection } from "@/lib/enterprise-admin/sections";

/**
 * Honest placeholder — no fake metrics, no client-side auth theatre.
 */
export function EnterpriseAdminPlaceholder({ section }: { section: EnterpriseAdminSection }) {
  return (
    <Card className="border-dashed">
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">Integration pending</Badge>
          {section.todoInterface ? (
            <code className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
              {section.todoInterface}
            </code>
          ) : null}
        </div>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Construction className="h-5 w-5 text-muted-foreground" aria-hidden />
          {section.label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <p>{section.description}</p>
        <p>
          This section is labelled as planned. Administration actions will call authenticated
          server functions only — the UI does not mock authorization or invent privileged
          APIs.
        </p>
        {section.relatedTo ? (
          <Button asChild variant="outline" size="sm">
            <Link to={section.relatedTo as "/dashboard"}>Open related surface</Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
