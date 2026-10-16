"use client";
import { useEffect, useState } from "react";
import AddWords from "../components/AddWords";
import CaptureStep from "../components/CaptureStep";
import CropEditor from "../components/CropEditor";
import KidSettings from "../components/KidSettings";
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
import { DEFAULT_SETTINGS, type DictationItem, type TeacherSettings } from "../lib/types";
import { speechSupported } from "../lib/speech";
import SpeechWarning from "../components/SpeechWarning";

type Screen = "home" | "library" | "scan" | "areas" | "review" | "ready" | "play" | "done";
type Flow = "scan" | "library";

const SCAN_STEPS: Step[] = [
  { icon: "", label: "Photo" },
  { icon: "", label: "Areas" },
  { icon: "", label: "Words" },
  { icon: "", label: "Ready" },
  { icon: "", label: "Play" },
];

const LIB_STEPS: Step[] = [
  { icon: "", label: "Library" },
  { icon: "", label: "Words" },
  { icon: "", label: "Ready" },
  { icon: "", label: "Play" },
];

/** Self-marking: tap each answer ✓ / ✗ after practising alone. */
function AnswerCheck({
  items,
  hidden,
  onWrongChange,
}: {
  items: DictationItem[];
  hidden: boolean;
  onWrongChange?: (wrong: DictationItem[]) => void;
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
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <h2 className="text-center text-2xl font-black">
        {hidden ? "Answers — mark your work!" : "What you practised"}
      </h2>
      {hidden && (
        <p className="mt-1 text-center text-slate-500">Tap each one: got it / missed.</p>
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
                  <span className="text-base font-bold">{mark === true ? "Got it" : mark === false ? "Missed" : "—"}</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function BackButton({ onClick, label = "← Back" }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      className="btn-kid rounded-2xl border-4 border-slate-300 bg-white px-4 py-3 text-lg font-black text-slate-500 hover:bg-slate-50"
    >
      {label}
    </button>
  );
}

/** "How long will this take?" — updates live as choices change. */
function EstimateCard({ items, settings }: { items: DictationItem[]; settings: TeacherSettings }) {
  if (items.length === 0) return null;
  const { big, small } = formatEstimate(estimateSeconds(items, settings));
  return (
    <section className="rounded-3xl border-4 border-amber-300 bg-amber-100 p-6 text-center shadow-sm">
      <p className="text-5xl">⏱️</p>
      <p className="mt-1 text-2xl font-black text-amber-800">{big}</p>
      <p className="text-sm text-amber-700">
        {small} · {items.length} words
      </p>
    </section>
  );
}

export default function Home() {
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

  // ---- navigation ----
  const goLibrary = () => {
    setScreen("library");
  };
  const goHome = () => setScreen("home");

  /** "New dictation": fresh empty word list, ready to fill three ways. */
  const startFresh = () => {
    if (items.length > 0 && !window.confirm("Start a brand-new empty word list? Unsaved words will be gone! ️")) return;
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
      if (result.length === 0) setError("No words found — try a clearer photo! ");
      setScreen("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reading failed");
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
    `${new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" })} · ${items.length} words`;

  /** Write the current voice settings back to the loaded dictation (no-op if none). */
  const persistVoice = async () => {
    if (!loadedId) return;
    try {
      await updateEntry(loadedId, items, settings);
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
          await updateEntry(loadedId, items, settings);
        } catch {
          const entry = await saveEntry(autoName(), items, settings);
          setLoadedId(entry.id);
        }
      } else {
        const entry = await saveEntry(autoName(), items, settings);
        setLoadedId(entry.id);
      }
      await refreshEntries();
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2500);
    } catch {
      setError("Couldn't save — this browser blocks saving. ");
    } finally {
      setSaving(false);
    }
  };

  const handleLoadEntry = (entry: DictationEntry) => {
    setItems(entry.items.map((it, i) => ({ ...it, id: i + 1 })));
    // Fill defaults for entries saved before newer settings existed.
    setSettings({ ...DEFAULT_SETTINGS, ...entry.settings });
    setLoadedId(entry.id);
    setError(null);
    setFlow("library");
    setScreen("review");
  };

  const handleDeleteEntry = async (id: string) => {
    const entry = entries.find((e) => e.id === id);
    if (!window.confirm(`Delete ${entry?.name ?? "this dictation"}? This can't be undone.`)) return;
    try {
      await deleteEntry(id);
      if (loadedId === id) setLoadedId(null);
      await refreshEntries();
    } catch {
      setError("Couldn't delete — try again! ");
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
      setError("Couldn't rename — try again! ");
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
  const steps = flow === "scan" ? SCAN_STEPS : LIB_STEPS;
  const stepIndex: Record<string, number> = flow === "scan"
    ? { scan: 0, areas: 1, review: 2, ready: 3, play: 4 }
    : { library: 0, review: 1, ready: 2, play: 3 };
  const showStepper = ["scan", "areas", "review", "ready", "play"].includes(screen);

  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      {showStepper && <Stepper steps={steps} current={stepIndex[screen] ?? 0} />}

      {screen === "home" && (
        <section className="rounded-3xl bg-white p-8 text-center shadow-sm">
          <h1 className="mt-2 text-3xl font-black">Inky Pup Dictation</h1>
          <p className="mt-1 text-lg text-slate-500">Let&apos;s practise!</p>
          <div className="mt-6 flex flex-col gap-3">
            <button
              onClick={startFresh}
              className="btn-kid rounded-2xl bg-green-500 px-4 py-5 text-2xl font-black text-white shadow-lg hover:bg-green-600"
            >
              New dictation
            </button>
            <button
              onClick={goLibrary}
              className="btn-kid rounded-2xl bg-purple-500 px-4 py-5 text-2xl font-black text-white shadow-lg hover:bg-purple-600"
            >
              My dictations{entries.length > 0 ? ` (${entries.length})` : ""}
            </button>
          </div>
          <p className="mt-6 text-sm text-slate-400">Everything stays on this device — no internet needed!</p>
        </section>
      )}
      {screen === "home" && <ReceivePanel onImport={handleImportShared} />}

      {screen === "library" && (
        <>
          <LibraryPanel
            entries={entries}
            loadedId={loadedId}
            onLoad={handleLoadEntry}
            onDelete={handleDeleteEntry}
            onRename={handleRenameEntry}
          />
          <BackButton onClick={goHome} label="← Home" />
        </>
      )}

      {screen === "scan" && (
        <>
          <CaptureStep onFile={(f) => handleFile(f)} appendCount={appendMode ? items.length : 0} />
          <BackButton onClick={appendMode ? () => setScreen("review") : goHome} label={appendMode ? "← Back to words" : "← Home"} />
        </>
      )}

      {screen === "areas" && staged && (
        <>
          {loading ? (
            <section className="rounded-3xl bg-white p-8 text-center shadow-sm">

              <h2 className="mt-2 text-2xl font-black">Reading your photo…</h2>
              <p className="mt-2 text-4xl font-black text-amber-500">
                {progress ? `${Math.round(progress.progress * 100)}%` : "…"}
              </p>
              <div className="mx-auto mt-3 h-4 max-w-xs overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-green-400 transition-all"
                  style={{ width: `${Math.round((progress?.progress ?? 0) * 100)}%` }}
                />
              </div>
              <p className="mt-3 text-slate-500">Good things take a few seconds! ⏳</p>
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
            <div className="rounded-3xl bg-red-50 p-6 text-center shadow-sm">
              <p className="mt-2 text-xl font-black text-red-600">Oops! {error}</p>
              <button
                onClick={loadDemo}
                className="btn-kid mt-3 rounded-2xl bg-white px-4 py-3 text-lg font-black text-slate-600 shadow hover:bg-slate-50"
              >
                Try demo words instead
              </button>
            </div>
          )}
          {!loading && (
            <BackButton
              onClick={() => setScreen(appendMode ? "review" : "scan")}
              label={appendMode ? "← Back to words" : "← Retake photo"}
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
              Saved! Find it in My dictations.
            </p>
          )}
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <div className="flex-1">
                {/* No staged photo (e.g. opened from a shared link) → back goes
                    to the photo screen, never a blank areas screen. */}
                <BackButton
                  onClick={() => setScreen(flow === "scan" ? (staged ? "areas" : "scan") : "library")}
                />
              </div>
              <button
                onClick={handleSaveEntry}
                disabled={items.length === 0 || saving}
                className="btn-kid flex-1 rounded-2xl bg-blue-500 px-4 py-3 text-lg font-black text-white shadow-lg hover:bg-blue-600 disabled:opacity-40"
              >
                {saving ? "Saving…" : " Save"}
              </button>
            </div>
            <button
              onClick={() => items.length > 0 && setScreen("ready")}
              disabled={items.length === 0}
              className="btn-kid rounded-2xl bg-green-500 px-4 py-4 text-2xl font-black text-white shadow-lg hover:bg-green-600 disabled:opacity-40"
            >
              Next! 
            </button>
          </div>
        </>
      )}

      {screen === "ready" && (
        <>
          <SpeechWarning onDismiss={() => {/* noop */}} />
          {loadedEntry && (
            <p className="rounded-2xl bg-white/80 p-2 text-center text-sm font-bold text-slate-500 shadow-sm">
               Voice will be remembered for “{loadedEntry.name}”
            </p>
          )}
          <KidSettings settings={settings} setSettings={setSettings} />
          <EstimateCard items={items} settings={settings} />
          <SharePanel items={items} settings={settings} />
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                void persistVoice();
                setPlayKey((k) => k + 1);
                setScreen("play");
              }}
              className="btn-kid rounded-2xl bg-green-500 px-4 py-4 text-2xl font-black text-white shadow-lg hover:bg-green-600"
              disabled={!speechSupported()}
            >
              ▶ Start!
            </button>
            <BackButton
              onClick={() => {
                void persistVoice();
                setScreen("review");
              }}
              label="← Check words"
            />
          </div>
          {!speechSupported() && (
            <p className="text-center text-sm text-amber-600">
               Web Speech API not available — some dictation features will be limited
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
          <section className="rounded-3xl bg-white p-8 text-center shadow-sm">
            <h1 className="mt-2 text-3xl font-black">Amazing work!</h1>
            <p className="mt-1 text-lg text-slate-500">
              You finished {items.length} words! So proud of you!
            </p>
          </section>
          <AnswerCheck
            key={`answers-${playKey}`}
            items={items}
            hidden={settings.hideWords !== false}
            onWrongChange={setWrongItems}
          />
          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3">
              {wrongItems.length > 0 && (
                <button
                  onClick={handleRetryWrong}
                  className="btn-kid rounded-2xl bg-amber-500 px-4 py-4 text-xl font-black text-white shadow-lg hover:bg-amber-600"
                >
                  Practise missed words ({wrongItems.length})
                </button>
              )}
              <button
                onClick={() => {
                  setPlayKey((k) => k + 1);
                  setScreen("play");
                }}
                className="btn-kid rounded-2xl bg-green-500 px-4 py-4 text-xl font-black text-white shadow-lg hover:bg-green-600"
              >
                Practise again
              </button>
              <button
                onClick={() => setScreen("review")}
                className="btn-kid rounded-2xl bg-purple-500 px-4 py-4 text-xl font-black text-white shadow-lg hover:bg-purple-600"
              >
                Check words
              </button>
              <div className="flex gap-2">
                <button
                  onClick={startFresh}
                  className="btn-kid flex-1 rounded-2xl border-4 border-slate-300 bg-white px-4 py-3 text-lg font-black text-slate-600 hover:bg-slate-50"
                >
                  New
                </button>
                <button
                  onClick={goLibrary}
                  className="btn-kid flex-1 rounded-2xl border-4 border-slate-300 bg-white px-4 py-3 text-lg font-black text-slate-600 hover:bg-slate-50"
                >
                  Library
                </button>
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
