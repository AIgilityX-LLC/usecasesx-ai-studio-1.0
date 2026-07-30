/**
 * Contributors on a use case. Names are only resolvable for the signed-in
 * person (profiles are private by policy), so everyone else is shown as a
 * workspace member — we never invent identities.
 */

import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { Badge } from "@/components/ui/badge";

export function ContributorsList({
  ownerUserId,
  contributors,
}: {
  ownerUserId: string | null;
  contributors: string[];
}) {
  const session = useSupabaseSession();
  const me = session?.user?.id ?? null;
  const myName =
    (session?.user?.user_metadata?.full_name as string | undefined) ??
    session?.user?.email ??
    "You";

  const ids = Array.from(new Set([ownerUserId, ...contributors].filter(Boolean) as string[]));

  if (ids.length === 0) {
    return <p className="text-xs text-muted-foreground">No contributors recorded yet.</p>;
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-foreground">People</p>
      <ul className="space-y-1">
        {ids.map((uid) => {
          const isMe = uid === me;
          const label = isMe ? myName : `Workspace member · ${uid.slice(0, 8)}`;
          return (
            <li key={uid} className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate" title={label}>
                {label}
              </span>
              <Badge variant={uid === ownerUserId ? "default" : "outline"} className="shrink-0">
                {uid === ownerUserId ? "Owner" : "Contributor"}
              </Badge>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
