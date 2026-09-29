import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import {
  journeyStrings,
  localeDirection,
  readStoredLocale,
  writeStoredLocale,
  type JourneyStrings,
  type UiLocale,
} from "@/lib/i18n/locale";

type LocaleContextValue = {
  locale: UiLocale;
  dir: "ltr" | "rtl";
  t: JourneyStrings;
  setLocale: (locale: UiLocale) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<UiLocale>("en");

  useEffect(() => {
    setLocaleState(readStoredLocale());
  }, []);

  useEffect(() => {
    const dir = localeDirection(locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale]);

  const setLocale = (next: UiLocale) => {
    writeStoredLocale(next);
    setLocaleState(next);
  };

  const value: LocaleContextValue = {
    locale,
    dir: localeDirection(locale),
    t: journeyStrings(locale),
    setLocale,
  };

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    return {
      locale: "en",
      dir: "ltr",
      t: journeyStrings("en"),
      setLocale: () => undefined,
    };
  }
  return ctx;
}

/** Compact language switcher for primary journeys. */
export function LocaleSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useLocale();
  return (
    <label className={className ?? "inline-flex items-center gap-2 text-sm text-muted-foreground"}>
      <span className="sr-only">Language</span>
      <select
        className="rounded-md border border-input bg-background px-2 py-1 text-foreground"
        value={locale}
        onChange={(e) => setLocale(e.target.value as UiLocale)}
        aria-label="Language"
      >
        <option value="en">English</option>
        <option value="ar">العربية</option>
      </select>
    </label>
  );
}
