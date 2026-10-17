"use client";
import { useEffect, useState } from "react";
import AddWords from "../components/AddWords";
import CaptureStep from "../components/CaptureStep";
import CropEditor from "../components/CropEditor";
import KidSettings from "../components/KidSettings";
import TeacherProfiles from "../components/TeacherProfiles";
import LibraryPanel from "../components/LibraryPanel";
import PlayerEngine from "../components/PlayerEngine";
import ReceivePanel from "../components/ReceivePanel";
import ReviewStep from "../components/ReviewStep";
import SharePanel from "../components/SharePanel";
import Stepper, { type Step } from "../components/Stepper";
import {
  cropImage,
  scanDictationImage,
  type CropRegion,
  type OcrMode,
  type OcrProgress,
} from "../lib/ocr";
import { deleteEntry, listEntries, renameEntry, saveEntry, updateEntry, type DictationEntry } from "../lib/library";
import { clearShareFromLocation, parseShareFromLocation } from "../lib/share";
import { estimateSeconds, formatEstimate } from "../lib/estimate";
import { applyProfile, getProfile } from "../lib/profiles";
import { DEFAULT_SETTINGS, type DictationItem, type TeacherSettings } from "../lib/types";
import { speechSupported } from "../lib/speech";
import type { TKey, Vars } from "../lib/i18n";
import SpeechWarning from "../components/SpeechWarning";
import LanguageSwitch from "../components/LanguageSwitch";
import { useI18n, useT } from "../components/LocaleProvider";

type Screen = "home" | "library" | "scan" | "areas" | "review" | "ready" | "play" | "done";
type Flow = "scan" | "library";

const SCAN_STEPS: Step[] = [
  { icon: "", label: "step.photo" },
  { icon: "", label: "step.areas" },
  { icon: "", label: "step.words" },
  { icon: "", label: "step.ready" },
  { icon: "", label: "step.play" },
];

const LIB_STEPS: Step[] = [
  { icon: "", label: "step.library" },
  { icon: "", label: "step.words" },
  { icon: "", label: "step.ready" },
  { icon: "", label: "step.play" },
];

