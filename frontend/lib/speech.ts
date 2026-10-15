/** Small wrapper around the Web Speech API used by the player engine. */

export function speechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function pickVoice(lang: string): SpeechSynthesisVoice | null {
  if (!speechSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;
  // Exact match first, then prefix (e.g. yue -> zh-HK fallback).
  return (
    voices.find((v) => v.lang === lang) ??
    voices.find((v) => v.lang.startsWith(lang.split("-")[0])) ??
    null
  );
}

export function speak(
  text: string,
  opts: {
    lang: string;
    rate: number;
    /** When false, punctuation stays silent (default: announced). */
    sayPunctuation?: boolean;
    onend?: () => void;
    onerror?: (e: unknown) => void;
  }
): void {
  if (!speechSupported()) {
    opts.onend?.();
    return;
  }
  window.speechSynthesis.cancel();
  const spoken =
    opts.sayPunctuation === false ? text : expandPunctuation(text, opts.lang);
  const u = new SpeechSynthesisUtterance(spoken);
  u.lang = opts.lang;
  u.rate = opts.rate;
  const voice = pickVoice(opts.lang);
  if (voice) u.voice = voice;
  u.onend = () => opts.onend?.();
  u.onerror = (e) => opts.onerror?.(e);
  window.speechSynthesis.speak(u);
}

/**
 * Rewrite text so punctuation is HEARD, not just paused at.
 * Each mark is kept (preserving natural pauses/intonation) with its spoken
 * name appended: "Sit still." -> "Sit still. full stop."
 * Names follow the voice language (English vs Chinese voices).
 */
export function expandPunctuation(text: string, lang: string): string {
  const chinese = lang === "yue-HK" || lang.startsWith("zh");
  const n = (en: string, zh: string) => (chinese ? zh : en);
  let out = text;
  // "..." / "…" first, via placeholder, so the dots aren't also read as
  // three full stops.
  const ELLIPSIS = "\uE000";
  out = out.replace(/\.\.\.|…/g, ELLIPSIS);
  // Opening single quotes: "'Hello'" -> "' quotation mark Hello'".
  // (Apostrophes inside words like "mustn't" stay silent — the voice
  // already pronounces the whole word naturally.)
  out = out.replace(/(^|\W)['’]/g, (m) => `${m} ${n("quotation mark", "引號")} `);
  const marks: Array<[RegExp, string, string]> = [
    [/\./g, "full stop", "句號"],
    [/。/g, "full stop", "句號"],
    [/,/g, "comma", "逗號"],
    [/，/g, "comma", "逗號"],
    [/!/g, "exclamation mark", "感嘆號"],
    [/！/g, "exclamation mark", "感嘆號"],
    [/\?/g, "question mark", "問號"],
    [/？/g, "question mark", "問號"],
    [/:/g, "colon", "冒號"],
    [/：/g, "colon", "冒號"],
    [/;/g, "semicolon", "分號"],
    [/；/g, "semicolon", "分號"],
    [/[""“”「」『』]/g, "quotation mark", "引號"],
    [/\(/g, "open bracket", "左括號"],
    [/\)/g, "close bracket", "右括號"],
    [/-/g, "hyphen", "連字號"],
  ];
  for (const [re, en, zh] of marks) {
    const label = n(en, zh);
    out = out.replace(re, (m) => `${m} ${label} `);
  }
  // Restore "..." with its name, then tidy doubled spaces from insertion.
  out = out.replaceAll(ELLIPSIS, `... ${n("ellipsis", "省略號")} `);
  return out.replace(/ {2,}/g, " ").trim();
}

export function stopSpeech(): void {
  if (speechSupported()) {
    window.speechSynthesis.cancel();
  }
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
