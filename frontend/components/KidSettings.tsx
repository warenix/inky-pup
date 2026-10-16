"use client";
import { LANGUAGES, type TeacherSettings } from "../lib/types";

interface Props {
  settings: TeacherSettings;
  setSettings: (s: TeacherSettings) => void;
}

const SPEEDS = [
  { icon: "", label: "Slow", rate: 0.5 },
  { icon: "", label: "Just right", rate: 0.8 },
  { icon: "", label: "Fast!", rate: 1.1 },
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
  const set = <K extends keyof TeacherSettings>(k: K, v: TeacherSettings[K]) =>
    setSettings({ ...settings, [k]: v });

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <h2 className="text-center text-2xl font-black">🎧 Get ready!</h2>
      <p className="mt-1 text-center text-slate-500">Pick how you want to practise.</p>

      <h3 className="mt-5 text-lg font-black">Voice</h3>
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
              {l.label}
            </button>
          );
        })}
      </div>

      <h3 className="mt-5 text-lg font-black">How fast?</h3>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {SPEEDS.map((s) => (
          <Choice key={s.label} active={settings.rate === s.rate} onClick={() => set("rate", s.rate)}>
            <span className="text-sm">{s.label}</span>
          </Choice>
        ))}
      </div>

      <h3 className="mt-5 text-lg font-black">Read how many times?</h3>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {REPEATS.map((n) => (
          <Choice key={n} active={settings.repeatCount === n} onClick={() => set("repeatCount", n)}>
            <span className="text-3xl">{n}×</span>
            <span className="text-sm">{n === 1 ? "once" : `${n} times`}</span>
          </Choice>
        ))}
      </div>

      <h3 className="mt-5 text-lg font-black">Writing time?</h3>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {WRITE_TIMES.map((n) => (
          <Choice key={n} active={settings.writingTime === n} onClick={() => set("writingTime", n)}>
            <span className="text-sm">{n} seconds</span>
          </Choice>
        ))}
      </div>
      <h3 className="mt-5 text-lg font-black">Say the marks?</h3>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Choice active={settings.sayPunctuation} onClick={() => set("sayPunctuation", true)}>
          <span className="text-sm">Yes! Read . , !</span>
        </Choice>
        <Choice active={!settings.sayPunctuation} onClick={() => set("sayPunctuation", false)}>
          <span className="text-sm">No, silent</span>
        </Choice>
      </div>
      <h3 className="mt-5 text-lg font-black">Small parts?</h3>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Choice active={settings.chunkLongSentences} onClick={() => set("chunkLongSentences", true)}>
          <span className="text-sm">Yes, bit by bit!</span>
        </Choice>
        <Choice active={!settings.chunkLongSentences} onClick={() => set("chunkLongSentences", false)}>
          <span className="text-sm">No, whole lines</span>
        </Choice>
      </div>
      <h3 className="mt-5 text-lg font-black">Hide the words?</h3>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Choice active={settings.hideWords} onClick={() => set("hideWords", true)}>
          <span className="text-sm">Yes, test me!</span>
        </Choice>
        <Choice active={!settings.hideWords} onClick={() => set("hideWords", false)}>
          <span className="text-sm">No, show them</span>
        </Choice>
      </div>
    </section>
  );
}
