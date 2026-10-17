"use client";

import { useCallback, useEffect, useState } from "react";
import {
  applyProfile,
  createProfile,
  deleteProfile,
  listProfiles,
  profileInitial,
  updateProfile,
  type TeacherProfile,
} from "../lib/profiles";
import { DEFAULT_SETTINGS, LANGUAGES, type TeacherSettings } from "../lib/types";
import { useT } from "./LocaleProvider";

interface Props {
  settings: TeacherSettings;
  setSettings: (s: TeacherSettings) => void;
  /** Profile applied on mount, so the Ready screen opens in its voice. */
  activeId: string | null;
  onActiveChange: (id: string | null) => void;
}

type TFn = (key: any, vars?: any) => string;

function speedLabel(rate: number, t: TFn): string {
  return t(
    rate <= 0.5
      ? "settings.speedSlow"
      : rate >= 1.1
        ? "settings.speedFast"
        : "settings.speedJustRight"
  );
}

function langLabel(value: string, t: TFn): string {
  return LANGUAGES.find((l) => l.value === value)?.label ?? t(`settings.lang.${value}`);
}

/** Short summary for the avatar tile, e.g. "廣東話 · 啱啱好". */
function voiceSummary(settings: TeacherSettings, t: TFn): string {
  return `${langLabel(settings.lang, t)} · ${speedLabel(settings.rate, t)}`;
}

/**
 * Every parameter a teacher controls, as label/value pairs.
 * This is the full "character sheet" so a student can recognise exactly who
 * is reading and how they read.
 */
function summaryRows(settings: TeacherSettings, t: TFn): Array<[string, string]> {
  const yes = t("settings.yes");
  const no = t("settings.no");
  return [
    [t("profile.fieldVoice"), langLabel(settings.lang, t)],
    [t("profile.fieldSpeed"), speedLabel(settings.rate, t)],
    [
      t("profile.fieldRepeats"),
      settings.repeatCount === 1
        ? t("settings.repeatOnce")
        : t("settings.repeatTimes", { n: settings.repeatCount }),
    ],
    [t("profile.fieldPause"), t("settings.seconds", { n: settings.pauseInterval })],
    [t("profile.fieldWriting"), t("settings.seconds", { n: settings.writingTime })],
    [t("profile.fieldMarks"), settings.sayPunctuation ? yes : no],
    [t("profile.fieldParts"), settings.chunkLongSentences ? yes : no],
    [t("profile.fieldHide"), settings.hideWords ? yes : no],
  ];
}

