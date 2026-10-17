"use client";

import { LOCALES } from "../lib/i18n";
import { useI18n } from "./LocaleProvider";

/** Compact EN / 中文 toggle shown on the home screen. */
export default function LanguageSwitch() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div
      role="group"
      aria-label={t("common.language")}
      className="flex w-fit items-center gap-1 rounded-2xl bg-white/80 p-1 shadow-sm"
    >
      {LOCALES.map((l) => {
        const active = locale === l.value;
        return (
          <button
            key={l.value}
            onClick={() => setLocale(l.value)}
            aria-pressed={active}
            className={`btn-kid rounded-xl px-4 py-2 text-base font-black transition ${
              active
                ? "bg-amber-400 text-amber-900 shadow"
                : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            {l.label}
          </button>
        );
      })}
    </div>
  );
}