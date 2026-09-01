/**
 * Platform administrator credential policy (pure).
 *
 * SuperAdmin accounts hold global publishing and role-granting power, so they
 * carry a stricter complexity bar and a rotation window than ordinary member
 * accounts. Everything here is deterministic and side-effect free so the same
 * rules can be enforced in the browser form, in the server function and in
 * tests.
 */

export const PLATFORM_PASSWORD_MIN_LENGTH = 14;
export const PLATFORM_PASSWORD_MAX_LENGTH = 72; // bcrypt input limit
/** Maximum age of a platform-admin password before rotation is overdue. */
export const PLATFORM_PASSWORD_MAX_AGE_DAYS = 90;
/** Days before expiry where the console starts asking for a rotation. */
export const PLATFORM_PASSWORD_WARN_DAYS = 15;

const BANNED_FRAGMENTS = [
  "password",
  "usecasesx",
  "aigility",
  "superadmin",
  "super-admin",
  "admin123",
  "welcome",
  "qwerty",
  "letmein",
  "demo#",
  "demo@",
  "changeme",
];

export const PLATFORM_PASSWORD_RULES: string[] = [
  `At least ${PLATFORM_PASSWORD_MIN_LENGTH} characters`,
  "An upper-case and a lower-case letter",
  "At least one digit",
  "At least one symbol (for example ! ? # % _ -)",
  "No part of the account email address",
  "No product name, common word or repeated run of characters",
];

export type PasswordCheck = { id: string; label: string; ok: boolean };

export type PasswordValidation = {
  ok: boolean;
  /** Every rule with its pass/fail state, for a live requirement list. */
  checks: PasswordCheck[];
  /** Only the failed rules, phrased as validation errors. */
  errors: string[];
  /** 0–100 indicative strength; never a substitute for the rules. */
  strength: number;
};

function emailFragments(email: string | undefined): string[] {
  if (!email) return [];
  const [local = "", domain = ""] = email.toLowerCase().split("@");
  return [local, domain.split(".")[0] ?? ""]
    .flatMap((part) => part.split(/[^a-z0-9]+/))
    .filter((part) => part.length >= 4);
}

/**
 * Validates a platform-admin password against the complexity policy.
 * `confirm` is optional; when provided a mismatch is reported as a rule.
 */
export function validatePlatformPassword(
  password: string,
  options: { email?: string; confirm?: string } = {},
): PasswordValidation {
  const value = password ?? "";
  const lowered = value.toLowerCase();
  const fragments = emailFragments(options.email);

  const checks: PasswordCheck[] = [
    {
      id: "length",
      label: `At least ${PLATFORM_PASSWORD_MIN_LENGTH} characters`,
      ok: value.length >= PLATFORM_PASSWORD_MIN_LENGTH,
    },
    {
      id: "max-length",
      label: `No longer than ${PLATFORM_PASSWORD_MAX_LENGTH} characters`,
      ok: value.length <= PLATFORM_PASSWORD_MAX_LENGTH,
    },
    { id: "upper", label: "Contains an upper-case letter", ok: /[A-Z]/.test(value) },
    { id: "lower", label: "Contains a lower-case letter", ok: /[a-z]/.test(value) },
    { id: "digit", label: "Contains a digit", ok: /[0-9]/.test(value) },
    {
      id: "symbol",
      label: "Contains a symbol (for example ! ? # % _ -)",
      ok: /[^A-Za-z0-9]/.test(value),
    },
    { id: "no-spaces", label: "No leading or trailing spaces", ok: value.trim() === value },
    {
      id: "no-email",
      label: "Does not reuse part of the account email address",
      ok: value.length > 0 && !fragments.some((fragment) => lowered.includes(fragment)),
    },
    {
      id: "no-common",
      label: "No product name or common word",
      ok: value.length > 0 && !BANNED_FRAGMENTS.some((fragment) => lowered.includes(fragment)),
    },
    {
      id: "no-repeat",
      label: "No character repeated three times in a row",
      ok: value.length > 0 && !/(.)\1{2,}/.test(value),
    },
  ];

  if (options.confirm !== undefined) {
    checks.push({
      id: "confirm",
      label: "Both password fields match",
      ok: value.length > 0 && value === options.confirm,
    });
  }

  const classes = [/[A-Z]/, /[a-z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) => re.test(value)).length;
  const unique = new Set(value).size;
  const strength = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        Math.min(value.length, 24) * 2.5 +
          classes * 7 +
          Math.min(unique, 20) * 1.5 -
          (value ? 0 : 0),
      ),
    ),
  );

  const failed = checks.filter((check) => !check.ok);
  return {
    ok: failed.length === 0,
    checks,
    errors: failed.map((check) => check.label),
    strength: value.length === 0 ? 0 : strength,
  };
}

