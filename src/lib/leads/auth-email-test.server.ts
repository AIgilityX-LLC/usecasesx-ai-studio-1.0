/**
 * Server-only helpers for branded auth-email verification: triggers one real
 * auth email through the project's auth service (which renders the branded
 * templates) and reads back the delivery events Lovable recorded for it.
 */
import { createClient } from "@supabase/supabase-js";
import { EmailAPIError, listEmailLogs, type EmailEvent } from "@lovable.dev/email-js";

export type AuthTestEmailType = "magiclink" | "recovery";

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const url = process.env["SUPABASE_URL"]!;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

export interface AuthTestSendResult {
  type: AuthTestEmailType;
  recipient: string;
  requestedAt: string;
  accepted: boolean;
  message: string;
}

/** Asks the auth service to send one branded auth email to `recipient`. */
export async function sendAuthTestEmail(
  type: AuthTestEmailType,
  recipient: string,
  redirectTo: string,
): Promise<AuthTestSendResult> {
  const supabase = publicClient();
  const requestedAt = new Date().toISOString();

  const { error } =
    type === "recovery"
      ? await supabase.auth.resetPasswordForEmail(recipient, { redirectTo })
      : await supabase.auth.signInWithOtp({
          email: recipient,
          options: { shouldCreateUser: false, emailRedirectTo: redirectTo },
        });

  return {
    type,
    recipient,
    requestedAt,
    accepted: !error,
    message: error
      ? error.message
      : type === "recovery"
        ? "Password reset email requested — check delivery events below."
        : "Magic-link email requested — check delivery events below.",
  };
}

export interface AuthEmailLogResult {
  events: EmailEvent[];
  historyStartsAt: string | null;
  note: string | null;
}

/** Delivery events recorded for one recipient (or the whole project). */
export async function readAuthEmailLogs(
  recipient?: string,
  limit = 25,
): Promise<AuthEmailLogResult> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) {
    return { events: [], historyStartsAt: null, note: "Email logs are unavailable in this environment." };
  }
  try {
    const response = await listEmailLogs(
      { ...(recipient ? { recipient } : {}), limit },
      { apiKey },
    );
    return {
      events: response.data ?? [],
      historyStartsAt: response.history_starts_at ?? null,
      note: null,
    };
  } catch (error) {
    const message =
      error instanceof EmailAPIError
        ? `${error.code}: ${error.message}`
        : error instanceof Error
          ? error.message
          : "Unknown error";
    return { events: [], historyStartsAt: null, note: message };
  }
}
