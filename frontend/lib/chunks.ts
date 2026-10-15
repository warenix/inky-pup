/**
 * Split a dictation item into memorable chunks for playback.
 * Short items are untouched; long ones split at clause punctuation first,
 * then over-long clauses split further (word-balanced for spaced text,
 * character-balanced with conjunction snapping for unspaced CJK text).
 * Offsets refer to the original string so the UI can highlight the
 * chunk currently being spoken.
 */

export interface TextChunk {
  text: string;
  start: number;
  end: number;
}

const DELIMS = "，。！？；：、.!?;:…\n";
/** These never split between two digits ("3.5", "1,000", "3:30"). */
const GUARDED = new Set([",", ".", ":"]);

function isBoundary(text: string, i: number): boolean {
  const ch = text[i];
  if (!DELIMS.includes(ch)) return false;
  if (GUARDED.has(ch)) {
    const prev = text[i - 1] ?? "";
    const next = text[i + 1] ?? "";
    if (prev >= "0" && prev <= "9" && next >= "0" && next <= "9") return false;
  }
  return true;
}

/** CJK chars that may start a new chunk (conjunctions, prepositions, ...). */
const CJK_BREAKS = new Set("卻但然而以與及或若如因被把將在對就".split(""));

const MAX_CJK = 12;
const MAX_WORDS = 8;

function splitClause(c: TextChunk): TextChunk[] {
  if (/[a-zA-Z]/.test(c.text) || /\s/.test(c.text)) return splitWords(c);
  return splitCjk(c);
}

function splitWords(c: TextChunk): TextChunk[] {
  const words = Array.from(c.text.matchAll(/\S+/g));
  if (words.length <= MAX_WORDS) return [c];
  const n = Math.ceil(words.length / MAX_WORDS);
  const size = Math.ceil(words.length / n);
  const out: TextChunk[] = [];
  for (let k = 0; k < words.length; k += size) {
    const group = words.slice(k, k + size);
    const first = group[0];
    const last = group[group.length - 1];
    const s = (first.index ?? 0) + c.start;
    const e = (last.index ?? 0) + last[0].length + c.start;
    out.push({ text: c.text.slice(s - c.start, e - c.start), start: s, end: e });
  }
  return out;
}

function splitCjk(c: TextChunk): TextChunk[] {
  const chars = Array.from(c.text);
  if (chars.length <= MAX_CJK) return [c];
  // UTF-16 offsets per char index (for highlight ranges).
  const offs: number[] = [0];
  for (const ch of chars) offs.push(offs[offs.length - 1] + ch.length);
  const n = Math.ceil(chars.length / MAX_CJK);
  const cuts: number[] = [0];
  for (let k = 1; k < n; k++) {
    const even = Math.round((k * chars.length) / n);
    cuts.push(snapCut(chars, even, cuts[k - 1]));
  }
  cuts.push(chars.length);
  return cuts.slice(0, -1).map((a, i) => {
    const b = cuts[i + 1];
    return {
      text: chars.slice(a, b).join(""),
      start: c.start + offs[a],
      end: c.start + offs[b],
    };
  });
}

/** Snap an even cut onto a nearby conjunction char, else keep it. */
function snapCut(chars: string[], cut: number, prev: number): number {
  for (let d = 0; d <= 3; d++) {
    for (const q of [cut - d, cut + d]) {
      if (q > prev + 1 && q < chars.length && CJK_BREAKS.has(chars[q])) return q;
    }
  }
  return cut;
}

export function chunkSentence(text: string): TextChunk[] {
  const clauses: TextChunk[] = [];
  let start = 0;
  const push = (end: number) => {
    if (end > start) clauses.push({ text: text.slice(start, end), start, end });
    start = end;
  };
  let i = 0;
  while (i < text.length) {
    if (isBoundary(text, i)) {
      // Attach delimiter runs ("!?", "..." leftovers) to the same clause.
      let j = i + 1;
      while (j < text.length && isBoundary(text, j)) j++;
      push(j);
      i = j;
    } else {
      i++;
    }
  }
  push(text.length);
  if (clauses.length === 0) return [{ text, start: 0, end: text.length }];
  const out: TextChunk[] = [];
  for (const c of clauses) {
    if (/^\s*$/.test(c.text)) continue;
    out.push(...splitClause(c));
  }
  return out.length > 0 ? out : [{ text, start: 0, end: text.length }];
}

/** Whole item as one chunk (chunking switched off). */
export function singleChunk(text: string): TextChunk[] {
  return [{ text, start: 0, end: text.length }];
}
