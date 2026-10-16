"use client";
import { useRef, useState } from "react";
import { clearShareFromLocation, decodeShare, extractShareCode } from "../lib/share";
import { DEFAULT_SETTINGS, type DictationItem, type TeacherSettings } from "../lib/types";

interface Props {
  onImport: (items: DictationItem[], settings: TeacherSettings) => void;
}

/** Import side of no-backend sharing: paste a link or load a .json file. */
export default function ReceivePanel({ onImport }: Props) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const importCode = (raw: string) => {
    setError(null);
    try {
      const code = extractShareCode(raw);
      if (!code) throw new Error("That doesn't look like a share link ");
      const { items, settings } = decodeShare(code);
      clearShareFromLocation();
      onImport(items, settings);
    } catch {
      setError("Couldn't open that link — check it was copied fully! ");
    }
  };

  const importFile = async (file: File) => {
    setError(null);
    try {
      const json = JSON.parse(await file.text()) as {
        items?: unknown;
        settings?: TeacherSettings;
      };
      if (!Array.isArray(json.items)) throw new Error("bad file");
      const texts = json.items.map((t) => String(t).trim()).filter(Boolean).slice(0, 500);
      if (texts.length === 0) throw new Error("empty");
      onImport(
        texts.map((t, i) => ({ id: i + 1, text: t })),
        { ...DEFAULT_SETTINGS, ...json.settings } as TeacherSettings
      );
    } catch {
      // Maybe it's a raw share code / URL saved as text?
      try {
        const raw = await file.text();
        importCode(raw);
      } catch {
        setError("Couldn't read that file ");
      }
    }
  };

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <h2 className="text-center text-2xl font-black"> Got a share?</h2>
      <p className="mt-1 text-center text-slate-500">Paste the link your teacher sent you!</p>
      <div className="mt-3 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste share link here…"
          className="min-w-0 flex-1 rounded-2xl border-4 border-slate-200 px-3 py-3 text-base"
        />
        <button
          onClick={() => text.trim() && importCode(text)}
          disabled={!text.trim()}
          className="btn-kid shrink-0 rounded-2xl bg-green-500 px-4 py-3 text-lg font-black text-white shadow hover:bg-green-600 disabled:opacity-40"
        >
          Open!
        </button>
      </div>
      <button
        onClick={() => fileRef.current?.click()}
        className="btn-kid mt-2 w-full rounded-2xl border-4 border-slate-200 bg-white px-4 py-3 text-lg font-black text-slate-600 hover:bg-slate-50"
      >
        Load from file instead
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".json,.txt,application/json,text/plain"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void importFile(f);
          e.target.value = "";
        }}
      />
      {error && <p className="mt-2 text-center font-bold text-red-500">{error}</p>}
    </section>
  );
}
