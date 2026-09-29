/**
 * UI locale layer (V2-18 / FR-18).
 * English baseline + Arabic RTL for primary journeys. Urdu planned via same keys.
 */

export const UI_LOCALES = ["en", "ar"] as const;
export type UiLocale = (typeof UI_LOCALES)[number];

export const UI_LOCALE_LABEL: Record<UiLocale, string> = {
  en: "English",
  ar: "العربية",
};

export function isUiLocale(value: string): value is UiLocale {
  return (UI_LOCALES as readonly string[]).includes(value);
}

export function localeDirection(locale: UiLocale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}

export type JourneyStrings = {
  signIn: string;
  email: string;
  password: string;
  continueWithSso: string;
  enterWorkEmail: string;
  discoverSso: string;
  noSsoForDomain: string;
  locale: string;
  dataRegion: string;
  aiProviderRoutes: string;
  supportAccess: string;
  grantAccess: string;
  revoke: string;
  reason: string;
  durationHours: string;
  impersonationNotice: string;
};

const EN: JourneyStrings = {
  signIn: "Sign in",
  email: "Email",
  password: "Password",
  continueWithSso: "Continue with SSO",
  enterWorkEmail: "Enter your work email to find your organisation's sign-in.",
  discoverSso: "Find organisation",
  noSsoForDomain: "No SSO is configured for this email domain.",
  locale: "Language",
  dataRegion: "Data region",
  aiProviderRoutes: "Allowed AI provider routes",
  supportAccess: "Support access",
  grantAccess: "Grant access",
  revoke: "Revoke",
  reason: "Reason",
  durationHours: "Duration (hours)",
  impersonationNotice:
    "Support operators act under their own identity. Impersonation is prohibited.",
};

const AR: JourneyStrings = {
  signIn: "تسجيل الدخول",
  email: "البريد الإلكتروني",
  password: "كلمة المرور",
  continueWithSso: "المتابعة عبر تسجيل الدخول الموحد",
  enterWorkEmail: "أدخل بريد العمل للعثور على تسجيل دخول مؤسستك.",
  discoverSso: "البحث عن المؤسسة",
  noSsoForDomain: "لا يوجد تسجيل دخول موحد مُعد لنطاق هذا البريد.",
  locale: "اللغة",
  dataRegion: "منطقة البيانات",
  aiProviderRoutes: "مسارات مزوّد الذكاء الاصطناعي المسموحة",
  supportAccess: "وصول الدعم",
  grantAccess: "منح الوصول",
  revoke: "إلغاء",
  reason: "السبب",
  durationHours: "المدة (ساعات)",
  impersonationNotice: "يعمل مشغّلو الدعم بهويتهم الخاصة. انتحال الهوية محظور.",
};

const STRINGS: Record<UiLocale, JourneyStrings> = { en: EN, ar: AR };

export function journeyStrings(locale: UiLocale = "en"): JourneyStrings {
  return STRINGS[locale] ?? EN;
}

export const LOCALE_STORAGE_KEY = "usecasesx.ui_locale";

export function readStoredLocale(): UiLocale {
  if (typeof window === "undefined") return "en";
  try {
    const raw = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (raw && isUiLocale(raw)) return raw;
  } catch {
    /* ignore */
  }
  return "en";
}

export function writeStoredLocale(locale: UiLocale): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
}
