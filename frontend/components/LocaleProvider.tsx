"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  detectLocale,
  readStoredLocale,
  translate,
  writeStoredLocale,
  type Locale,
  type TKey,
  type Vars,
} from "../lib/i18n";

type TFn = (key: TKey, vars?: Vars) => string;

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TFn;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

/**
 * Supplies the UI language to every screen.
 *
 * Starts as English so server and client markup match, then switches to the
 * stored or browser-detected language after mount.
 */
export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    setLocaleState(readStoredLocale() ?? detectLocale());
  }, []);

  // Keep the document language in sync so screen readers switch voice.
  useEffect(() => {
    document.documentElement.lang = locale === "zh-Hant" ? "zh-Hant" : "en";
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    writeStoredLocale(next);
  }, []);

  const t = useCallback<TFn>(
    (key, vars) => translate(locale, key, vars),
    [locale]
  );

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

/** Translation hook. Throws if used outside the provider. */
export function useI18n(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useI18n must be used inside <LocaleProvider>");
  return ctx;
}

/** Shorthand when only the translate function is needed. */
export function useT(): TFn {
  return useI18n().t;
}