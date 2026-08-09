import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { acceptInvitationFn } from "@/lib/collab.functions";

export const Route = createFileRoute("/_app/invite/$token")({
  head: () => ({
    meta: [
      { title: "Join a workspace — UseCasesX™" },
      {
        name: "description",
        content: "Accept your invitation to collaborate in a UseCasesX workspace.",
      },
      { property: "og:title", content: "Join a workspace — UseCasesX™" },
      {
        property: "og:description",
        content: "Accept your invitation to collaborate in a UseCasesX workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: JoinWorkspacePage,
});

function JoinWorkspacePage() {
  const { token } = Route.useParams();
  const session = useSupabaseSession();
  const navigate = useNavigate();
  const accept = useServerFn(acceptInvitationFn);
  const [state, setState] = useState<"idle" | "joining" | "joined" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!session || state !== "idle") return;
    setState("joining");
    accept({ data: { token } })
      .then(() => setState("joined"))
      .catch((e: unknown) => {
        setMessage(e instanceof Error ? e.message : "This invitation could not be accepted.");
        setState("error");
      });
  }, [session, state, token, accept]);

  return (
    <div className="mx-auto max-w-[640px] px-6 py-16">
      <Card>
        <CardHeader>
          <CardTitle>Join a workspace</CardTitle>
          <CardDescription>
            Invitations give access to one workspace only, and expire automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {session === undefined && <p className="text-muted-foreground">Checking your session…</p>}

          {session === null && (
            <>
              <p className="text-muted-foreground">
                Sign in or create an account with the invited email address to accept this
                invitation.
              </p>
              <Button asChild>
                <Link to="/auth">Sign in to continue</Link>
              </Button>
            </>
          )}

          {session && state === "joining" && (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Accepting your invitation…
            </p>
          )}

          {session && state === "joined" && (
            <>
              <p>You are in. Your teammate&apos;s workspace is now available to you.</p>
              <Button onClick={() => navigate({ to: "/dashboard" })}>Go to the workspace</Button>
            </>
          )}

          {session && state === "error" && (
            <>
              <p className="text-destructive">{message}</p>
              <Button asChild variant="secondary">
                <Link to="/dashboard">Back to my workspace</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
