"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DictationItem, TeacherSettings } from "../lib/types";
import { chunkSentence, singleChunk } from "../lib/chunks";
import { sleep, speak, stopSpeech } from "../lib/speech";

interface Props {
  items: DictationItem[];
  settings: TeacherSettings;
  onFinish: () => void;
  onQuit?: () => void;
}

type Phase = "idle" | "speaking" | "writing" | "paused" | "done";

export default function PlayerEngine({ items, settings, onFinish, onQuit }: Props) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [repeat, setRepeat] = useState(0);
  const [chunkIdx, setChunkIdx] = useState(0);
  const [peek, setPeek] = useState(false);
  const [countdown, setCountdown] = useState(settings.writingTime);
  const runId = useRef(0);
  const pausedRef = useRef(false);

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
    setPhase("done");
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
        while (pausedRef.current) await sleep(300);
        setRepeat(r + 1);
        await speakOnce(chunks[c].text, id);
        if (runId.current !== id) return false;
        if (r < settings.repeatCount - 1) await sleep(settings.pauseInterval * 1000);
      }
      // Small breath between parts of the same sentence.
      if (c < chunks.length - 1) {
        await sleep(settings.pauseInterval * 1000);
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

  useEffect(() => () => stopSpeech(), []);

  if (items.length === 0) {
    return (
      <section className="rounded-3xl bg-white p-6 text-center shadow-sm">
        <p className="text-6xl">📭</p>
        <h2 className="mt-2 text-2xl font-black">No words yet!</h2>
        <p className="mt-1 text-slate-500">Go back and add some words first. 📷</p>
      </section>
    );
  }

  const progress = ((index + (phase === "done" ? 1 : 0)) / items.length) * 100;
  const chunks = itemChunks[index] ?? [];
  const chunk = chunks[chunkIdx];
  const multiChunk = chunks.length > 1 && chunk && current;
  // Self-practice mode: answers stay hidden until the end (hold 👀 to peek).
  const hiding = settings.hideWords !== false && phase !== "done" && !peek;

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <h2 className="text-center text-2xl font-black">🎧 Listen and write!</h2>

      <div className="mt-3 h-4 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-green-400 transition-all" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-1 text-center text-lg font-black text-purple-600">
        ⭐ Word {Math.min(index + 1, items.length)} of {items.length}
        {phase === "speaking" && ` · 🗣️ ${repeat}/${settings.repeatCount}`}
        {phase === "speaking" && multiChunk ? ` · 🧩 Part ${chunkIdx + 1}/${chunks.length}` : ""}
      </p>

      <div className="mt-3 flex min-h-44 flex-col justify-center rounded-3xl bg-purple-50 p-6 text-center">
        {phase === "done" ? (
          <p className="mt-2 text-4xl font-black">🎉</p>
        ) : hiding ? (
          <>
            <p className="mt-2 text-7xl">🙈</p>
            {phase === "idle" && <p className="mt-2 text-xl font-black">No peeking! Get your ✏️ ready…</p>}
            {phase === "speaking" && <p className="mt-2 text-xl font-black">🎧 Listen carefully…</p>}
            {phase === "paused" && <p className="mt-2 text-xl font-black text-amber-600">⏸️ Paused — take a breath!</p>}
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
        {phase === "idle" && <p className="mt-2 text-lg text-slate-500">Get your ✏️ pencil ready…</p>}
        {phase === "speaking" && <p className="mt-2 text-lg text-slate-500">🎧 Listen carefully…</p>}
        {phase === "writing" && (
          <p className="mt-3 text-6xl font-black tabular-nums text-blue-600">{countdown}s</p>
        )}
        {phase === "writing" && <p className="mt-1 text-lg text-slate-500">✍️ Write it down!</p>}
        {phase === "paused" && <p className="mt-1 text-lg text-amber-600">⏸️ Paused — take a breath!</p>}
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {(phase === "idle" || phase === "done") && phase !== "done" && (
          <button onClick={start} className="btn-kid rounded-2xl bg-green-500 px-4 py-4 text-2xl font-black text-white shadow-lg hover:bg-green-600">
            ▶ Start!
          </button>
        )}
        {phase !== "idle" && phase !== "done" && (
          <button onClick={togglePause} className="btn-kid rounded-2xl bg-amber-400 px-4 py-4 text-2xl font-black text-white shadow-lg hover:bg-amber-500">
            {phase === "paused" ? "▶ Keep going!" : "⏸ Pause"}
          </button>
        )}
        {phase !== "idle" && phase !== "done" && (
          <button onClick={repeatCurrent} className="btn-kid rounded-2xl bg-purple-500 px-4 py-4 text-2xl font-black text-white shadow-lg hover:bg-purple-600">
            🔂 This word again!
          </button>
        )}
        <div className="flex gap-2">
          <button onClick={restart} className="btn-kid flex-1 rounded-2xl border-4 border-slate-300 bg-white px-4 py-3 text-lg font-black text-slate-600 hover:bg-slate-50">
            ↺ Start over
          </button>
          <button onClick={finish} className="btn-kid flex-1 rounded-2xl bg-blue-500 px-4 py-3 text-lg font-black text-white shadow-lg hover:bg-blue-600">
            Done! ✓
          </button>
        </div>
        {onQuit && (
          <button onClick={onQuit} className="rounded-2xl px-3 py-2 text-base text-slate-400 hover:bg-slate-100">
            ✕ Stop and go back
          </button>
        )}
        {settings.hideWords !== false && phase !== "idle" && phase !== "done" && (
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
            className="touch-none select-none rounded-2xl border-4 border-dashed border-purple-300 bg-white px-3 py-2 text-base font-black text-purple-500"
          >
            👀 Hold to peek!
          </button>
        )}
      </div>
    </section>
  );
}
