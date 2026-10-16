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
 * Directional punctuation. Opening and closing forms get their own names,
 * which is what Chinese dictation teaches:
 *   （ 開括號   ） 關括號
 *   「 開引號   」 關引號
 * Half-width and full-width forms are both listed so a bracket typed on any
 * keyboard is still spoken.
 */
const PAIRS: Array<{
  /** Opening characters. */
  o: string;
  /** Closing characters. */
  c: string;
  enO: string;
  enC: string;
  zhO: string;
  zhC: string;
}> = [
  {
    o: "(（",
    c: ")）",
    enO: "open bracket",
    enC: "close bracket",
    zhO: "開括號",
    zhC: "關括號",
  },
  {
    o: "[【〔",
    c: "]】〕",
    enO: "open square bracket",
    enC: "close square bracket",
    zhO: "開方括號",
    zhC: "關方括號",
  },
  {
    o: "{｛",
    c: "}｝",
    enO: "open brace",
    enC: "close brace",
    zhO: "開大括號",
    zhC: "關大括號",
  },
  {
    o: "《",
    c: "》",
    enO: "open title mark",
    enC: "close title mark",
    zhO: "開書名號",
    zhC: "關書名號",
  },
  {
    o: "「『“",
    c: "」』”",
    enO: "open quotation mark",
    enC: "close quotation mark",
    zhO: "開引號",
    zhC: "關引號",
  },
];

/** Escape a character list for safe use inside a regex character class. */
function escapeClass(chars: string): string {
  return chars.replace(/[\\\]^-]/g, "\\$&");
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

  // Opening single quote that begins a quoted phrase: "'Hello'" -> "' 開引號 Hello'".
  // Apostrophes inside words like "mustn't" stay silent — the voice already
  // pronounces the whole word naturally — so this only fires at a phrase start.
  // The matching close is deliberately left silent: ' is too easily an
  // apostrophe to name with confidence.
  out = out.replace(
    /(^|[\s（(「『“‘])['‘](?=\S)/g,
    (m) => `${m} ${n("open quotation mark", "開引號")} `
  );

  // Directional pairs first, so a bracket is never read as a plain quote.
  for (const p of PAIRS) {
    const openLabel = n(p.enO, p.zhO);
    const closeLabel = n(p.enC, p.zhC);
    const openSet = new RegExp(`[${escapeClass(p.o)}]`, "g");
    const closeSet = new RegExp(`[${escapeClass(p.c)}]`, "g");
    out = out.replace(openSet, (m) => `${m} ${openLabel} `);
    out = out.replace(closeSet, (m) => `${m} ${closeLabel} `);
  }

  const marks: Array<[RegExp, string, string]> = [
    [/\./g, "full stop", "句號"],
    [/。/g, "full stop", "句號"],
    [/,/g, "comma", "逗號"],
    [/，/g, "comma", "逗號"],
    [/!/g, "exclamation mark", "感嘆號"],
    [/！/g, "exclamation mark", "感嘆號"],
    [/\?/g, "question mark", "問號"],
    [/？/g, "question mark", "問號"],
    [/：/g, "colon", "冒號"],
    [/；/g, "semicolon", "分號"],
    [/;/g, "semicolon", "分號"],
    [/-/g, "hyphen", "連字號"],
  ];
  for (const [re, en, zh] of marks) {
    const label = n(en, zh);
    out = out.replace(re, (m) => `${m} ${label} `);
  }

  // A half-width colon is a colon only when it is NOT between two digits
  // (times and ratios: "3:30", "10:1" stay silent).
  const colonLabel = n("colon", "冒號");
  out = out.replace(/:/g, (m, offset: number, whole: string) => {
    const before = whole[offset - 1] ?? "";
    const after = whole[offset + 1] ?? "";
    const isDigit = (c: string) => c >= "0" && c <= "9";
    if (isDigit(before) && isDigit(after)) return m;
    return `${m} ${colonLabel} `;
  });

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