"use client";
import { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  QR_FRIENDLY_LIMIT,
  buildShareUrl,
} from "../lib/share";
import type { DictationItem, TeacherSettings } from "../lib/types";

interface Props {
  items: DictationItem[];
  settings: TeacherSettings;
}

/** Export side of no-backend sharing: copy link, QR, or download file. */
export default function SharePanel({ items, settings }: Props) {
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { url, tooLong } = useMemo(() => {
    if (items.length === 0) return { url: "", tooLong: false };
    try {
      const u = buildShareUrl(items, settings);
      return { url: u, tooLong: u.length > QR_FRIENDLY_LIMIT };
    } catch {
      return { url: "", tooLong: false };
    }
  }, [items, settings]);

  if (items.length === 0) return null;

  const copyLink = async () => {
    setError(null);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (older browsers) — select-and-copy fallback.
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        setError("Couldn't copy — long-press the link below to copy it. ");
      }
      ta.remove();
    }
  };

  const downloadJson = () => {
    const data = JSON.stringify(
      {
        app: "inky-pup-dictation",
        v: 1,
        items: items.map((it) => it.text),
        settings,
      },
      null,
      2
    );
    const blob = new Blob([data], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `dictation-${items.length}-words.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };

  const shareNative = async () => {
    if (typeof navigator === "undefined" || !("share" in navigator)) return false;
    try {
      await navigator.share({ title: "My dictation", text: `${items.length} words to practise!`, url });
      return true;
    } catch {
      return false; // user cancelled or share failed — stay on panel
    }
  };

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <h2 className="text-center text-2xl font-black"> Share</h2>
      <p className="mt-1 text-center text-slate-500">
        Send to another device — no account, link holds the words!
      </p>
      <div className="mt-3 flex flex-col gap-2">
        <div className="flex gap-2">
          <button
            onClick={copyLink}
            className="btn-kid flex-1 rounded-2xl bg-purple-500 px-4 py-3 text-lg font-black text-white shadow hover:bg-purple-600"
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
          <button
            onClick={() => setShowQR((v) => !v)}
            className="btn-kid flex-1 rounded-2xl bg-amber-400 px-4 py-3 text-lg font-black text-amber-900 shadow hover:bg-amber-500"
          >
            {showQR ? "Hide QR" : "Show QR"}
          </button>
        </div>
        {typeof navigator !== "undefined" && "share" in navigator && (
          <button
            onClick={() => void shareNative()}
            className="btn-kid rounded-2xl border-4 border-slate-200 bg-white px-4 py-3 text-lg font-black text-slate-600 hover:bg-slate-50"
          >
            Send via chat…
          </button>
        )}
        <button
          onClick={downloadJson}
          className="btn-kid rounded-2xl border-4 border-slate-200 bg-white px-4 py-3 text-lg font-black text-slate-600 hover:bg-slate-50"
        >
          Download file (for long lists)
        </button>
      </div>
      {tooLong && (
        <p className="mt-3 rounded-2xl bg-amber-100 p-3 text-center text-sm font-bold text-amber-800">
          Long list — QR may be hard to scan. Copy link or file works better!
        </p>
      )}
      {error && <p className="mt-2 text-center font-bold text-red-500">{error}</p>}
      {showQR && url && (
        <div className="mt-4 text-center">
          <div className="inline-block rounded-3xl border-4 border-slate-200 bg-white p-4">
            <QRCodeSVG value={url} size={220} level={tooLong ? "L" : "M"} />
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Scan with the other phone&apos;s camera 
          </p>
          <p className="mt-1 break-all rounded-2xl bg-slate-100 p-2 text-xs text-slate-500">{url}</p>
        </div>
      )}
    </section>
  );
}
