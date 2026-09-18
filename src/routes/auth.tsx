import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Fingerprint,
  Layers3,
  Lock,
  Mail,
  User,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  PLATFORM_PASSWORD_MIN_LENGTH,
  describeSignInError,
  validatePlatformPassword,
  validateSignInForm,
} from "@/lib/admin/password-policy";

/** `redirect` + `intent` let a signed-out action resume after sign-in. */
const authSearchSchema = z.object({
  redirect: fallback(z.string().optional(), undefined),
  intent: fallback(z.string().optional(), undefined),
});

export const Route = createFileRoute("/auth")({
  validateSearch: zodValidator(authSearchSchema),
  head: () => ({
    meta: [
      { title: "Sign In — UseCasesX™" },
      {
        name: "description",
        content: "Sign in to UseCasesX™ — Global AI Use Cases Repository & Development Studio.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { name: "googlebot", content: "noindex, nofollow" },
    ],
  }),
  component: AuthPage,
});

const CHECKS = [
  "Make the problem, outcome, and owner explicit",
  "Build a credible value and feasibility hypothesis",
  "Carry evidence from first signal to decision",
] as const;

function AuthPage() {
  const navigate = useNavigate();
  const { redirect, intent } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) return;
      const safeRedirect =
        redirect && redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : null;
      if (safeRedirect) {
        navigate({
          to: safeRedirect,
          search: intent ? ({ intent } as never) : undefined,
          replace: true,
        });
        return;
      }
      navigate({ to: "/onboarding", replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate, redirect, intent]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === "signup" && !name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (mode === "signup" && !agreed) {
      setError("Please agree to the Terms of Use and Privacy Notice.");
      return;
    }

    const formErrors = validateSignInForm(email, password);
    if (mode === "signup") {
      const policy = validatePlatformPassword(password, { email });
      if (!policy.ok) formErrors.push(...policy.errors);
    }
    if (formErrors.length > 0) {
      setError(formErrors.join(" "));
      return;
    }

    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name.trim() },
          },
        });
        if (error) throw error;
      }
    } catch (err) {
      setError(describeSignInError(err));
    } finally {
      setLoading(false);
    }
  };

  const isSignup = mode === "signup";

  return (
    <div className="ux-auth">
      <aside className="ux-auth-panel" aria-hidden={false}>
        <div className="ux-auth-panel-inner">
          <div className="ux-auth-panel-top">
            <Link to="/" className="ux-auth-brand" aria-label="UseCasesX Studio home">
              <span className="ux-auth-brand-mark" aria-hidden>
                <span />
                <span />
                <span />
              </span>
              <span className="ux-auth-brand-text">
                UseCasesX™ <b>|</b> AI Use Case Studio™
              </span>
            </Link>
            <span className="ux-auth-version">v1.0 / Early Access</span>
          </div>

          <div className="ux-auth-eyebrow">
            <i aria-hidden /> AI Use Cases, Made Operational
          </div>

          <h1 className="ux-auth-headline">
            Build AI <span className="ux-auth-accent">use cases</span> that hold up.
          </h1>
          <p className="ux-auth-sub">
            Move from curiosity to governed, measurable action — without the guesswork.
          </p>

          <div className="ux-auth-os-card">
            <div className="ux-auth-os-top">
              <span className="ux-auth-os-label">
                <Layers3 size={14} strokeWidth={1.75} aria-hidden />
                AI Use Case Operating System
              </span>
              <span className="ux-auth-live">
                <i aria-hidden /> Live
              </span>
            </div>
            <div className="ux-auth-segments" aria-hidden>
              {Array.from({ length: 8 }).map((_, i) => (
                <span key={i} />
              ))}
            </div>
            <p className="ux-auth-os-foot">
              From discovery → to <strong>governed value</strong>
            </p>
          </div>

          <ul className="ux-auth-checks">
            {CHECKS.map((item) => (
              <li key={item}>
                <CheckCircle2 size={18} strokeWidth={1.75} aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <section className="ux-auth-form-panel">
        <div className="ux-auth-form-top">
          <Link to="/" className="ux-auth-back">
            <ArrowLeft size={15} aria-hidden /> Back to studio
          </Link>
          <span className="ux-auth-private">
            <Lock size={12} aria-hidden /> Private By Design
          </span>
        </div>

        <div className="ux-auth-form-wrap">
          <div className="ux-auth-icon" aria-hidden>
            <Fingerprint size={22} strokeWidth={1.6} />
          </div>
          <p className="ux-auth-kicker">Begin Your Practice</p>
          <h2 className="ux-auth-form-title">
            {isSignup ? "Build your point of view." : "Welcome back."}
          </h2>
          <p className="ux-auth-form-lead">
            {isSignup
              ? "Create an account to make the signal useful."
              : "Sign in to continue your practice."}
          </p>

          <div className="ux-auth-tabs" role="tablist" aria-label="Authentication mode">
            <button
              type="button"
              role="tab"
              aria-selected={!isSignup}
              className={!isSignup ? "is-active" : undefined}
              onClick={() => {
                setMode("signin");
                setError(null);
              }}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isSignup}
              className={isSignup ? "is-active" : undefined}
              onClick={() => {
                setMode("signup");
                setError(null);
              }}
            >
              Create account
            </button>
          </div>

          <form onSubmit={onSubmit} noValidate>
            {isSignup ? (
              <div className="ux-auth-field">
                <label htmlFor="auth-name">Your name</label>
                <div className="ux-auth-input">
                  <User size={16} strokeWidth={1.75} aria-hidden />
                  <input
                    id="auth-name"
                    type="text"
                    autoComplete="name"
                    placeholder="e.g. Alex Morgan"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>
            ) : null}

            <div className="ux-auth-field">
              <label htmlFor="auth-email">Work email</label>
              <div className="ux-auth-input">
                <Mail size={16} strokeWidth={1.75} aria-hidden />
                <input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="ux-auth-field">
              <label htmlFor="auth-password">Password</label>
              <div className="ux-auth-input">
                <Lock size={16} strokeWidth={1.75} aria-hidden />
                <input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  minLength={isSignup ? PLATFORM_PASSWORD_MIN_LENGTH : 8}
                  placeholder={isSignup ? "8+ characters" : "Your password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="ux-auth-eye"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? (
                    <EyeOff size={16} strokeWidth={1.75} aria-hidden />
                  ) : (
                    <Eye size={16} strokeWidth={1.75} aria-hidden />
                  )}
                </button>
              </div>
            </div>

            {isSignup ? (
              <label className="ux-auth-terms">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                />
                <span>
                  I agree to the <Link to="/terms">Terms of Use</Link> and{" "}
                  <Link to="/privacy">Privacy Notice</Link>.
                </span>
              </label>
            ) : null}

            {error ? (
              <p className="ux-auth-error" role="alert">
                {error}
              </p>
            ) : null}

            <button type="submit" className="ux-auth-submit" disabled={loading}>
              <span>{loading ? "…" : isSignup ? "Create my account" : "Sign in"}</span>
              <span className="ux-auth-submit-icon" aria-hidden>
                <ArrowUpRight size={15} strokeWidth={2.25} />
              </span>
            </button>
          </form>

          {!isSignup ? (
            <p className="ux-auth-forgot">
              <Link to="/forgot-password">Forgot your password?</Link>
            </p>
          ) : null}

          <p className="ux-auth-footnote">No credit card. No noise. Just better decisions.</p>
        </div>
      </section>
    </div>
  );
}
