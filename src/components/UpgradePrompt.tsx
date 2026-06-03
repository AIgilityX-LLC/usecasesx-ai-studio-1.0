import { Link } from "@tanstack/react-router";
import { Lock, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Props = {
  feature: string;
  tier?: "Pro" | "Enterprise";
  description?: string;
  className?: string;
};

export function UpgradePrompt({ feature, tier = "Pro", description, className }: Props) {
  return (
    <Card className={`border-dashed bg-gradient-to-br from-primary/5 to-transparent ${className ?? ""}`}>
      <CardContent className="flex flex-col items-start gap-3 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-primary/15 p-2 text-primary">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{feature}</h3>
              <span className="inline-flex items-center gap-1 rounded bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                <Sparkles className="h-3 w-3" /> {tier}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {description ?? `Upgrade to ${tier} to unlock ${feature}.`}
            </p>
          </div>
        </div>
        <Button asChild>
          <Link to="/pricing">Upgrade to {tier}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
