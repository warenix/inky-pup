"use client";
import { useRef, useState } from "react";
import { clearShareFromLocation, decodeShare, extractShareCode } from "../lib/share";
import { DEFAULT_SETTINGS, type DictationItem, type TeacherSettings } from "../lib/types";
import { useT } from "./LocaleProvider";

interface Props {
  onImport: (items: DictationItem[], settings: TeacherSettings) => void;
}

/** Import side of no-backend sharing: paste a link or load a .json file. */
export default function ReceivePanel({ onImport }: Props) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const t = useT();

  const importCode = (raw: string) => {
    setError(null);
    try {
      const code = extractShareCode(raw);
      if (!code) throw new Error(t("receive.errNotLink"));
      const { items, settings } = decodeShare(code);
      clearShareFromLocation();
      onImport(items, settings);
    } catch {
      setError(t("receive.errOpen"));
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
        setError(t("receive.errRead"));
      }
    }
  };

  return (
    <section className="card p-6">
      <h2 className="title">{t("receive.title")}</h2>
      <p className="subtitle">{t("receive.subtitle")}</p>
      <div className="mt-3 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("receive.placeholder")}
          className="min-w-0 flex-1 rounded-2xl border-4 border-slate-200 px-3 py-3 text-base"
        />
        <button
          onClick={() => text.trim() && importCode(text)}
          disabled={!text.trim()}
          className="btn-action-md shrink-0 bg-[#007d8c] text-white hover:bg-[#00656f] disabled:opacity-40"
        >
          {t("receive.open")}
        </button>
      </div>
      <button
        onClick={() => fileRef.current?.click()}
        className="btn-action-md mt-2 w-full btn-plain"
      >
        {t("receive.loadFile")}
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
