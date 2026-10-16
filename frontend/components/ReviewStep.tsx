"use client";
import { useState } from "react";
import type { DictationItem } from "../lib/types";

interface Props {
  items: DictationItem[];
  setItems: (items: DictationItem[]) => void;
}

export default function ReviewStep({ items, setItems }: Props) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");

  const update = (id: number, text: string) =>
    setItems(items.map((it) => (it.id === id ? { ...it, text } : it)));

  const remove = (id: number) => {
    const rest = items.filter((it) => it.id !== id);
    setItems(rest.map((it, i) => ({ ...it, id: i + 1 })));
  };

  const openEditor = (id: number) => {
    const found = items.find((it) => it.id === id);
    if (!found) return;
    setDraft(found.text);
    setEditingId(id);
  };

  const closeEditor = () => {
    setEditingId(null);
    setDraft("");
  };

  const saveEditor = () => {
    if (editingId === null) return;
    // Keep items single-line: typed line breaks become spaces.
    update(editingId, draft.replace(/\s*\n\s*/g, " ").trim());
    closeEditor();
  };

  const move = (id: number, dir: -1 | 1) => {
    const i = items.findIndex((it) => it.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    setItems(next.map((it, k) => ({ ...it, id: k + 1 })));
  };

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <h2 className="text-center text-2xl font-black">✅ Check the words!</h2>
      <p className="mt-1 text-center text-slate-500">
        Tap ▲ ▼ to move words around, fix typos here! 🔍
      </p>
      <ul className="mt-4 space-y-3">
        {items.map((it) => (
          <li key={it.id} className="flex items-center gap-2">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-200 text-lg font-black text-purple-700">
              {it.id}
            </span>
            <button
              onClick={() => openEditor(it.id)}
              aria-label={`Edit word ${it.id}`}
              className="min-w-0 flex-1 truncate rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-left text-lg font-bold hover:border-purple-300"
            >
              {it.text || <span className="text-slate-300">Tap to type… ✏️</span>}
            </button>
            <div className="flex shrink-0 flex-col gap-1">
              <button
                onClick={() => move(it.id, -1)}
                disabled={it.id === 1}
                aria-label={`Move word ${it.id} up`}
                className="flex h-7 w-12 items-center justify-center rounded-lg bg-slate-100 text-sm text-slate-600 hover:bg-slate-200 disabled:opacity-30"
              >
                ▲
              </button>
              <button
                onClick={() => move(it.id, 1)}
                disabled={it.id === items.length}
                aria-label={`Move word ${it.id} down`}
                className="flex h-7 w-12 items-center justify-center rounded-lg bg-slate-100 text-sm text-slate-600 hover:bg-slate-200 disabled:opacity-30"
              >
                ▼
              </button>
            </div>
            <button
              onClick={() => remove(it.id)}
              aria-label={`Delete word ${it.id}`}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-xl text-red-500 hover:bg-red-200"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      {items.length === 0 && (
        <p className="mt-4 text-center text-slate-400">No words yet — add your first one below! 👇</p>
      )}

      {editingId !== null && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          onClick={closeEditor}
          role="dialog"
          aria-modal="true"
          aria-label={`Edit word ${editingId}`}
        >
          <div
            className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-center text-2xl font-black">
              ✏️ Word {editingId}
            </h3>
            <textarea
              value={draft}
              autoFocus
              rows={4}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") closeEditor();
              }}
              aria-label={`Word ${editingId} text`}
              className="mt-3 w-full rounded-2xl border-4 border-purple-300 px-4 py-3 text-xl font-bold focus:border-purple-500 focus:outline-none"
            />
            <div className="mt-3 flex gap-2">
              <button
                onClick={closeEditor}
                className="btn-kid flex-1 rounded-2xl border-4 border-slate-300 bg-white px-4 py-3 text-lg font-black text-slate-500 hover:bg-slate-50"
              >
                ✕ Cancel
              </button>
              <button
                onClick={saveEditor}
                className="btn-kid flex-1 rounded-2xl bg-green-500 px-4 py-3 text-lg font-black text-white shadow-lg hover:bg-green-600"
              >
                ✓ Done
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
