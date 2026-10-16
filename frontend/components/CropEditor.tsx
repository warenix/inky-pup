"use client";
import { useRef, useState } from "react";
import {
  normalizeRegion,
  orderRegions,
  type CropRegion,
  type OcrMode,
} from "../lib/ocr";

interface Props {
  imageUrl: string;
  /** null = OCR the full image; otherwise OCR each area in reading order. */
  onConfirm: (regions: CropRegion[] | null, mode: OcrMode) => void;
  scanning: boolean;
}

const MIN_SIZE = 0.02; // ignore accidental taps smaller than 2% of the image

export default function CropEditor({ imageUrl, onConfirm, scanning }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [regions, setRegions] = useState<CropRegion[]>([]);
  const [draft, setDraft] = useState<CropRegion | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [mode, setMode] = useState<OcrMode>("lines");

  const toRelative = (clientX: number, clientY: number) => {
    const rect = boxRef.current!.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (clientY - rect.top) / rect.height)),
    };
  };

  const startDraw = (e: React.PointerEvent<HTMLDivElement>) => {
    if (scanning) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = toRelative(e.clientX, e.clientY);
    setDraft({ x: p.x, y: p.y, w: 0, h: 0 });
    setSelected(null);
  };

  const moveDraw = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draft) return;
    const p = toRelative(e.clientX, e.clientY);
    setDraft({ ...draft, w: p.x - draft.x, h: p.y - draft.y });
  };

  const endDraw = () => {
    if (!draft) return;
    const r = normalizeRegion(draft);
    setDraft(null);
    if (r.w >= MIN_SIZE && r.h >= MIN_SIZE) {
      setSelected(regions.length);
      setRegions((prev) => [...prev, r]);
    }
  };

  const remove = (index: number, e: React.SyntheticEvent) => {
    e.stopPropagation();
    setRegions((prev) => prev.filter((_, i) => i !== index));
    setSelected(null);
  };

  // Badges follow reading order (the order OCR will use), not creation order.
  const ordered = orderRegions(regions);
  const orderOf = (r: CropRegion) => ordered.indexOf(r) + 1;

  const boxes = [...regions, ...(draft ? [normalizeRegion(draft)] : [])];

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <h2 className="text-center text-2xl font-black">✏️ Circle the words!</h2>
      <p className="mt-1 text-center text-slate-500">
        Draw {regions.length === 0 ? "a box" : "more boxes"} around the words with your finger! 
        Leave a little space around the letters.
      </p>

      <div className="mt-3 flex rounded-2xl bg-slate-100 p-1 text-base font-black">
        <button
          onClick={() => setMode("lines")}
          className={`flex-1 rounded-xl px-3 py-3 ${
            mode === "lines" ? "bg-white shadow" : "text-slate-500"
          }`}
        >
          Sentences
        </button>
        <button
          onClick={() => setMode("words")}
          className={`flex-1 rounded-xl px-3 py-3 ${
            mode === "words" ? "bg-white shadow" : "text-slate-500"
          }`}
        >
          Words
        </button>
      </div>
      <p className="mt-1 text-center text-sm text-slate-400">
        {mode === "words"
          ? "Pick this for word lists — one word at a time! "
          : "Pick this for sentences — long lines! "}
      </p>

      <div
        ref={boxRef}
        onPointerDown={startDraw}
        onPointerMove={moveDraw}
        onPointerUp={endDraw}
        onPointerCancel={() => setDraft(null)}
        className="relative mt-4 touch-none select-none overflow-hidden rounded-xl border border-slate-200"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="Uploaded dictation sheet"
          className="pointer-events-none block w-full"
          draggable={false}
        />
        {boxes.map((r, i) => {
          const isDraft = i === regions.length && draft !== null;
          const n = isDraft ? regions.length + 1 : orderOf(regions[i]);
          const active = !isDraft && selected === i;
          return (
            <div
              key={i}
              onPointerDown={(e) => {
                if (isDraft) return;
                e.stopPropagation();
                setSelected(i);
              }}
              className={`absolute border-2 ${
                isDraft
                  ? "border-dashed border-blue-400 bg-blue-400/10"
                  : active
                    ? "border-blue-600 bg-blue-600/10"
                    : "border-green-500 bg-green-500/10"
              }`}
              style={{
                left: `${r.x * 100}%`,
                top: `${r.y * 100}%`,
                width: `${r.w * 100}%`,
                height: `${r.h * 100}%`,
              }}
            >
              <span className="absolute -left-0.5 -top-6 flex h-5 min-w-5 items-center justify-center rounded bg-blue-600 px-1 text-xs font-bold text-white">
                {n}
              </span>
              {!isDraft && active && (
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => remove(i, e)}
                  aria-label={`Delete area ${n}`}
                  className="absolute -right-3 -top-3 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white shadow"
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <button
          onClick={() => onConfirm(orderRegions(regions), mode)}
          disabled={regions.length === 0 || scanning}
          className="btn-action bg-green-500 text-white hover:bg-green-600 disabled:opacity-40"
        >
          Read {regions.length === 0 ? "my drawing!" : `${regions.length} box${regions.length > 1 ? "es" : ""}!`}
        </button>
        <button
          onClick={() => onConfirm(null, mode)}
          disabled={scanning}
          className="btn-action-md border-4 border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"
        >
          Read the whole photo
        </button>
        {regions.length > 0 && (
          <button
            onClick={() => {
              setRegions([]);
              setSelected(null);
            }}
            disabled={scanning}
            className="rounded-2xl px-3 py-2 text-base text-slate-500 hover:bg-slate-100 disabled:opacity-40"
          >
            Start over
          </button>
        )}
      </div>
    </section>
  );
}
