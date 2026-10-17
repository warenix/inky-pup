"use client";
import { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  QR_FRIENDLY_LIMIT,
  buildShareUrl,
} from "../lib/share";
import type { DictationItem, TeacherSettings } from "../lib/types";
import { useT } from "./LocaleProvider";

interface Props {
  items: DictationItem[];
  settings: TeacherSettings;
}

/** Export side of no-backend sharing: copy link, QR, or download file. */
export default function SharePanel({ items, settings }: Props) {
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useT();

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
        setError(t("share.copyError"));
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
      await navigator.share({
        title: t("share.shareTitle"),
        text: t("share.shareText", { n: items.length }),
        url,
      });
      return true;
    } catch {
      return false; // user cancelled or share failed — stay on panel
    }
  };

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <h2 className="text-center text-2xl font-black">{t("share.title")}</h2>
      <p className="mt-1 text-center text-slate-500">{t("share.subtitle")}</p>
      <div className="mt-3 flex flex-col gap-2">
        <div className="flex gap-2">
          <button
            onClick={copyLink}
            className="btn-action-md flex-1 bg-purple-500 text-white hover:bg-purple-600"
          >
            {copied ? t("share.copied") : t("share.copyLink")}
          </button>
          <button
            onClick={() => setShowQR((v) => !v)}
            className="btn-action-md flex-1 bg-amber-400 text-amber-900 hover:bg-amber-500"
          >
            {showQR ? t("share.hideQR") : t("share.showQR")}
          </button>
        </div>
        {typeof navigator !== "undefined" && "share" in navigator && (
          <button
            onClick={() => void shareNative()}
            className="btn-action-md w-full border-4 border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          >
            {t("share.sendChat")}
          </button>
        )}
        <button
          onClick={downloadJson}
          className="btn-action-md w-full border-4 border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
        >
          {t("share.download")}
        </button>
      </div>
      {tooLong && (
        <p className="mt-3 rounded-2xl bg-amber-100 p-3 text-center text-sm font-bold text-amber-800">
          {t("share.tooLong")}
        </p>
      )}
      {error && <p className="mt-2 text-center font-bold text-red-500">{error}</p>}
      {showQR && url && (
        <div className="mt-4 text-center">
          <div className="inline-block rounded-3xl border-4 border-slate-200 bg-white p-4">
            <QRCodeSVG value={url} size={220} level={tooLong ? "L" : "M"} />
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {t("share.qrHint")}
          </p>
          <p className="mt-1 break-all rounded-2xl bg-slate-100 p-2 text-xs text-slate-500">{url}</p>
        </div>
      )}
    </section>
  );
}
