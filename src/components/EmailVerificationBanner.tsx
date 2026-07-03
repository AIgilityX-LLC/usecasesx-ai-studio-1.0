import { useState } from "react";
import { MailWarning } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";

/**
 * Shown to signed-in users whose email is not yet confirmed. Nudges them to
 * verify before relying on the platform, with a one-click resend.
 */
export function EmailVerificationBanner() {
  const session = useSupabaseSession();
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  if (!session) return null;
  if (session.user.email_confirmed_at) return null;
  const email = session.user.email;
  if (!email) return null;

  const resend = async () => {
    setSending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    setSending(false);
    if (!error) setSent(true);
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-sm text-amber-700 dark:text-amber-300">
      <span className="inline-flex items-center gap-2">
        <MailWarning className="h-4 w-4" />
        Please verify <span className="font-semibold">{email}</span> to secure full access.
      </span>
      {sent ? (
        <span className="font-semibold">Verification email sent.</span>
      ) : (
        <button
          onClick={resend}
          disabled={sending}
          className="font-semibold underline underline-offset-2 hover:opacity-80 disabled:opacity-50"
        >
          {sending ? "Sending…" : "Resend verification email"}
        </button>
      )}
    </div>
  );
}