"use client";
import { LANGUAGES, type TeacherSettings } from "../lib/types";
import type { TKey } from "../lib/i18n";
import { useT } from "./LocaleProvider";

interface Props {
  settings: TeacherSettings;
  setSettings: (s: TeacherSettings) => void;
}

const SPEEDS: Array<{ labelKey: TKey; rate: number }> = [
  { labelKey: "settings.speedSlow", rate: 0.5 },
  { labelKey: "settings.speedJustRight", rate: 0.8 },
  { labelKey: "settings.speedFast", rate: 1.1 },
];

const REPEATS = [1, 2, 3];
const WRITE_TIMES = [10, 20, 30];

/** One chunky choice button. */
function Choice({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`btn-action-sm flex flex-col items-center justify-center border-4 px-2 py-3 text-lg font-bold ${
        active
          ? "border-amber-400 bg-amber-100 text-amber-800"
          : "border-slate-200 bg-white text-slate-600"
      }`}
    >
      {children}
    </button>
  );
}

/** Big friendly choices instead of sliders and number boxes. */
export default function KidSettings({ settings, setSettings }: Props) {
  const t = useT();
  const set = <K extends keyof TeacherSettings>(k: K, v: TeacherSettings[K]) =>
    setSettings({ ...settings, [k]: v });

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <h2 className="text-center text-2xl font-black">{t("settings.title")}</h2>
      <p className="mt-1 text-center text-slate-500">{t("settings.subtitle")}</p>

      <h3 className="mt-5 text-lg font-black">{t("settings.voice")}</h3>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {LANGUAGES.map((l) => {
          const active = settings.lang === l.value;
          const flag =
            l.value === "en-US" ? "" : l.value === "en-GB" ? "" : l.value === "yue-HK" ? "" : "";
          return (
            <button
              key={l.value}
              onClick={() => set("lang", l.value)}
              className={`btn-action-sm w-full border-4 px-2 py-3 text-base font-bold ${
                active
                  ? "border-amber-400 bg-amber-100 text-amber-800"
                  : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              {t(`settings.lang.${l.value}` as TKey)}
            </button>
          );
        })}
      </div>

      <h3 className="mt-5 text-lg font-black">{t("settings.speed")}</h3>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {SPEEDS.map((speed) => (
          <Choice
            key={speed.labelKey}
            active={settings.rate === speed.rate}
            onClick={() => set("rate", speed.rate)}
          >
            <span className="text-sm">{t(speed.labelKey)}</span>
          </Choice>
        ))}
      </div>

      <h3 className="mt-5 text-lg font-black">{t("settings.repeats")}</h3>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {REPEATS.map((n) => (
          <Choice key={n} active={settings.repeatCount === n} onClick={() => set("repeatCount", n)}>
            <span className="text-3xl">{n}×</span>
            <span className="text-sm">
              {n === 1 ? t("settings.repeatOnce") : t("settings.repeatTimes", { n })}
            </span>
          </Choice>
        ))}
      </div>

      <h3 className="mt-5 text-lg font-black">{t("settings.writingTime")}</h3>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {WRITE_TIMES.map((n) => (
          <Choice key={n} active={settings.writingTime === n} onClick={() => set("writingTime", n)}>
            <span className="text-sm">{t("settings.seconds", { n })}</span>
          </Choice>
        ))}
      </div>
      <h3 className="mt-5 text-lg font-black">{t("settings.sayMarks")}</h3>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Choice active={settings.sayPunctuation} onClick={() => set("sayPunctuation", true)}>
          <span className="text-sm">{t("settings.sayMarksYes")}</span>
        </Choice>
        <Choice active={!settings.sayPunctuation} onClick={() => set("sayPunctuation", false)}>
          <span className="text-sm">{t("settings.sayMarksNo")}</span>
        </Choice>
      </div>
      <h3 className="mt-5 text-lg font-black">{t("settings.smallParts")}</h3>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Choice active={settings.chunkLongSentences} onClick={() => set("chunkLongSentences", true)}>
          <span className="text-sm">{t("settings.smallPartsYes")}</span>
        </Choice>
        <Choice active={!settings.chunkLongSentences} onClick={() => set("chunkLongSentences", false)}>
          <span className="text-sm">{t("settings.smallPartsNo")}</span>
        </Choice>
      </div>
      <h3 className="mt-5 text-lg font-black">{t("settings.hideWords")}</h3>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Choice active={settings.hideWords} onClick={() => set("hideWords", true)}>
          <span className="text-sm">{t("settings.hideWordsYes")}</span>
        </Choice>
        <Choice active={!settings.hideWords} onClick={() => set("hideWords", false)}>
          <span className="text-sm">{t("settings.hideWordsNo")}</span>
        </Choice>
      </div>
    </section>
  );
}