/** Cryptographically random password that satisfies the policy. */
export function generatePlatformPassword(length = 18): string {
  const sets = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnopqrstuvwxyz", "23456789", "!?#%_-+=@"];
  const alphabet = sets.join("");
  const size = Math.max(PLATFORM_PASSWORD_MIN_LENGTH, length);
  const bytes = new Uint32Array(size * 2);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 0xffffffff);
  }
  let cursor = 0;
  const pick = (chars: string) => chars[(bytes[cursor++] ?? 0) % chars.length] ?? "x";

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const required = sets.map((set) => pick(set));
    const rest = Array.from({ length: size - required.length }, () => pick(alphabet));
    const candidate = [...required, ...rest].join("");
    if (validatePlatformPassword(candidate).ok) return candidate;
  }
  // Deterministic, policy-satisfying fallback with random tail.
  return `Ux9${pick(alphabet)}${pick(alphabet)}!${pick(alphabet)}q7Zt${pick(alphabet)}m3`;
}

/* ------------------------------------------------------------- rotation */

export type RotationStatus = "current" | "due-soon" | "overdue" | "unknown";

export type RotationState = {
  status: RotationStatus;
  /** Days since the password was last set, when known. */
  ageDays: number | null;
  /** Days left in the rotation window; negative when overdue. */
  daysRemaining: number | null;
  label: string;
};

/**
 * Rotation state for one platform-admin credential. A credential with no
 * recorded rotation date is "unknown", never "current" — an unverified
 * credential must not read as compliant.
 */
export function passwordRotationState(
  rotatedAt: string | null | undefined,
  now: Date = new Date(),
): RotationState {
  if (!rotatedAt) {
    return {
      status: "unknown",
      ageDays: null,
      daysRemaining: null,
      label: "Rotation date not recorded — reset to start the clock",
    };
  }
  const then = new Date(rotatedAt);
  if (Number.isNaN(then.getTime())) {
    return {
      status: "unknown",
      ageDays: null,
      daysRemaining: null,
      label: "Rotation date not readable — reset to start the clock",
    };
  }
  const ageDays = Math.floor((now.getTime() - then.getTime()) / 86_400_000);
  const daysRemaining = PLATFORM_PASSWORD_MAX_AGE_DAYS - ageDays;
  if (daysRemaining < 0) {
    return {
      status: "overdue",
      ageDays,
      daysRemaining,
      label: `Rotation overdue by ${Math.abs(daysRemaining)} day(s)`,
    };
  }
  if (daysRemaining <= PLATFORM_PASSWORD_WARN_DAYS) {
    return {
      status: "due-soon",
      ageDays,
      daysRemaining,
      label: `Rotation due in ${daysRemaining} day(s)`,
    };
  }
  return {
    status: "current",
    ageDays,
    daysRemaining,
    label: `Rotated ${ageDays} day(s) ago · next due in ${daysRemaining} day(s)`,
  };
}

/* --------------------------------------------------------- sign-in errors */

/**
 * Turns an auth error into a message a person can act on. Never reveals
 * whether an address exists — invalid credentials stay deliberately generic.
 */
export function describeSignInError(error: unknown): string {
  const raw = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const message = raw.toLowerCase();
  if (!message) return "Sign-in failed. Please try again.";
  if (message.includes("invalid login credentials"))
    return "That email and password combination is not recognised. Check both, then try again.";
  if (message.includes("email not confirmed"))
    return "This address has not been confirmed yet. Open the confirmation email, or request a new one.";
  if (message.includes("user is banned") || message.includes("banned"))
    return "This account is disabled. Ask a platform administrator to re-enable it.";
  if (message.includes("too many requests") || message.includes("rate limit"))
    return "Too many attempts. Wait a minute before trying again.";
  if (message.includes("password should be at least"))
    return `Password too short — platform accounts need at least ${PLATFORM_PASSWORD_MIN_LENGTH} characters.`;
  if (message.includes("same as the old password") || message.includes("should be different"))
    return "Choose a password you have not used on this account before.";
  if (message.includes("current password"))
    return "Enter your current password to confirm this change.";
  if (message.includes("network") || message.includes("fetch"))
    return "The network request failed. Check your connection and try again.";
  return raw;
}

/** Client-side pre-flight for a sign-in form; empty array means submit. */
export function validateSignInForm(email: string, password: string): string[] {
  const errors: string[] = [];
  const trimmed = email.trim();
  if (!trimmed) errors.push("Enter your work email address.");
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed))
    errors.push("That email address is not formatted correctly.");
  if (!password) errors.push("Enter your password.");
  return errors;
}