/** Compact grid of every parameter — a "character sheet" for the voice. */
function SettingsSummary({
  settings,
  title,
}: {
  settings: TeacherSettings;
  title?: string;
}) {
  const t = useT();
  return (
    <div className="mt-3 rounded-2xl bg-[#eef1f4] p-3">
      {title && (
        <p className="mb-2 text-center text-sm font-black text-[#2b2d2e]">{title}</p>
      )}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {summaryRows(settings, t).map(([k, v]) => (
          <div
            key={k}
            className="flex items-baseline justify-between gap-2 border-b border-white pb-1 last:border-0"
          >
            <dt className="truncate text-xs font-bold text-[#5b6069]">{k}</dt>
            <dd className="shrink-0 text-xs font-black text-[#2b2d2e]">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * Teacher profile picker — a console-style user chooser.
 * Tapping a profile applies its voice to the session; the + tile saves the
 * current voice settings as a new profile.
 */
export default function TeacherProfiles({
  settings,
  setSettings,
  activeId,
  onActiveChange,
}: Props) {
  const t = useT();
  const [profiles, setProfiles] = useState<TeacherProfile[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<"empty" | "duplicate" | null>(null);

  const refresh = useCallback(() => setProfiles(listProfiles()), []);
  useEffect(refresh, [refresh]);

  const choose = (p: TeacherProfile) => {
    setSettings(applyProfile(settings, p));
    onActiveChange(p.id);
  };

  const submit = () => {
    setError(null);
    try {
      const p = createProfile(name, settings);
      setProfiles(listProfiles());
      setCreating(false);
      setName("");
      onActiveChange(p.id);
    } catch (e) {
      setError(e instanceof Error && e.message === "duplicate" ? "duplicate" : "empty");
    }
  };

  /** Save the voice currently on screen back into the active profile. */
  const saveToActive = () => {
    const target = profiles.find((p) => p.id === activeId);
    if (!target) return;
    updateProfile(target.id, settings);
    refresh();
  };

  const remove = (p: TeacherProfile) => {
    if (typeof window !== "undefined" && !window.confirm(t("profile.deleteConfirm", { name: p.name }))) {
      return;
    }
    deleteProfile(p.id);
    refresh();
    if (activeId === p.id) onActiveChange(null);
  };

  const activeProfile = profiles.find((p) => p.id === activeId) ?? null;
  const activeName = activeProfile?.name ?? "";

  const resetToDefault = () => {
    setSettings({ ...DEFAULT_SETTINGS });
    onActiveChange(null);
  };

  return (
    <section className="card p-6">
      <h2 className="title">{t("profile.title")}</h2>
      <p className="subtitle">{t("profile.subtitle")}</p>

      {/* Console-style horizontal user picker */}
      <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
        {profiles.map((p) => {
          const active = p.id === activeId;
          return (
            <div key={p.id} className="relative shrink-0">
              <button
                onClick={() => choose(p)}
                aria-pressed={active}
                className={`flex w-40 flex-col items-center gap-2 p-4 ${
                  active ? "choice-on" : "choice"
                }`}
              >
                <span
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-black ${
                    active ? "bg-[#e60012] text-white" : "bg-[#eef1f4] text-[#5b6069]"
                  }`}
                >
                  {profileInitial(p.name)}
                </span>
                <span className="w-full truncate text-center text-base font-black">
                  {p.name}
                </span>
                <span className="w-full truncate text-center text-xs text-[#5b6069]">
                  {voiceSummary(p.settings, t)}
                </span>
              </button>

              {/* Selected badge, like a console "current user" marker */}
              {active && (
                <span className="absolute -right-1.5 -top-1.5 rounded-full bg-[#e60012] px-2 py-0.5 text-[10px] font-black text-white">
                  {t("profile.active")}
                </span>
              )}

              <button
                onClick={() => remove(p)}
                aria-label={t("profile.delete", { name: p.name })}
                className="absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-[10px] leading-none text-slate-400 hover:text-[#e60012]"
              >
                ✕
              </button>
            </div>
          );
        })}

        {/* New profile tile */}
        {creating ? (
          <div className="w-40 shrink-0 rounded-3xl border-2 border-[#007d8c] bg-white p-2">
            <input
              value={name}
              autoFocus
              maxLength={24}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
                if (e.key === "Escape") {
                  setCreating(false);
                  setName("");
                  setError(null);
                }
              }}
              placeholder={t("profile.namePlaceholder")}
              aria-label={t("profile.nameLabel")}
              className="w-full rounded-xl border-2 border-[#dfe4ea] px-2 py-2 text-sm font-bold focus:border-[#007d8c] focus:outline-none"
            />
            {error && (
              <p className="mt-1 text-center text-xs font-bold text-[#e60012]">
                {t(error === "duplicate" ? "profile.duplicate" : "profile.empty")}
              </p>
            )}
            <div className="mt-2 flex gap-1">
              <button
                onClick={submit}
                className="btn-action-sm flex-1 rounded-xl bg-[#007d8c] text-white hover:bg-[#00656f]"
              >
                {t("profile.save")}
              </button>
              <button
                onClick={() => {
                  setCreating(false);
                  setName("");
                  setError(null);
                }}
                className="btn-action-sm rounded-xl bg-[#eef1f4] text-[#5b6069] hover:bg-[#e2e6ea]"
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="choice flex w-40 shrink-0 flex-col items-center justify-center gap-1 p-4"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-dashed border-[#b9c2cb] text-3xl font-black leading-none text-[#5b6069]">
              +
            </span>
            <span className="text-center text-sm font-black text-[#5b6069]">
              {t("profile.new")}
            </span>
          </button>
        )}
      </div>

      {/* Full parameter sheet — recognise exactly who is reading and how. */}
      <SettingsSummary
        settings={settings}
        title={
          activeProfile
            ? t("profile.sheetFor", { name: activeName })
            : t("profile.currentVoice")
        }
      />

      {/* Tertiary actions stay small so the Start button keeps the eye. */}
      <div className="mt-2 flex items-center justify-center gap-1">
        <button onClick={saveToActive} disabled={!activeId} className="btn-quiet">
          {t("profile.update")}
        </button>
        <span aria-hidden="true" className="text-slate-300">
          &middot;
        </span>
        <button onClick={resetToDefault} className="btn-quiet">
          {t("profile.reset")}
        </button>
      </div>
    </section>
  );
}