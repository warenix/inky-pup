"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DictationItem, TeacherSettings } from "../lib/types";
import { chunkSentence, repeatPauseSeconds, singleChunk } from "../lib/chunks";
import { sleep, speak, stopSpeech } from "../lib/speech";
import { useT } from "./LocaleProvider";

interface Props {
  items: DictationItem[];
  settings: TeacherSettings;
  onFinish: () => void;
  onQuit?: () => void;
}

type Phase = "counting" | "idle" | "speaking" | "writing" | "paused" | "done";

/** Seconds of "get ready" before the first word is spoken. */
const READY_SECONDS = 3;

export default function PlayerEngine({ items, settings, onFinish, onQuit }: Props) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("counting");
  const [repeat, setRepeat] = useState(0);
  const [chunkIdx, setChunkIdx] = useState(0);
  const [peek, setPeek] = useState(false);
  const [countdown, setCountdown] = useState(settings.writingTime);
  const [ready, setReady] = useState(READY_SECONDS);
  const runId = useRef(0);
  const pausedRef = useRef(false);
  const t = useT();

  const current = items[index];
  const chunkingOn = settings.chunkLongSentences !== false;
  const itemChunks = useMemo(
    () => items.map((it) => (chunkingOn ? chunkSentence(it.text) : singleChunk(it.text))),
    [items, chunkingOn]
  );

  // Countdown ticker during writing phase
  useEffect(() => {
    if (phase !== "writing") return;
    if (countdown <= 0) {
      advance(runId.current);
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, countdown]);

  const speakOnce = (text: string, id: number) =>
    new Promise<void>((resolve) => {
      if (runId.current !== id) return resolve();
      setPhase("speaking");
      speak(text, {
        lang: settings.lang,
        rate: settings.rate,
        sayPunctuation: settings.sayPunctuation !== false,
        onend: () => resolve(),
        onerror: () => resolve(),
      });
    });

  const start = () => {
    const id = ++runId.current;
    pausedRef.current = false;
    setPeek(false);
    setPhase("speaking");
    runFrom(index, id);
  };

  // Arriving on the play screen auto-plays: a 3-2-1 countdown, then the first
  // word. "Start!" is no longer needed to begin a session.
  useEffect(() => {
    if (phase !== "counting") return;
    if (ready <= 0) {
      start();
      return;
    }
    const t = setTimeout(() => setReady((r) => r - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, ready]);

  function advance(id: number) {
    // Called when countdown hits 0 early via effect — jump handled by sleep anyway.
    void id;
  }

  const restart = () => {
    stopSpeech();
    setIndex(0);
    setChunkIdx(0);
    setPeek(false);
    setRepeat(0);
    const id = ++runId.current;
    pausedRef.current = false;
    setPhase("speaking");
    // Defer so state settles
    setTimeout(() => {
      if (runId.current === id) {
        setIndex(0);
        runFrom(0, id);
      }
    }, 0);
  };

  async function runFrom(startIdx: number, id: number) {
    for (let i = startIdx; i < items.length; i++) {
      if (runId.current !== id) return;
      const ok = await playItem(i, id);
      if (!ok || runId.current !== id) return;
    }
    if (runId.current !== id) return;
    setPhase("done");
    onFinish();
  }

  /** Play one item fully (chunks + repeats + writing time). False if superseded. */
  async function playItem(i: number, id: number): Promise<boolean> {
    setIndex(i);
    const chunks = itemChunks[i] ?? singleChunk(items[i].text);
    for (let c = 0; c < chunks.length; c++) {
      if (runId.current !== id) return false;
      setChunkIdx(c);
      for (let r = 0; r < settings.repeatCount; r++) {
        if (runId.current !== id) return false;
        // Pause loop also honours runId so quitting while paused cannot hang it.
        while (pausedRef.current) {
          if (runId.current !== id) return false;
          await sleep(300);
        }
        setRepeat(r + 1);
        await speakOnce(chunks[c].text, id);
        if (runId.current !== id) return false;
        // Gap between two readings of the same chunk: scaled by how long the
        // chunk is and how fast the voice is, so the rhythm stays natural.
        if (r < settings.repeatCount - 1) {
          await sleep(repeatPauseSeconds(chunks[c].text, settings) * 1000);
        }
      }
      // Small breath between parts of the same sentence.
      if (c < chunks.length - 1) {
        await sleep(repeatPauseSeconds(chunks[c].text, settings) * 1000);
        if (runId.current !== id) return false;
      }
    }
    if (runId.current !== id) return false;
    setPhase("writing");
    setCountdown(settings.writingTime);
    await sleep(settings.writingTime * 1000);
    if (runId.current !== id) return false;
    return true;
  }

  /** Skip the rest of this word and jump straight to the next one. */
  const skipNext = () => {
    const target = index + 1;
    if (target >= items.length) {
      finish();
      return;
    }
    stopSpeech();
    window.speechSynthesis?.resume();
    const id = ++runId.current;
    pausedRef.current = false;
    setPeek(false);
    setPhase("speaking");
    void (async () => {
      await runFrom(target, id);
    })();
  };

  /** Hear the current word again, then carry on (no restart from word 1). */
  const repeatCurrent = () => {
    if (index >= items.length) return;
    stopSpeech();
    window.speechSynthesis?.resume();
    const id = ++runId.current;
    pausedRef.current = false;
    setPhase("speaking");
    void (async () => {
      const ok = await playItem(index, id);
      if (!ok) return;
      await runFrom(index + 1, id);
    })();
  };

  const togglePause = () => {
    if (phase === "paused") {
      pausedRef.current = false;
      setPhase("speaking");
      window.speechSynthesis?.resume();
    } else {
      pausedRef.current = true;
      setPhase("paused");
      window.speechSynthesis?.pause();
    }
  };

  const finish = () => {
    runId.current++;
    stopSpeech();
    setPhase("done");
    onFinish();
  };

  // Leaving the screen must both silence the voice AND invalidate the running
  // loop: cancel() resolves the pending utterance, and without bumping runId
  // the loop would carry on and speak the next word after unmount.
  useEffect(
    () => () => {
      runId.current++;
      pausedRef.current = false;
      stopSpeech();
    },
    []
  );

  if (items.length === 0) {
    return (
      <section className="rounded-3xl bg-white p-6 text-center shadow-sm">
        <h2 className="mt-2 text-2xl font-black">{t("play.noWordsTitle")}</h2>
        <p className="mt-1 text-slate-500">{t("play.noWordsBody")}</p>
      </section>
    );
  }

  const progress = ((index + (phase === "done" ? 1 : 0)) / items.length) * 100;
  const chunks = itemChunks[index] ?? [];
  const chunk = chunks[chunkIdx];
  const multiChunk = chunks.length > 1 && chunk && current;
  // Self-practice mode: answers stay hidden until the end (hold  to peek).
  const hiding = settings.hideWords !== false && phase !== "done" && !peek;
  // Peek eye appears once playback is under way (never during countdown).
  const canPeek = settings.hideWords !== false && phase !== "counting" && phase !== "done";

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <h2 className="text-center text-2xl font-black">{t("play.title")}</h2>

      <div className="mt-3 h-4 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-green-400 transition-all" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-1 text-center text-lg font-black text-purple-600">
        {t("play.progress", {
          current: Math.min(index + 1, items.length),
          total: items.length,
        })}
        {phase === "speaking" &&
          t("play.repeatCount", { current: repeat, total: settings.repeatCount })}
        {phase === "speaking" &&
          multiChunk &&
          t("play.partCount", { current: chunkIdx + 1, total: chunks.length })}
      </p>

      <div className="relative mt-3 flex min-h-44 flex-col justify-center rounded-3xl bg-purple-50 p-6 text-center">
        {/* Peek eye lives in the card's top-right corner: hold to reveal the word. */}
        {canPeek && (
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              // Keep the press alive even if revealing the answer
              // shifts the layout under the finger.
              e.currentTarget.setPointerCapture(e.pointerId);
              setPeek(true);
            }}
            onPointerUp={() => setPeek(false)}
            onPointerCancel={() => setPeek(false)}
            onLostPointerCapture={() => setPeek(false)}
            onContextMenu={(e) => e.preventDefault()}
            aria-label={t("play.peekLabel")}
            title={t("play.peekLabel")}
            className={`absolute right-3 top-3 flex h-12 w-12 touch-none select-none items-center justify-center rounded-2xl border-4 text-2xl leading-none transition active:scale-95 ${
              peek
                ? "border-purple-500 bg-purple-200 text-purple-800"
                : "border-purple-200 bg-white text-purple-500"
            }`}
          >
            {peek ? "🙈" : "👀"}
          </button>
        )}
        {phase === "counting" ? (
          <>
            <p className="mt-2 text-7xl font-black tabular-nums text-purple-600 animate-pop" key={ready}>
              {ready}
            </p>
            <p className="mt-2 text-xl font-black">{t("play.getReady")}</p>
          </>
        ) : phase === "done" ? (
          <p className="mt-2 text-4xl font-black">{t("play.done")}</p>
        ) : hiding ? (
          <>
            {phase === "idle" && <p className="mt-2 text-xl font-black">{t("play.noPeeking")}</p>}
            {phase === "speaking" && <p className="mt-2 text-xl font-black">{t("play.listenCarefully")}</p>}
            {phase === "paused" && <p className="mt-2 text-xl font-black text-amber-600">{t("play.paused")}</p>}
          </>
        ) : multiChunk ? (
          <p className="mt-2 text-3xl font-black leading-snug">
            {current.text.slice(0, chunk.start)}
            <mark className="rounded-lg bg-amber-200 px-1">{current.text.slice(chunk.start, chunk.end)}</mark>
            {current.text.slice(chunk.end)}
          </p>
        ) : (
          <p className="mt-2 text-4xl font-black">{current?.text}</p>
        )}
        {/* One status line per phase — never stacked on top of each other. */}
        {phase === "writing" ? (
          <>
            <p className="mt-3 text-6xl font-black tabular-nums text-blue-600">{countdown}s</p>
            <p className="mt-1 text-lg text-slate-500">{t("play.writeItDown")}</p>
          </>
        ) : hiding ? null : phase === "idle" ? (
          <p className="mt-2 text-lg text-slate-500">{t("play.pencilReady")}</p>
        ) : phase === "paused" ? (
          <p className="mt-2 text-lg text-amber-600">{t("play.paused")}</p>
        ) : null}
      </div>

      {/* Controls: one primary action, a compact helper row, then back last. */}
      <div className="mt-4 flex flex-col gap-3">
        {phase === "counting" && (
          <button onClick={start} className="btn-action bg-green-500 text-white hover:bg-green-600">
            {t("play.startNow")}
          </button>
        )}
        {phase !== "counting" && phase !== "idle" && phase !== "done" && (
          <button
            onClick={togglePause}
            className="btn-action bg-amber-400 text-amber-950 hover:bg-amber-500"
          >
            {phase === "paused" ? t("play.keepGoing") : t("play.pause")}
          </button>
        )}

        {/* Secondary helpers in two tidy rows — hidden while counting down. */}
        {phase !== "counting" && (
          <>
            {phase !== "idle" && phase !== "done" && (
              <div className="flex gap-2">
                <button onClick={repeatCurrent} className="btn-action-sm flex-1 bg-purple-500 text-white hover:bg-purple-600">
                  {t("play.again")}
                </button>
                <button onClick={skipNext} className="btn-action-sm flex-1 bg-teal-500 text-white hover:bg-teal-600">
                  {t("play.next")}
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={restart} className="btn-action-sm flex-1 border-4 border-slate-200 bg-white text-slate-600 hover:bg-slate-50">
                {t("play.startOver")}
              </button>
              <button onClick={finish} className="btn-action-sm flex-1 bg-blue-500 text-white hover:bg-blue-600">
                {t("common.done")}
              </button>
            </div>
          </>
        )}

        {onQuit && (
          <button onClick={onQuit} className="btn-back">
            {t("play.stopAndGoBack")}
          </button>
        )}
      </div>
    </section>
  );
}
