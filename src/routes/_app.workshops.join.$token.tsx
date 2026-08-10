import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { acceptWorkshopInvitationFn } from "@/lib/workshops.functions";

export const Route = createFileRoute("/_app/workshops/join/$token")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "Join a workshop — UseCasesX™" },
      {
        name: "description",
        content:
          "Accept a facilitator invitation to join an AI Discovery & Value Design workshop session.",
      },
      { property: "og:title", content: "Join a workshop — UseCasesX™" },
      {
        property: "og:description",
        content: "Accept your facilitator invitation and join the workshop board.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: JoinWorkshopPage,
});

function JoinWorkshopPage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const [state, setState] = useState<"checking" | "joining" | "signed-out" | "error">("checking");
  const [message, setMessage] = useState("");
  const attempted = useRef(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      if (!data.user) {
        setState("signed-out");
        return;
      }
      if (attempted.current) return;
      attempted.current = true;
      setState("joining");
      try {
        const { workshopId } = await acceptWorkshopInvitationFn({ data: { token } });
        void navigate({ to: "/workshops/$id", params: { id: workshopId }, replace: true });
      } catch (err) {
        if (!active) return;
        setState("error");
        setMessage(err instanceof Error ? err.message : "This invitation could not be accepted.");
      }
    })();
    return () => {
      active = false;
    };
  }, [token, navigate]);

  return (
    <div className="mx-auto max-w-lg py-10">
      <Card>
        <CardHeader>
          <CardTitle>Join workshop</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {state === "checking" || state === "joining" ? (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {state === "checking" ? "Checking your session…" : "Accepting your invitation…"}
            </p>
          ) : state === "signed-out" ? (
            <>
              <p className="text-muted-foreground">
                Sign in with the email address your facilitator invited, then this link will add you
                to the session.
              </p>
              <Button asChild>
                <Link to="/auth" search={{ redirect: `/workshops/join/${token}` }}>
                  Sign in to continue
                </Link>
              </Button>
            </>
          ) : (
            <>
              <p className="text-destructive">{message}</p>
              <Button asChild variant="outline">
                <Link to="/workshops">Back to workshops</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
