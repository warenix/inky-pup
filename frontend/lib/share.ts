"use client";
import { deflate, inflate } from "pako";
import { DEFAULT_SETTINGS, type DictationItem, type TeacherSettings } from "./types";

/**
 * No-backend sharing: the whole dictation is compressed into the URL hash.
 * Hash (#d=...) is never sent to the server, so hosting logs see nothing
 * and the static export works unchanged.
 *
 * Wire format v1: JSON {v:1, w:[...texts], s:{compact settings}}
 * -> pako deflate -> base64url.
 */

const HASH_KEY = "d=";
/** Above this many URL chars, QR codes get dense / hard to scan. */
export const QR_FRIENDLY_LIMIT = 1500;

interface CompactSettings {
  l?: string;
  r?: number;
  n?: number;
  p?: number;
  w?: number;
  s?: boolean;
  c?: boolean;
  h?: boolean;
}

interface SharePayload {
  v: 1;
  w: string[];
  s: CompactSettings;
}

function compactSettings(s: TeacherSettings): CompactSettings {
  const d = DEFAULT_SETTINGS;
  const out: CompactSettings = {};
  if (s.lang !== d.lang) out.l = s.lang;
  if (s.rate !== d.rate) out.r = s.rate;
  if (s.repeatCount !== d.repeatCount) out.n = s.repeatCount;
  if (s.pauseInterval !== d.pauseInterval) out.p = s.pauseInterval;
  if (s.writingTime !== d.writingTime) out.w = s.writingTime;
  if (s.sayPunctuation !== d.sayPunctuation) out.s = s.sayPunctuation;
  if (s.chunkLongSentences !== d.chunkLongSentences) out.c = s.chunkLongSentences;
  if (s.hideWords !== d.hideWords) out.h = s.hideWords;
  return out;
}

function expandSettings(c: CompactSettings): TeacherSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...(c.l !== undefined ? { lang: c.l } : {}),
    ...(c.r !== undefined ? { rate: c.r } : {}),
    ...(c.n !== undefined ? { repeatCount: c.n } : {}),
    ...(c.p !== undefined ? { pauseInterval: c.p } : {}),
    ...(c.w !== undefined ? { writingTime: c.w } : {}),
    ...(c.s !== undefined ? { sayPunctuation: c.s } : {}),
    ...(c.c !== undefined ? { chunkLongSentences: c.c } : {}),
    ...(c.h !== undefined ? { hideWords: c.h } : {}),
  };
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const sub = bytes.subarray(i, i + CHUNK);
    bin += String.fromCharCode.apply(null, sub as unknown as number[]);
  }
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(s: string): Uint8Array {
  let b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Compressed share code for items + settings. Throws on empty input. */
export function encodeShare(items: DictationItem[], settings: TeacherSettings): string {
  const texts = items.map((it) => it.text.trim()).filter(Boolean);
  if (texts.length === 0) throw new Error("Nothing to share");
  const payload: SharePayload = { v: 1, w: texts, s: compactSettings(settings) };
  const bytes = deflate(new TextEncoder().encode(JSON.stringify(payload)), { level: 9 });
  return bytesToBase64Url(bytes);
}

export function decodeShare(code: string): { items: DictationItem[]; settings: TeacherSettings } {
  const bytes = base64UrlToBytes(code.trim());
  const json = new TextDecoder().decode(inflate(bytes));
  const payload = JSON.parse(json) as SharePayload;
  if (payload.v !== 1 || !Array.isArray(payload.w)) throw new Error("Bad share code");
  const texts = payload.w.map((t) => String(t).trim()).filter(Boolean).slice(0, 500);
  if (texts.length === 0) throw new Error("Share is empty");
  return {
    items: texts.map((text, i) => ({ id: i + 1, text })),
    settings: expandSettings(payload.s ?? {}),
  };
}

/** Full shareable URL (hash-based). baseUrl defaults to current origin+path. */
export function buildShareUrl(items: DictationItem[], settings: TeacherSettings, baseUrl?: string): string {
  const base =
    baseUrl ?? (typeof window !== "undefined" ? window.location.origin + window.location.pathname : "");
  return `${base}#${HASH_KEY}${encodeShare(items, settings)}`;
}

/** Extract the share code from a full URL or a bare `#d=...` / `d=...` string. */
export function extractShareCode(input: string): string | null {
  const t = input.trim();
  if (!t) return null;
  const hashIdx = t.indexOf(`#${HASH_KEY}`);
  if (hashIdx >= 0) {
    const code = t.slice(hashIdx + 1 + HASH_KEY.length).split(/[&\s]/)[0];
    return code || null;
  }
  if (t.startsWith(HASH_KEY)) return t.slice(HASH_KEY.length).split(/[&\s]/)[0] || null;
  return null;
}

/** If the current location hash holds a share, decode it. Null otherwise. */
export function parseShareFromLocation(): { items: DictationItem[]; settings: TeacherSettings } | null {
  if (typeof window === "undefined") return null;
  const code = extractShareCode(window.location.hash);
  if (!code) return null;
  return decodeShare(code);
}

/** Remove the share hash from the address bar (keeps links private after import). */
export function clearShareFromLocation(): void {
  if (typeof window === "undefined") return;
  history.replaceState(null, "", window.location.pathname + window.location.search);
}
