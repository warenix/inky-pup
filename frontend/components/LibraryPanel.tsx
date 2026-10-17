"use client";
import { useState } from "react";
import type { DictationEntry } from "../lib/library";
import { useT } from "./LocaleProvider";

interface Props {
  entries: DictationEntry[];
  loadedId: string | null;
  onLoad: (entry: DictationEntry) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
}

/** Big friendly list of saved dictations. Saving happens with one tap. */
export default function LibraryPanel({ entries, loadedId, onLoad, onDelete, onRename }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const t = useT();

  const startEdit = (e: DictationEntry) => {
    setEditingId(e.id);
    setDraft(e.name);
  };
  const cancelEdit = () => {
    setEditingId(null);
    setDraft("");
  };
  const confirmEdit = (id: string) => {
    if (draft.trim()) onRename(id, draft);
    cancelEdit();
  };

  if (entries.length === 0) {
    return (
      <section className="rounded-3xl bg-white p-6 text-center shadow-sm">

        <h2 className="mt-2 text-2xl font-black">{t("library.emptyTitle")}</h2>
        <p className="mt-1 text-slate-500">{t("library.emptyBody")}</p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <h2 className="text-center text-2xl font-black">{t("library.title")}</h2>
      <p className="mt-1 text-center text-slate-500">{t("library.subtitle")}</p>
      <ul className="mt-4 space-y-3">
        {entries.map((e) => (
          <li
            key={e.id}
            className={`rounded-2xl border-4 p-3 ${
              e.id === loadedId ? "border-green-400 bg-green-50" : "border-slate-200"
            }`}
          >
            {editingId === e.id ? (
              <div className="flex items-center gap-2">
                <input
                  value={draft}
                  autoFocus
                  onChange={(ev) => setDraft(ev.target.value)}
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter") confirmEdit(e.id);
                    if (ev.key === "Escape") cancelEdit();
                  }}
                  aria-label={t("library.nameLabel")}
                  className="min-w-0 flex-1 rounded-2xl border-2 border-amber-400 px-3 py-2 text-lg font-bold focus:outline-none"
                />
                <button
                  onClick={() => confirmEdit(e.id)}
                  aria-label={t("library.saveName")}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-green-500 text-xl text-white hover:bg-green-600"
                >
                  ✓
                </button>
                <button
                  onClick={cancelEdit}
                  aria-label={t("library.cancelRename")}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-xl text-slate-500 hover:bg-slate-200"
                >
                  ✕
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-black">{e.name}</p>
                    <p className="text-sm text-slate-400">
                      {t("library.meta", {
                        n: e.items.length,
                        date: new Date(e.updatedAt).toLocaleDateString(),
                      })}
                    </p>
                  </div>
                  <button
                    onClick={() => startEdit(e)}
                    aria-label={t("library.rename", { name: e.name })}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-xl hover:bg-slate-200"
                  >
                    ✏️
                  </button>
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => onLoad(e)}
                    className="btn-action-md flex-1 bg-green-500 text-white hover:bg-green-600"
                  >
                    {e.id === loadedId ? t("library.loaded") : t("library.practise")}
                  </button>
                  <button
                    onClick={() => onDelete(e.id)}
                    aria-label={`${t("common.delete")} ${e.name}`}
                    className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-xl text-red-500 hover:bg-red-200"
                  >
                    🗑️
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
