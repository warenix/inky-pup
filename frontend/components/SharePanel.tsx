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
    <section className="card p-6">
      <h2 className="title">{t("share.title")}</h2>
      <p className="subtitle">{t("share.subtitle")}</p>
      <div className="mt-3 flex flex-col gap-2">
        <div className="flex gap-2">
          <button
            onClick={copyLink}
            className="btn-action-md flex-1 bg-[#5b5bd6] text-white hover:bg-[#4a4ac4]"
          >
            {copied ? t("share.copied") : t("share.copyLink")}
          </button>
          <button
            onClick={() => setShowQR((v) => !v)}
            className="btn-action-md flex-1 bg-[#f5a623] text-[#5a3a00] hover:bg-[#e0941c]"
          >
            {showQR ? t("share.hideQR") : t("share.showQR")}
          </button>
        </div>
        {typeof navigator !== "undefined" && "share" in navigator && (
          <button
            onClick={() => void shareNative()}
            className="btn-action-md w-full btn-plain"
          >
            {t("share.sendChat")}
          </button>
        )}
        <button
          onClick={downloadJson}
          className="btn-action-md w-full btn-plain"
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
