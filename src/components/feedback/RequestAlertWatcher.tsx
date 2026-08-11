import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import {
  listMyRequestAlertsFn,
  markRequestAlertsReadFn,
} from "@/lib/feedback/feedback.functions";
import { feedbackStatusLabel } from "@/lib/feedback/feedback.model";

/**
 * In-app alert for "your request moved to a new status".
 *
 * Mounted once in the signed-in shell: it reads the reporter's unread status
 * alerts, raises one toast per change and marks them read so the same move is
 * never announced twice. Reporters who miss the toast still see the full list
 * on /support, so nothing depends on the toast being seen.
 */
export function RequestAlertWatcher({ enabled }: { enabled: boolean }) {
  const loadAlerts = useServerFn(listMyRequestAlertsFn);
  const markRead = useServerFn(markRequestAlertsReadFn);
  const announced = useRef(new Set<string>());

  const alerts = useQuery({
    queryKey: ["my-request-alerts", "unread"],
    queryFn: () => loadAlerts(),
    enabled,
    retry: false,
    refetchOnWindowFocus: true,
    staleTime: 60_000,
  });

  useEffect(() => {
    const unread = (alerts.data ?? []).filter(
      (alert) => !alert.readAt && !announced.current.has(alert.id),
    );
    if (unread.length === 0) return;
    for (const alert of unread) {
      announced.current.add(alert.id);
      toast.info(`Request ${alert.feedbackId.slice(0, 8).toUpperCase()} is now “${feedbackStatusLabel(alert.toStatus)}”`, {
        description: alert.note ?? "Open Support to see the full history.",
      });
    }
    void markRead({ data: { ids: unread.slice(0, 50).map((alert) => alert.id) } }).catch(() => {
      // Read receipts are cosmetic: a failure must not break the page.
    });
  }, [alerts.data, markRead]);

  return null;
}
