/**
 * Split a dictation item into short, listenable chunks for playback.
 *
 * Strategy: break at clause punctuation first, then pack the clause into
 * chunks that are BOTH under a hard size cap and close to a target spoken
 * duration, so a chunk is never a wall of text nor a lonely fragment.
 *
 * Chunks are measured in estimated spoken seconds (CJK reads slower per
 * character than Latin), which is what actually matters to a listener. Hard
 * caps on words/characters remain as a guarantee.
 *
 * Offsets refer to the original string so the UI can highlight the chunk
 * currently being spoken.
 */

import type { TeacherSettings } from "./types";

export interface TextChunk {
  text: string;
  start: number;
  end: number;
}

/* ------------------------------------------------------------------ *
 * Tunables
 * ------------------------------------------------------------------ */

/** Hard caps. A chunk never exceeds these, whatever the duration math says. */
const MAX_LATIN_WORDS = 8;
const MAX_CJK_CHARS = 14;

/** Target audio length of one chunk, in seconds at rate 1x. */
const TARGET_CHUNK_SECONDS = 5;

/** Speaking speed estimates, shared with lib/estimate.ts. */
export const CJK_CHARS_PER_SEC = 5;
export const LATIN_CHARS_PER_SEC = 14;

/** The rate and chunk length the default `pauseInterval` was tuned against. */
const REFERENCE_RATE = 0.8;
const REFERENCE_SECONDS = 4;

/** Absolute bounds for the dynamic repeat gap. */
const MIN_REPEAT_PAUSE = 0.4;
const MAX_REPEAT_PAUSE = 8;

/* ------------------------------------------------------------------ *
 * Text classification helpers
 * ------------------------------------------------------------------ */

const CJK_RE = /[\u3400-\u9FFF\uF900-\uFAFF]/;
/** Strong breaks: a clause always ends here. */
const DELIMS = "，。！？；：、.!?;:…\n";
/**
 * Quotes and brackets. In CJK these are break points in their own right —
 * a chunk should end after `？」` just as it ends after `？`.
 * They only attach forward when they would otherwise open an empty chunk.
 */
const SOFT_MARKS = "「」『』“”‘’（）()《》〈〉【】〔〕—–～";
const SOFT_MARK_SET = new Set(SOFT_MARKS.split(""));
/** These never split between two digits ("3.5", "1,000", "3:30"). */
const GUARDED = new Set([",", ".", ":"]);
/** CJK chars that read naturally as the start of a new chunk. */
const CJK_BREAKS = new Set("卻但然而以與及或若如因被把將在對就這那".split(""));