/** Self-marking: tap each answer ✓ / ✗ after practising alone. */
function AnswerCheck({
  items,
  hidden,
  onWrongChange,
  t,
}: {
  items: DictationItem[];
  hidden: boolean;
  onWrongChange?: (wrong: DictationItem[]) => void;
  t: (key: TKey, vars?: Vars) => string;
}) {
  const [marks, setMarks] = useState<Record<number, boolean>>({});
  if (items.length === 0) return null;
  const marked = Object.keys(marks).length;
  const correct = Object.values(marks).filter(Boolean).length;
  const toggle = (id: number) => {
    const next = { ...marks };
    if (!(id in next)) next[id] = true;
    else if (next[id]) next[id] = false;
    else delete next[id];
    setMarks(next);
    onWrongChange?.(items.filter((it) => next[it.id] === false));
  };
  return (
    <section className="card p-6">
      <h2 className="title">
        {t(hidden ? "answer.titleHidden" : "answer.titleShown")}
      </h2>
      {hidden && (
        <p className="subtitle">{t("answer.hint")}</p>
      )}
      {marked > 0 && (
        <p className="mt-2 text-center text-xl font-black text-amber-600">
          {correct}/{marked} right!
          {marked === items.length && correct === items.length ? " Perfect! " : ""}
        </p>
      )}
      <ul className="mt-3 space-y-2">
        {items.map((it) => {
          const mark = marks[it.id];
          return (
            <li key={it.id}>
              <button
                onClick={() => hidden && toggle(it.id)}
                disabled={!hidden}
                className={`flex w-full items-center gap-2 rounded-2xl border-4 px-3 py-2 text-left ${
                  mark === true
                    ? "border-green-400 bg-green-50"
                    : mark === false
                      ? "border-red-300 bg-red-50"
                      : "border-slate-200"
                }`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-200 font-black text-purple-700">
                  {it.id}
                </span>
                <span className="min-w-0 flex-1 truncate text-lg font-bold">{it.text}</span>
                {hidden && (
                  <span className="text-base font-bold">
                    {t(
                      mark === true
                        ? "answer.got"
                        : mark === false
                          ? "answer.missed"
                          : "answer.unmarked"
                    )}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function BackButton({
  onClick,
  label,
  t,
}: {
  onClick: () => void;
  label?: string;
  t: (key: TKey, vars?: Vars) => string;
}) {
  return (
    <button
      onClick={onClick}
      className="btn-back"
    >
      {label ?? t("common.back")}
    </button>
  );
}

/** "How long will this take?" — updates live as choices change. */
function EstimateCard({
  items,
  settings,
  t,
}: {
  items: DictationItem[];
  settings: TeacherSettings;
  t: (key: TKey, vars?: Vars) => string;
}) {
  if (items.length === 0) return null;
  const { big, small } = formatEstimate(estimateSeconds(items, settings), t);
  return (
    <p className="row-panel text-base text-[#5b6069]">
      <span>{big}</span>
      <span className="text-sm font-bold">
        {small} · {t("estimate.words", { n: items.length })}
      </span>
    </p>
  );
}

export default function Home() {
  const { t, locale } = useI18n();
  const [screen, setScreen] = useState<Screen>("home");
  const [flow, setFlow] = useState<Flow>("scan");
  const [items, setItems] = useState<DictationItem[]>([]);
  const [settings, setSettings] = useState<TeacherSettings>(DEFAULT_SETTINGS);
  const [staged, setStaged] = useState<{ file: File; url: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<OcrProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<DictationEntry[]>([]);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [appendMode, setAppendMode] = useState(false);
  const [wrongItems, setWrongItems] = useState<DictationItem[]>([]);
  const [playKey, setPlayKey] = useState(0);
  const [savedFlash, setSavedFlash] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    listEntries().then(setEntries).catch(() => {});
    // No-backend share: opening a #d=... link loads the dictation.
    try {
      const shared = parseShareFromLocation();
      if (shared && shared.items.length > 0) {
        setItems(shared.items);
        setSettings(shared.settings);
        setLoadedId(null);
        setFlow("scan");
        setScreen("review");
        clearShareFromLocation();
      }
    } catch {
      clearShareFromLocation();
    }
  }, []);

  const refreshEntries = async () => {
    try {
      setEntries(await listEntries());
    } catch {
      /* IndexedDB unavailable — library stays empty */
    }
  };

  const loadedEntry = entries.find((e) => e.id === loadedId) ?? null;

  // Missed-word marks belong to the current list — clear them on any change.
  useEffect(() => {
    setWrongItems([]);
  }, [items]);

  // Start every screen at the top so nothing hides below the fold.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [screen]);

  // ---- validation ----
  // A dictation can only run with words the voice can actually read, so rows
  // left blank (or holding only spaces / punctuation) must be dealt with first.
  const blankRows = items.filter((it) => !it.text.trim());
  const blankIds = blankRows.map((it) => it.id);
  const hasList = items.length > 0;
  const canPractise = hasList && blankRows.length === 0;
  const blankWarning =
    blankRows.length === 1
      ? t("msg.blankOne", { n: blankRows[0].id })
      : t("msg.blankMany", { n: blankRows.length });

  // ---- navigation ----
  const goLibrary = () => {
    setScreen("library");
  };
  const goHome = () => setScreen("home");

  /** Words -> Ready. Refuses to advance while any row is empty. */
  const goReady = () => {
    if (!hasList) {
      setError(t("msg.addWordsFirst"));
      return;
    }
    if (blankRows.length > 0) {
      setError(blankWarning);
      return;
    }
    setError(null);
    setScreen("ready");
  };

  /** Ready -> Play. Final gate so a blank list can never reach the voice. */
  const goPlay = () => {
    if (!canPractise) {
      setError(hasList ? blankWarning : t("msg.addWordsFirst"));
      setScreen("review");
      return;
    }
    setError(null);
    setPlayKey((k) => k + 1);
    setScreen("play");
  };

  /** "New dictation": fresh empty word list, ready to fill three ways. */
  const startFresh = () => {
    if (items.length > 0 && !window.confirm(t("msg.startFreshConfirm"))) return;
    setItems([]);
    setStaged((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
    setError(null);
    setLoadedId(null);
    setAppendMode(false);
    setFlow("scan");
    setScreen("review");
  };

  // ---- Step: photo ----
  const handleFile = (file: File, append = false) => {
    setStaged((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return { file, url: URL.createObjectURL(file) };
    });
    if (!append) setItems([]);
    setAppendMode(append);
    setError(null);
    setLoadedId(null);
    setScreen("areas");
  };

  /** ✏️ Manual add: blank row at the end — tap it to type. */
  const handleManualAdd = () =>
    setItems((prev) => [...prev, { id: prev.length + 1, text: "" }]);

  // ---- Step: areas -> OCR ----
  const handleCropConfirm = async (regions: CropRegion[] | null, mode: OcrMode) => {
    if (!staged || loading) return;
    setLoading(true);
    setProgress(null);
    setError(null);
    try {
      let result: DictationItem[];
      if (!regions || regions.length === 0) {
        result = await scanDictationImage(staged.file, setProgress, mode);
      } else {
        const texts: string[] = [];
        for (let i = 0; i < regions.length; i++) {
          const blob = await cropImage(staged.file, regions[i]);
          const partial = await scanDictationImage(blob, (p) =>
            setProgress({
              phase: `Box ${i + 1}/${regions.length}: ${p.phase}`,
              progress: (i + p.progress) / regions.length,
            }),
            mode
          );
          texts.push(...partial.map((it) => it.text));
        }
        result = texts.map((text, i) => ({ id: i + 1, text }));
      }
      // Fresh scan replaces the list; photo-add appends to it.
      setItems((prev) => {
        if (!appendMode) return result;
        const base = prev.length;
        return [...prev, ...result.map((it, i) => ({ ...it, id: base + i + 1 }))];
      });
      setAppendMode(false);
      if (result.length === 0) setError(t("scan.noWordsFound"));
      setScreen("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("msg.readingFailed"));
    } finally {
      setLoading(false);
    }
  };

  const loadDemo = () => {
    setItems([
      { id: 1, text: "apple" },
      { id: 2, text: "蘋果" },
      { id: 3, text: "banana" },
      { id: 4, text: "香蕉" },
    ]);
    setError(null);
    setScreen("review");
  };

  // ---- library ----
  const autoName = () =>
    `${new Date().toLocaleDateString(locale, { month: "short", day: "numeric" })} · ${t("estimate.words", { n: items.length })}`;

  /** Write the current voice settings back to the loaded dictation (no-op if none). */
  const persistVoice = async () => {
    if (!loadedId) return;
    try {
      await updateEntry(loadedId, items, settings, profileId);
      await refreshEntries();
    } catch {
      /* entry gone or storage blocked — stays in memory for this session */
    }
  };

  const handleSaveEntry = async () => {
    if (items.length === 0 || saving) return;
    setSaving(true);
    try {
      if (loadedId) {
        // Already saved — update it instead of making a copy.
        // Falls back to a fresh save if the entry somehow went missing.
        try {
          await updateEntry(loadedId, items, settings, profileId);
        } catch {
          const entry = await saveEntry(autoName(), items, settings, profileId);
          setLoadedId(entry.id);
        }
      } else {
        const entry = await saveEntry(autoName(), items, settings, profileId);
        setLoadedId(entry.id);
      }
      await refreshEntries();
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2500);
    } catch {
      setError(t("msg.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleLoadEntry = (entry: DictationEntry) => {
    setItems(entry.items.map((it, i) => ({ ...it, id: i + 1 })));
    // Fill defaults for entries saved before newer settings existed.
    setSettings({ ...DEFAULT_SETTINGS, ...entry.settings });
    setLoadedId(entry.id);
    // Remember which teacher was assigned to this dictation.
    setProfileId(entry.teacherId ?? null);
    const profile = entry.teacherId ? getProfile(entry.teacherId) : null;
    if (profile) {
      setSettings(applyProfile({ ...DEFAULT_SETTINGS, ...entry.settings }, profile));
    }
    setError(null);
    setFlow("library");
    setScreen("review");
  };

  const handleDeleteEntry = async (id: string) => {
    const entry = entries.find((e) => e.id === id);
    const label = entry?.name;
    if (
      !window.confirm(
        label ? t("msg.deleteConfirm", { name: label }) : t("msg.deleteConfirmUnknown")
      )
    )
      return;
    try {
      await deleteEntry(id);
      if (loadedId === id) setLoadedId(null);
      await refreshEntries();
    } catch {
      setError(t("msg.deleteFailed"));
    }
  };

  /** Shared link / file arrived via ReceivePanel — jump to review. */  const handleImportShared = (sharedItems: DictationItem[], sharedSettings: TeacherSettings) => {
    setItems(sharedItems);
    setSettings(sharedSettings);
    setLoadedId(null);
    setError(null);
    setFlow("scan");
    setScreen("review");
  };

  const handleRenameEntry = async (id: string, name: string) => {
    try {
      await renameEntry(id, name);
      await refreshEntries();
    } catch {
      setError(t("msg.renameFailed"));
    }
  };

  /** Retry round: dictate just the -marked words, renumbered. Repeatable until all . */
  const handleRetryWrong = () => {
    if (wrongItems.length === 0) return;
    setItems(wrongItems.map((it, i) => ({ ...it, id: i + 1 })));
    setPlayKey((k) => k + 1);
    setScreen("play");
  };

  // ---- stepper ----
  const steps = (flow === "scan" ? SCAN_STEPS : LIB_STEPS).map((s) => ({
    icon: s.icon,
    label: t(s.label as TKey),
  }));
  const stepIndex: Record<string, number> = flow === "scan"
    ? { scan: 0, areas: 1, review: 2, ready: 3, play: 4 }
    : { library: 0, review: 1, ready: 2, play: 3 };
  const showStepper = ["scan", "areas", "review", "ready", "play"].includes(screen);

  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      {showStepper && <Stepper steps={steps} current={stepIndex[screen] ?? 0} />}

      {screen === "home" && (
        <section className="card-lg p-8 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mascot.svg" alt={t("common.mascotAlt")} className="mx-auto h-28 w-28 transition hover:scale-110" />
          <h1 className="mt-2 text-3xl font-black">{t("home.title")}</h1>
          <p className="mt-1 text-lg text-slate-500">{t("home.subtitle")}</p>
          <div className="mt-6 flex flex-col gap-3">
            <button
              onClick={startFresh}
              className="btn-action"
            >
              {t("home.new")}
            </button>
            <button
              onClick={goLibrary}
              className="btn-action"
            >
              {t("home.myDictations")}
              {entries.length > 0 ? ` (${entries.length})` : ""}
            </button>
          </div>
          <p className="mt-6 text-sm text-slate-400">{t("home.privacy")}</p>
        </section>
      )}
      {screen === "home" && (
        <>
          <ReceivePanel onImport={handleImportShared} />
          <div className="flex justify-center">
            <LanguageSwitch />
          </div>
        </>
      )}

      {screen === "library" && (
        <>
          <LibraryPanel
            entries={entries}
            loadedId={loadedId}
            onLoad={handleLoadEntry}
            onDelete={handleDeleteEntry}
            onRename={handleRenameEntry}
          />
          <BackButton t={t}
                onClick={goHome} label={t("common.home")} />
        </>
      )}

      {screen === "scan" && (
        <>
          <CaptureStep onFile={(f) => handleFile(f)} appendCount={appendMode ? items.length : 0} />
          <BackButton t={t}
                onClick={appendMode ? () => setScreen("review") : goHome}
              label={appendMode ? t("capture.backRetake") : t("common.home")} />
        </>
      )}

      {screen === "areas" && staged && (
        <>
          {loading ? (
            <section className="card-lg p-8 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/mascot.svg" alt={t("common.mascotAlt")} className="mx-auto h-24 w-24 animate-bounce" />
              <h2 className="mt-2 text-2xl font-black tracking-tight">{t("scan.reading")}</h2>
              <p className="mt-2 text-4xl font-black text-amber-500">
                {progress ? `${Math.round(progress.progress * 100)}%` : "…"}
              </p>
              <div className="mx-auto mt-3 h-4 max-w-xs overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-green-400 transition-all"
                  style={{ width: `${Math.round((progress?.progress ?? 0) * 100)}%` }}
                />
              </div>
              <p className="mt-3 text-slate-500">{t("scan.wait")}</p>
            </section>
          ) : (
            <CropEditor
              key={staged.url}
              imageUrl={staged.url}
              onConfirm={handleCropConfirm}
              scanning={loading}
            />
          )}
          {error && !loading && (
            <div className="card border-4 border-[#e60012]/20 bg-[#fff5f5] p-6 text-center">
              <p className="mt-2 text-xl font-black text-red-600">{t("scan.oops", { message: error })}</p>
              <button
                onClick={loadDemo}
                className="btn-action-md mt-3"
              >
                {t("scan.demo")}
              </button>
            </div>
          )}
          {!loading && (
            <BackButton
              t={t}
                onClick={() => setScreen(appendMode ? "review" : "scan")}
              label={appendMode ? t("capture.backRetake") : t("capture.backRetake")}
            />
          )}
        </>
      )}

      {screen === "review" && (
        <>
          <ReviewStep items={items} setItems={setItems} />
          <AddWords
            count={items.length}
            onManual={handleManualAdd}
            onPhotoFile={(f) => handleFile(f, true)}
          />
          <SharePanel items={items} settings={settings} />
          {savedFlash && (
            <p className="rounded-2xl bg-green-100 p-3 text-center text-lg font-black text-green-700">
              {t("msg.saved")}
            </p>
          )}
          {hasList && blankRows.length > 0 && (
            <p
              role="alert"
              className="rounded-2xl border-4 border-amber-300 bg-amber-100 p-3 text-center text-base font-black text-amber-800"
            >
              {blankWarning}
            </p>
          )}
          {error && screen === "review" && (
            <p role="alert" className="rounded-2xl bg-red-50 p-3 text-center text-base font-black text-red-600">
              {error}
            </p>
          )}
          <div className="flex flex-col gap-3">
            <button
              onClick={goReady}
              disabled={!hasList}
              className="btn-action disabled:opacity-40"
            >
              {t("common.next")}
            </button>
            <button
              onClick={handleSaveEntry}
              disabled={items.length === 0 || saving}
              className="btn-action-md bg-[#007d8c] text-white hover:bg-[#00656f] disabled:opacity-40"
            >
              {saving ? t("common.saving") : t("common.save")}
            </button>
            {/* No staged photo (e.g. opened from a shared link) → back goes
                to the photo screen, never a blank areas screen. */}
            <BackButton
              t={t}
                onClick={() => setScreen(flow === "scan" ? (staged ? "areas" : "scan") : "library")}
            />
          </div>
        </>
      )}

      {screen === "ready" && (
        <>
          <SpeechWarning onDismiss={() => {/* noop */}} />
          {loadedEntry && (
            <p className="rounded-2xl bg-white/80 p-2 text-center text-sm font-bold text-slate-500 shadow-sm">
              {t("ready.voiceRemembered", { name: loadedEntry.name })}
            </p>
          )}
          <TeacherProfiles
            settings={settings}
            setSettings={setSettings}
            activeId={profileId}
            onActiveChange={setProfileId}
          />
          {/* The teacher voice is the main control; the full settings stay
              hidden until someone wants to edit the teacher by hand. */}
          <button
            onClick={() => setShowSettings((v) => !v)}
            aria-expanded={showSettings}
            className="row-panel"
          >
            <span>{t("ready.adjustAll")}</span>
            <span aria-hidden="true" className="text-sm text-[#5b6069]">
              {showSettings ? "▴" : "▾"}
            </span>
          </button>

          {showSettings && (
            <KidSettings settings={settings} setSettings={setSettings} />
          )}
          <EstimateCard items={items} settings={settings} t={t} />
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                if (!canPractise) {
                  setError(hasList ? blankWarning : t("msg.addWordsFirst"));
                  setScreen("review");
                  return;
                }
                void persistVoice();
                setError(null);
                setPlayKey((k) => k + 1);
                setScreen("play");
              }}
              className="btn-action"
              disabled={!speechSupported()}
            >
              {t("ready.start")}
            </button>
            <BackButton
              t={t}
                onClick={() => {
                void persistVoice();
                setScreen("review");
              }}
              label={t("ready.checkWords")}
            />
          </div>
          {!speechSupported() && (
            <p className="text-center text-sm text-amber-600">
               {t("ready.speechUnsupported")}
            </p>
          )}
        </>
      )}

      {screen === "play" && (
        <PlayerEngine
          key={playKey}
          items={items}
          settings={settings}
          onFinish={() => setScreen("done")}
          onQuit={() => setScreen("review")}
        />
      )}

      {screen === "done" && (
        <>
          <div className="confetti" aria-hidden="true">
            <span style={{ left: "12%", animationDelay: "0s" }}>🎉</span>
            <span style={{ left: "28%", animationDelay: "0.15s" }}>⭐</span>
            <span style={{ left: "50%", animationDelay: "0.3s" }}>✨</span>
            <span style={{ left: "72%", animationDelay: "0.45s" }}>⭐</span>
            <span style={{ left: "88%", animationDelay: "0.6s" }}>🎉</span>
          </div>
          <section className="card-lg p-8 text-center">
            <h1 className="mt-2 text-3xl font-black">{t("done.title")}</h1>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/mascot.svg" alt={t("common.mascotAlt")} className="mx-auto mt-3 h-24 w-24 animate-bounce" />
            <p className="mt-1 text-lg text-slate-500">
              {t("done.subtitle", { n: items.length })}
            </p>
          </section>
          <AnswerCheck
            key={`answers-${playKey}`}
            items={items}
            hidden={settings.hideWords !== false}
            onWrongChange={setWrongItems}
            t={t}
          />
          <section className="card p-6">
            <div className="flex flex-col gap-3">
              {wrongItems.length > 0 && (
                <button
                  onClick={handleRetryWrong}
                  className="btn-action"
                >
                  {t("done.practiseMissed", { n: wrongItems.length })}
                </button>
              )}
              <button
                onClick={() => {
                  setPlayKey((k) => k + 1);
                  setScreen("play");
                }}
                className="btn-action"
              >
                {t("done.practiseAgain")}
              </button>
              <button
                onClick={goLibrary}
                className="btn-action-md w-full border-4 border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
              >
                {t("common.library")}
              </button>
              <BackButton t={t}
                onClick={() => setScreen("review")} label={t("done.checkWords")} />
            </div>
          </section>
        </>
      )}
    </main>
  );
}