const WORDY = /[A-Za-z0-9'’-]/;

/** A unit ends a punctuation run — the ideal place to cut CJK text. */
const PUNCT_END = /[，。！？；：、.!?;:…「」『』“”‘’（）()《》〈〉【】〔〕—–～]$/;

/** Strong delimiter that is not trapped between two digits. */
function isStrongBoundary(text: string, i: number): boolean {
  const ch = text[i];
  if (!DELIMS.includes(ch)) return false;
  if (GUARDED.has(ch)) {
    const prev = text[i - 1] ?? "";
    const next = text[i + 1] ?? "";
    if (prev >= "0" && prev <= "9" && next >= "0" && next <= "9") return false;
  }
  return true;
}

/** Is there real spoken content between `from` and `to`, ignoring marks? */
function hasRealContent(text: string, from: number, to: number): boolean {
  for (let k = from; k < to; k++) {
    const c = text[k];
    if (c === "\n" || /\s/.test(c) || SOFT_MARK_SET.has(c)) continue;
    return true;
  }
  return false;
}

/**
 * A run of punctuation such as `？！` or `：「」`, collapsing to its end index.
 *
 * Every mark is a boundary in CJK. The one exception is a run that has no
 * spoken content in front of it inside the current clause: breaking there
 * would emit a chunk that says nothing but "quotation mark", so it attaches
 * forward to the text it opens instead.
 */
function punctuationRunEnd(
  text: string,
  i: number,
  clauseStart: number,
  breakOnSoft: boolean
): number {
  if (isStrongBoundary(text, i)) {
    let j = i + 1;
    while (j < text.length && (isStrongBoundary(text, j) || SOFT_MARK_SET.has(text[j]))) {
      j++;
    }
    return j;
  }
  if (breakOnSoft && SOFT_MARK_SET.has(text[i])) {
    if (!hasRealContent(text, clauseStart, i)) return -1;
    let j = i;
    while (j < text.length && SOFT_MARK_SET.has(text[j])) j++;
    return j;
  }
  return -1;
}

/** True when this chunk is mostly CJK (so CJK break rules apply). */
function isCjkChunk(units: Unit[]): boolean {
  let cjk = 0;
  let other = 0;
  for (const u of units) {
    if (u.isCjk) cjk++;
    else if (u.cost > 0) other++;
  }
  return cjk > other;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/** Estimated spoken seconds for a piece of text at rate 1x. */
export function estimateAudioSeconds(text: string): number {
  if (!text) return 0;
  const cjk = (text.match(CJK_RE) ?? []).length;
  const rest = text.length - cjk;
  return cjk / CJK_CHARS_PER_SEC + rest / LATIN_CHARS_PER_SEC;
}

/**
 * Gap between two readings of the same chunk.
 *
 * The user's `pauseInterval` is the baseline tuned for a ~4 second chunk at
 * the default 0.8x rate. From there the gap stretches for longer chunks (more
 * to write down) and shrinks for a faster voice, so the rhythm stays natural
 * at every speed instead of feeling like a flat one-second beep.
 */
export function repeatPauseSeconds(
  chunkText: string,
  settings: Pick<TeacherSettings, "rate" | "pauseInterval">
): number {
  const rate = clamp(settings.rate, 0.3, 2);
  const audioSeconds = estimateAudioSeconds(chunkText) / rate;
  const lengthFactor = clamp(audioSeconds / REFERENCE_SECONDS, 0.5, 3);
  const rateFactor = clamp(REFERENCE_RATE / rate, 0.6, 2.2);
  const pause = settings.pauseInterval * lengthFactor * rateFactor;
  return Math.round(clamp(pause, MIN_REPEAT_PAUSE, MAX_REPEAT_PAUSE) * 10) / 10;
}

/* ------------------------------------------------------------------ *
 * Tokenising
 * ------------------------------------------------------------------ */

interface Unit {
  text: string;
  /** Absolute offsets into the full source string. */
  start: number;
  end: number;
  isCjk: boolean;
  /** Estimated spoken seconds at rate 1x. */
  cost: number;
}

/**
 * Turn a clause into packing units: one per Latin word, one per CJK char.
 * Punctuation and stray symbols stick to the unit before them so words keep
 * their full stops and commas.
 */
function tokenize(text: string, offset: number): Unit[] {
  const units: Unit[] = [];
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    if (WORDY.test(ch)) {
      const s = i;
      while (i < text.length) {
        const c = text[i];
        if (WORDY.test(c)) {
          i++;
          continue;
        }
        // Keep numeric separators inside the number: "3.14", "1,000", "3:30".
        const isNumSep =
          (c === "." || c === "," || c === ":") &&
          /[0-9]/.test(text[i - 1] ?? "") &&
          /[0-9]/.test(text[i + 1] ?? "");
        if (!isNumSep) break;
        i++;
      }
      const t = text.slice(s, i);
      units.push({
        text: t,
        start: offset + s,
        end: offset + i,
        isCjk: false,
        cost: Math.max(0.12, t.length / LATIN_CHARS_PER_SEC),
      });
      continue;
    }

    if (CJK_RE.test(ch)) {
      const s = i;
      i++;
      units.push({
        text: text.slice(s, i),
        start: offset + s,
        end: offset + i,
        isCjk: true,
        cost: 1 / CJK_CHARS_PER_SEC,
      });
      continue;
    }

    // Anything else (punctuation, symbols): attach to the previous unit.
    const s = i;
    i++;
    const prev = units[units.length - 1];
    if (prev) {
      prev.text += text.slice(s, i);
      prev.end = offset + i;
    } else {
      units.push({
        text: text.slice(s, i),
        start: offset + s,
        end: offset + i,
        isCjk: false,
        cost: 0,
      });
    }
  }

  return units;
}

/**
 * Greedy match ending on the LAST separator of a line, so an oversized unit
 * (URLs, number blobs) is cut at its most natural nearby boundary.
 */
const INNER_BREAKS = /.*[/\\\-_?&=.,;:]/;

/**
 * Safety net for a unit too long to speak in one go (a long URL, a number
 * blob). Cuts at the last natural separator inside each character budget so
 * pieces stay readable instead of being sliced mid-syllable.
 */
function splitOversizedUnit(unit: Unit): Unit[] {
  if (unit.cost <= TARGET_CHUNK_SECONDS) return [unit];

  const chars = Array.from(unit.text);
  const perCps = unit.isCjk ? CJK_CHARS_PER_SEC : LATIN_CHARS_PER_SEC;
  const budget = Math.max(8, Math.floor(TARGET_CHUNK_SECONDS * perCps));

  const pieces: string[] = [];
  let current = "";
  for (const ch of chars) {
    current += ch;
    if (current.length >= budget) {
      // Prefer to break just after a separator when one is close to the edge.
      const m = current.slice(0, -1).match(INNER_BREAKS);
      const cut = m && m[0].length >= budget * 0.5 ? m[0].length : current.length;
      pieces.push(current.slice(0, cut));
      current = current.slice(cut);
    }
  }
  if (current) pieces.push(current);

  const out: Unit[] = [];
  let offset = 0;
  for (const piece of pieces) {
    const text = piece;
    out.push({
      text,
      start: unit.start + offset,
      end: unit.start + offset + text.length,
      isCjk: unit.isCjk,
      cost: unit.isCjk
        ? Array.from(text).length / CJK_CHARS_PER_SEC
        : Math.max(0.12, text.length / LATIN_CHARS_PER_SEC),
    });
    offset += text.length;
  }
  return out.length > 0 ? out : [unit];
}

/* ------------------------------------------------------------------ *
 * Packing
 * ------------------------------------------------------------------ */

function withinCaps(group: Unit[]): boolean {
  let words = 0;
  let cjk = 0;
  for (const u of group) {
    if (u.isCjk) cjk++;
    else if (u.cost > 0) words++;
  }
  return words <= MAX_LATIN_WORDS && cjk <= MAX_CJK_CHARS;
}

/** Total spoken cost of a unit range. */
function costOf(units: Unit[], from: number, to: number): number {
  let total = 0;
  for (let i = from; i < to; i++) total += units[i].cost;
  return total;
}

/**
 * Greedy pack: fill each chunk towards `target` seconds, but cut BEFORE the
 * unit that would breach a hard cap so no chunk ever exceeds the limits.
 */
function packBounds(units: Unit[], target: number): Array<[number, number]> {
  const bounds: Array<[number, number]> = [];
  let from = 0;
  let acc = 0;
  let words = 0;
  let cjk = 0;

  for (let i = 0; i < units.length; i++) {
    const u = units[i];
    const isWord = !u.isCjk && u.cost > 0;

    const wouldBreakCap =
      words + (isWord ? 1 : 0) > MAX_LATIN_WORDS ||
      cjk + (u.isCjk ? 1 : 0) > MAX_CJK_CHARS;

    if (i > from && (wouldBreakCap || acc + u.cost >= target)) {
      bounds.push([from, i]);
      from = i;
      acc = 0;
      words = 0;
      cjk = 0;
    }

    acc += u.cost;
    if (isWord) words++;
    if (u.isCjk) cjk++;
  }

  if (from < units.length) bounds.push([from, units.length]);
  return bounds;
}

/**
 * Greedy packing can leave a stub at the end ("... at | dawn"). Pull the tail
 * groups together and re-pack them evenly so no chunk is stranded alone.
 */
function rebalanceTail(bounds: Array<[number, number]>, units: Unit[], target: number) {
  for (let guard = 0; guard < 12 && bounds.length >= 2; guard++) {
    const last = bounds[bounds.length - 1];
    if (costOf(units, last[0], last[1]) >= target * 0.6) return;

    const prev = bounds[bounds.length - 2];
    const pooledCost = costOf(units, prev[0], last[1]);
    const parts = Math.max(1, Math.ceil(pooledCost / target));
    const inner = packBounds(units.slice(prev[0], last[1]), pooledCost / parts);

    if (inner.length < 2) {
      // Nothing better to do than keep the stub as its own chunk.
      return;
    }
    const tail = inner.map(
      ([a, b]) => [prev[0] + a, prev[0] + b] as [number, number]
    );
    bounds.splice(bounds.length - 2, 2, ...tail);
  }
}

function unitsToChunks(units: Unit[], source: string): TextChunk[] {
  if (units.length === 0) return [];

  const range = (from: number, to: number): TextChunk => {
    const a = units[from];
    const b = units[to - 1];
    return { text: source.slice(a.start, b.end), start: a.start, end: b.end };
  };

  const totalWords = units.filter((u) => !u.isCjk && u.cost > 0).length;
  const totalCjk = units.filter((u) => u.isCjk).length;
  const seconds = units.reduce((a, u) => a + u.cost, 0);

  const groups = Math.max(
    1,
    Math.ceil(totalWords / MAX_LATIN_WORDS),
    Math.ceil(totalCjk / MAX_CJK_CHARS),
    Math.ceil(seconds / TARGET_CHUNK_SECONDS)
  );

  if (groups === 1) return [range(0, units.length)];

  // Spread by spoken cost rather than raw count, so chunks feel equal.
  const target = seconds / groups;
  const bounds = packBounds(units, target);
  rebalanceTail(bounds, units, target);

  // In CJK, a punctuation mark is always a better cut than a cost-balanced
  // one, so slide each cut onto the nearest punctuation run.
  for (let k = 1; k < bounds.length; k++) {
    const left = bounds[k - 1];
    const right = bounds[k];
    const pair = units.slice(left[0], right[1]);
    if (!isCjkChunk(pair)) continue;

    const at = right[0];
    let moved = false;
    for (let delta = 0; delta <= 3 && !moved; delta++) {
      for (const cand of delta === 0 ? [at] : [at - delta, at + delta]) {
        if (cand <= left[0] || cand >= right[1]) continue;
        const u = units[cand - 1];
        if (!u || !PUNCT_END.test(u.text)) continue;
        const shifted: Array<[number, number]> = [
          [left[0], cand],
          [cand, right[1]],
        ];
        if (!shifted.every(([a, b]) => withinCaps(units.slice(a, b)))) continue;
        bounds[k - 1] = shifted[0];
        bounds[k] = shifted[1];
        moved = true;
        break;
      }
    }
  }

  // Nudge CJK boundaries onto a conjunction so chunks don't start mid-phrase.
  for (let k = 1; k < bounds.length; k++) {
    const at = bounds[k][0];
    for (let back = 1; back <= 2; back++) {
      const candidate = at - back;
      if (candidate <= bounds[k - 1][0]) break;
      const u = units[candidate];
      if (!u?.isCjk || !CJK_BREAKS.has(u.text.trim())) continue;
      const shifted: Array<[number, number]> = [
        [bounds[k - 1][0], candidate],
        [candidate, bounds[k][1]],
      ];
      if (shifted.every(([a, b]) => withinCaps(units.slice(a, b)))) {
        bounds[k - 1] = shifted[0];
        bounds[k] = shifted[1];
      }
      break;
    }
  }

  // Fold away a lonely trailing fragment when the merge stays within caps.
  if (bounds.length >= 2) {
    const last = bounds[bounds.length - 1];
    if (last[1] - last[0] <= 1) {
      const prev = bounds[bounds.length - 2];
      const merged: [number, number] = [prev[0], last[1]];
      if (withinCaps(units.slice(merged[0], merged[1]))) {
        bounds.splice(bounds.length - 2, 2, merged);
      }
    }
  }

  // Nudge CJK boundaries onto a conjunction so chunks don't start mid-phrase.
  for (let k = 1; k < bounds.length; k++) {
    const at = bounds[k][0];
    for (let back = 1; back <= 2; back++) {
      const candidate = at - back;
      if (candidate <= bounds[k - 1][0]) break;
      const u = units[candidate];
      if (!u?.isCjk || !CJK_BREAKS.has(u.text.trim())) continue;
      const shifted: Array<[number, number]> = [
        [bounds[k - 1][0], candidate],
        [candidate, bounds[k][1]],
      ];
      if (shifted.every(([a, b]) => withinCaps(units.slice(a, b)))) {
        bounds[k - 1] = shifted[0];
        bounds[k] = shifted[1];
      }
      break;
    }
  }

  return bounds.map(([a, b]) => range(a, b));
}

/* ------------------------------------------------------------------ *
 * Public API
 * ------------------------------------------------------------------ */

/** Split at clause punctuation, then pack each clause into listenable chunks. */
export function chunkSentence(text: string): TextChunk[] {
  const source = text;
  const clauses: TextChunk[] = [];
  let start = 0;

  // Quotes and brackets only count as breaks in CJK text; in English they
  // are rare and usually sit inside a sentence.
  const breakOnSoft = CJK_RE.test(text);

  const push = (end: number) => {
    if (end > start) clauses.push({ text: text.slice(start, end), start, end });
    start = end;
  };

  let i = 0;
  while (i < text.length) {
    // In CJK every mark ends a clause, at the LAST mark of its run.
    const end = punctuationRunEnd(text, i, start, breakOnSoft);
    if (end > i) {
      push(end);
      i = end;
    } else {
      i++;
    }
  }
  push(text.length);

  if (clauses.length === 0) {
    return [{ text, start: 0, end: text.length }];
  }

  const out: TextChunk[] = [];
  for (const c of clauses) {
    if (/^\s*$/.test(c.text)) continue;
    let units = tokenize(c.text, c.start);
    if (units.length === 0) continue;
    units = units.flatMap((u) => splitOversizedUnit(u));
    out.push(...unitsToChunks(units, source));
  }

  return out.length > 0 ? out : [{ text, start: 0, end: text.length }];
}

/** Whole item as one chunk (chunking switched off). */
export function singleChunk(text: string): TextChunk[] {
  return [{ text, start: 0, end: text.length }];
}