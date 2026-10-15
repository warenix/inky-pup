import type { DictationItem } from "./types";

/**
 * 100% in-browser OCR via Tesseract.js (WASM port of Tesseract).
 * Languages: Traditional Chinese (`chi_tra`) + English, LSTM engine,
 * PSM 6 (uniform text block — ideal for printed dictation lists).
 *
 * The worker (engine + `chi_tra`/`eng` traineddata, ~25MB first run) is
 * created ONCE and reused for every scan; results are cached in IndexedDB,
 * so repeat visits work offline.
 */

export interface OcrProgress {
  /** e.g. "loading chi_tra", "recognizing text" */
  phase: string;
  /** 0 – 1 */
  progress: number;
}

// Singleton worker — initialized once, reused per scan.
let workerPromise: Promise<any> | null = null;

function getWorker(onProgress?: (p: OcrProgress) => void): Promise<any> {
  if (!workerPromise) {
    workerPromise = (async () => {
      // Dynamic import: keeps Tesseract core out of SSR / initial bundle.
      const { createWorker, OEM, PSM } = await import("tesseract.js");
      const worker = await createWorker(["chi_tra", "eng"], OEM.LSTM_ONLY, {
        logger: (m: { status: string; progress?: number }) =>
          onProgress?.({ phase: m.status, progress: m.progress ?? 0 }),
      });
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
        preserve_interword_spaces: "1",
      });
      return worker;
    })().catch((e) => {
      workerPromise = null; // allow retry after failure
      throw e;
    });
  } else if (onProgress) {
    // Worker already warm — jump straight to recognition phase.
    onProgress({ phase: "recognizing text", progress: 0 });
  }
  return workerPromise;
}

/**
 * Preprocess mirroring the old server pipeline, via canvas:
 * grayscale + contrast boost, downscale if > 2048px, 2x upscale when the
 * image is small (Tesseract explicitly recommends upscaling low-res input).
 */
export async function preprocessImage(source: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(source);
  let scale = 1;
  const longest = Math.max(bitmap.width, bitmap.height);
  if (longest > 2048) scale = 2048 / longest;
  else if (longest < 1200) scale = 2;

  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  try {
    ctx.filter = "grayscale(100%) contrast(140%)";
  } catch {
    /* older browsers: fall back to unfiltered draw */
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png")
  );
  if (!blob) throw new Error("image preprocessing failed");
  return blob;
}

export type OcrMode = "lines" | "words";

interface WordBox {
  text: string;
  confidence: number;
  x0: number;
  x1: number;
}

interface LineBox {
  text: string;
  confidence: number;
  words: WordBox[];
  tableLike: boolean;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

interface OcrWord {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

interface OcrBlocks {
  text: string;
  blocks?: Array<{
    paragraphs?: Array<{
      lines?: Array<{
        text: string;
        confidence: number;
        bbox: { x0: number; y0: number; x1: number; y1: number };
        words?: Array<OcrWord>;
      }>;
    }>;
  }>;
}

/** Sort lines top-to-bottom, then left-to-right (row tolerance from median height). */
function sortLines(lines: LineBox[]): LineBox[] {
  if (lines.length === 0) return lines;
  const heights = lines.map((l) => l.y1 - l.y0).sort((a, b) => a - b);
  const tolerance = Math.max(8, heights[Math.floor(heights.length / 2)] * 0.6);
  return [...lines].sort((a, b) =>
    Math.abs(a.y0 - b.y0) > tolerance ? a.y0 - b.y0 : a.x0 - b.x0
  );
}

const NUMBERED_RE =
  /^[\s>]*(\(?\d{1,3}[.\)、\s:：]|[一二三四五六七八九十]{1,4}[、．.）\)：:]|第[一二三四五六七八九十\d]{1,4}[課课][\s:：]?)/;
const BULLET_RE = /^[\s>\-–—•·*]+/;

/** Leading "( )" checkbox boilerplate Tesseract picks up from dictation sheets. */
const CHECKBOX_RE = /^\(\s*\)\s*/;

/** Strip list indices like "1.", "2)", "一、" and trim whitespace. */
export function stripListIndex(s: string): string {
  return s
    .replace(CHECKBOX_RE, "")
    .replace(NUMBERED_RE, "")
    .replace(BULLET_RE, "")
    .trim();
}

// --- Accuracy guards (tuned against real dictation sheets) ---

/** Lines scoring below this are hallucinations on borders, badges and noise. */
const MIN_LINE_CONFIDENCE = 20;
/** CJK word tokens below this are junk — except lone CJK chars, which score low even when right. */
const MIN_WORD_CONFIDENCE = 15;
/** Latin-only tokens below this are usually fragments hallucinated on CJK strokes. */
const MIN_LATIN_CONFIDENCE = 60;

/** Table grid rules and stray brackets the engine picks up. */
const GRID_CHARS_RE = /[|│┃─_“”"«»]/g;
/** Leading/trailing wrapper junk on word tokens. */
const WORD_EDGE_JUNK_RE = /^[\s|│┃─_“”"'「」『』()\[\]【】•·]+|[\s|│┃─_“”"'「」『』()\[\]【】•·]+$/g;
/** Keeper test: at least one letter, digit or CJK character. */
const HAS_CONTENT_RE = /[A-Za-z0-9\u3400-\u9FFF]/;
const HAS_CJK_RE = /[\u3400-\u9FFF]/;
/** Line ends that terminate a sentence (no wrap-join past these). */
const TERMINAL_PUNCT_RE = /[。！？!?…;；」"”]$/;

function cleanWord(raw: string): string {
  return stripListIndex(raw.replace(WORD_EDGE_JUNK_RE, "").trim());
}

function keepWord(text: string, confidence: number): boolean {
  if (!HAS_CONTENT_RE.test(text)) return false; // pure | 」 ! etc.
  const cjk = HAS_CJK_RE.test(text);
  if (!cjk && confidence < MIN_LATIN_CONFIDENCE) return false;
  if (cjk && text.length > 1 && confidence < MIN_WORD_CONFIDENCE) return false;
  return true; // lone CJK chars are always kept — they score low even when right
}

function cleanLineText(raw: string): string {
  const t = stripListIndex(
    raw.replace(GRID_CHARS_RE, " ").replace(/\s+/g, " ").trim()
  );
  // CJK has no spaces around punctuation: "吧!搖吧! 」" -> "吧!搖吧!」".
  return t
    .replace(/\s+([」"”’。，、！？!?,.:;：；…])/g, "$1")
    .replace(/([「"“‘（(\[])\s+/g, "$1");
}

/**
 * A line is table-like when the engine saw a table grid rule (| │ ─ _)
 * AND the surviving words are spread across wide cell gaps (≥ 0.8× the
 * median glyph width). Either signal alone misfires — stray brackets appear
 * in sentences, and punctuation clusters leave wide gaps — but a grid rule
 * plus cell gaps only matches real tables.
 */
const GRID_JUNK_RE = /[|│┃─_]/;
function isTableLike(words: WordBox[]): boolean {
  const cleaned = words.map((w) => ({ w, t: cleanWord(w.text) }));
  const hasGrid = cleaned.some(
    ({ w, t }) => t === "" && GRID_JUNK_RE.test(w.text)
  );
  if (!hasGrid) return false;
  const content = cleaned
    .filter(({ t }) => HAS_CONTENT_RE.test(t))
    .map(({ w }) => w);
  if (content.length < 2) return false;
  const widths = content
    .map((w) => w.x1 - w.x0)
    .sort((a, b) => a - b);
  const median = Math.max(1, widths[Math.floor(widths.length / 2)]);
  for (let i = 1; i < content.length; i++) {
    if (content[i].x0 - content[i - 1].x1 >= 0.8 * median) return true;
  }
  return false;
}

const isSingleCjk = (s: string) => s.length === 1 && HAS_CJK_RE.test(s);

/**
 * Regroup over-split vocab cells: merge adjacent lone CJK chars separated by
 * less than half a glyph width — but ONLY in table-like lines. Sentence
 * lines have no grid rules, so their characters are never merged.
 */
function mergeSplitCells(words: WordBox[], tableLike: boolean): WordBox[] {
  if (!tableLike || words.length < 2) return words;
  const out: WordBox[] = [];
  let i = 0;
  while (i < words.length) {
    let cur = words[i];
    while (
      i + 1 < words.length &&
      isSingleCjk(cur.text) &&
      isSingleCjk(words[i + 1].text) &&
      words[i + 1].x0 - cur.x1 < 0.5 * Math.min(cur.x1 - cur.x0, words[i + 1].x1 - words[i + 1].x0)
    ) {
      const next = words[i + 1];
      cur = {
        text: cur.text + next.text,
        confidence: Math.max(cur.confidence, next.confidence),
        x0: cur.x0,
        x1: next.x1,
      };
      i++;
    }
    out.push(cur);
    i++;
  }
  return out;
}

/** Collect lines once: confidence filter + word cleanup shared by both modes. */
function collectLines(data: OcrBlocks): LineBox[] {
  const lines: LineBox[] = [];
  for (const block of data.blocks ?? []) {
    for (const para of block.paragraphs ?? []) {
      for (const line of para.lines ?? []) {
        if (!line.text.trim()) continue;
        if ((line.confidence ?? 100) < MIN_LINE_CONFIDENCE) continue;
        const words = (line.words ?? [])
          .map((w) => ({
            text: w.text,
            confidence: w.confidence ?? 0,
            x0: w.bbox.x0,
            x1: w.bbox.x1,
          }))
          .sort((a, b) => a.x0 - b.x0);
        lines.push({
          text: line.text,
          confidence: line.confidence ?? 100,
          words,
          tableLike: isTableLike(words),
          x0: line.bbox.x0,
          y0: line.bbox.y0,
          x1: line.bbox.x1,
          y1: line.bbox.y1,
        });
      }
    }
  }
  return sortLines(lines);
}

/**
 * Rejoin visual line-wraps into sentences: a CJK line with no internal spaces
 * (CJK has none; table rows do) that doesn't end sentence punctuation
 * continues on the next line. Table rows keep their spaces, so they never
 * merge. Latin-only lines never merge either: spaceless Latin lines are
 * single vocab words ("climb" + "litter" must stay two items), while spaced
 * Latin lines are already complete.
 */
function joinWrappedLines(lines: string[]): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    let cur = lines[i];
    while (
      i + 1 < lines.length &&
      HAS_CJK_RE.test(cur) &&
      !/\s/.test(cur) &&
      !TERMINAL_PUNCT_RE.test(cur)
    ) {
      const next = lines[i + 1];
      const joiner =
        /[A-Za-z0-9]$/.test(cur) && /^[A-Za-z0-9]/.test(next) ? " " : "";
      cur += joiner + next;
      i++;
    }
    out.push(cur);
    i++;
  }
  return out;
}

export function blocksToLineItems(data: OcrBlocks): DictationItem[] {
  const lines = collectLines(data);
  const cols = splitColumns(lines);
  if (!cols) {
    const cleaned = lines
      .map((l) => cleanLineText(l.text))
      .filter((t) => t.length > 0);
    return joinWrappedLines(cleaned).map((text, i) => ({ id: i + 1, text }));
  }
  // Two columns: read the left column top-to-bottom, then the right column
  // (matches numbered vocab lists like 1-5 left / 6-10 right).
  const cellText = (l: LineBox) =>
    cleanLineText(
      l.words.length > 0 ? l.words.map((w) => w.text).join(" ") : l.text
    );
  const left = joinWrappedLines(
    cols.left.map(cellText).filter((t) => t.length > 0)
  );
  const right = joinWrappedLines(
    cols.right.map(cellText).filter((t) => t.length > 0)
  );
  return [...left, ...right].map((text, i) => ({ id: i + 1, text }));
}

/** Words surviving cleanup for one line (shared by single/dual column). */
function lineWordTexts(line: LineBox): string[] {
  const texts: string[] = [];
  for (const w of mergeSplitCells(line.words, line.tableLike)) {
    const text = cleanWord(w.text);
    if (text && keepWord(text, w.confidence)) texts.push(text);
  }
  return texts;
}

export function blocksToWordItems(data: OcrBlocks): DictationItem[] {
  const lines = collectLines(data);
  const cols = splitColumns(lines);
  const ordered = cols ? [...cols.left, ...cols.right] : lines;
  const texts: string[] = [];
  for (const line of ordered) texts.push(...lineWordTexts(line));
  return texts.map((text, i) => ({ id: i + 1, text }));
}

/**
 * Two-column layout support (e.g. vocab lists "1-5" left, "6-10" right).
 * Tesseract's SINGLE_BLOCK mode merges both columns into single lines, so
 * detect the vertical gutter from word boxes: an inter-word gap that dwarfs
 * normal spacing AND recurs at the same x-position across several lines.
 */
interface ColumnGutter {
  start: number;
  end: number;
  mid: number;
}

function findColumnGutter(lines: LineBox[]): ColumnGutter | null {
  if (lines.length < 2) return null;
  const allGaps: number[] = [];
  for (const l of lines) {
    const ws = [...l.words].sort((a, b) => a.x0 - b.x0);
    for (let i = 1; i < ws.length; i++) {
      const g = ws[i].x0 - ws[i - 1].x1;
      if (g > 0) allGaps.push(g);
    }
  }
  if (allGaps.length === 0) return null;
  allGaps.sort((a, b) => a - b);
  const medianGap = allGaps[Math.floor(allGaps.length / 2)];
  if (medianGap <= 0) return null;

  // Per line, the widest gap is a gutter candidate when it dwarfs normal
  // spacing and spans a real fraction of the line width (rules out the gap
  // between "( ) 1." prefixes and sentence text).
  const cands: Array<{ s: number; e: number }> = [];
  for (const l of lines) {
    const ws = [...l.words].sort((a, b) => a.x0 - b.x0);
    let best = -1;
    let bi = -1;
    for (let i = 1; i < ws.length; i++) {
      const g = ws[i].x0 - ws[i - 1].x1;
      if (g > best) {
        best = g;
        bi = i;
      }
    }
    if (bi < 0) continue;
    if (best >= 3 * medianGap && best >= (l.x1 - l.x0) * 0.04) {
      cands.push({ s: ws[bi - 1].x1, e: ws[bi].x0 });
    }
  }
  // Cluster candidates by x-position; the dominant cluster is the gutter.
  // Sized so per-area scans (all lines share the gutter) always qualify,
  // while full-page scans only split when a good share of lines agree.
  const needed = Math.max(2, Math.ceil(lines.length * 0.25));
  if (cands.length < needed) return null;
  const mids = cands.map((c) => (c.s + c.e) / 2).sort((a, b) => a - b);
  const mid = mids[Math.floor(mids.length / 2)];
  const tol = Math.max(4 * medianGap, 8);
  const inliers = cands.filter((c) => Math.abs((c.s + c.e) / 2 - mid) <= tol);
  if (inliers.length < needed) return null;
  const starts = inliers.map((c) => c.s).sort((a, b) => a - b);
  const ends = inliers.map((c) => c.e).sort((a, b) => a - b);
  const m = Math.floor(inliers.length / 2);
  return { start: starts[m], end: ends[m], mid };
}

/** Split a line's words at the gutter; each side stays in x order. */
function splitWordsAtGutter(
  words: WordBox[],
  gutter: ColumnGutter
): { left: WordBox[]; right: WordBox[] } {
  const ws = [...words].sort((a, b) => a.x0 - b.x0);
  const left = ws.filter((w) => w.x1 <= gutter.mid);
  const right = ws.filter((w) => w.x0 >= gutter.mid);
  for (const w of ws) {
    if (w.x1 > gutter.mid && w.x0 < gutter.mid) {
      // Box straddles the gutter mid: keep the side holding most of it.
      (w.x1 - gutter.mid > gutter.mid - w.x0 ? right : left).push(w);
    }
  }
  left.sort((a, b) => a.x0 - b.x0);
  right.sort((a, b) => a.x0 - b.x0);
  return { left, right };
}

/**
 * Split lines into left/right column cells. Returns null for single-column
 * text. Lines fully on one side keep their side; full-width lines without a
 * gutter gap (e.g. headers) stay at the top of the left column.
 */
function splitColumns(
  lines: LineBox[]
): { left: LineBox[]; right: LineBox[] } | null {
  const gutter = findColumnGutter(lines);
  if (!gutter) return null;
  const left: LineBox[] = [];
  const right: LineBox[] = [];
  for (const l of lines) {
    const { left: lw, right: rw } = splitWordsAtGutter(l.words, gutter);
    if (lw.length > 0 && rw.length > 0) {
      const mk = (ws: WordBox[]): LineBox => ({
        ...l,
        words: ws,
        tableLike: isTableLike(ws),
        text: ws.map((w) => w.text).join(" "),
      });
      left.push(mk(lw));
      right.push(mk(rw));
    } else if (rw.length > 0) {
      right.push(l);
    } else {
      left.push(l);
    }
  }
  if (left.length === 0 || right.length === 0) return null;
  return { left, right };
}

/** One crop area, coordinates relative to the image (0 – 1). */
export interface CropRegion {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Normalize a region (positive w/h, clamped to the image). */
export function normalizeRegion(r: CropRegion): CropRegion {
  const x = Math.min(1, Math.max(0, Math.min(r.x, r.x + r.w)));
  const y = Math.min(1, Math.max(0, Math.min(r.y, r.y + r.h)));
  const x2 = Math.min(1, Math.max(0, Math.max(r.x, r.x + r.w)));
  const y2 = Math.min(1, Math.max(0, Math.max(r.y, r.y + r.h)));
  return { x, y, w: x2 - x, h: y2 - y };
}

/** Reading order for multiple areas: top-to-bottom, then left-to-right. */
export function orderRegions(regions: CropRegion[]): CropRegion[] {
  return [...regions].sort((a, b) => a.y - b.y || a.x - b.x);
}

/** Cut one region out of the original image at full resolution. */
export async function cropImage(source: Blob, region: CropRegion): Promise<Blob> {
  const r = normalizeRegion(region);
  const bitmap = await createImageBitmap(source);
  const sx = Math.round(r.x * bitmap.width);
  const sy = Math.round(r.y * bitmap.height);
  const sw = Math.max(1, Math.round(r.w * bitmap.width));
  const sh = Math.max(1, Math.round(r.h * bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  canvas.getContext("2d")!.drawImage(bitmap, sx, sy, sw, sh, 0, 0, sw, sh);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png")
  );
  if (!blob) throw new Error("cropping failed");
  return blob;
}

/** Full pipeline: preprocess -> recognize (blocks) -> sort/clean -> items. */
export async function scanDictationImage(
  image: Blob,
  onProgress?: (p: OcrProgress) => void,
  mode: OcrMode = "lines"
): Promise<DictationItem[]> {
  const worker = await getWorker(onProgress);
  const preprocessed = await preprocessImage(image);
  const { data }: { data: OcrBlocks } = await worker.recognize(
    preprocessed,
    {},
    { blocks: true }
  );

  if ((data.blocks ?? []).length > 0) {
    return mode === "words"
      ? blocksToWordItems(data)
      : blocksToLineItems(data);
  }

  // Fallback: plain-text lines (same cleaning).
  return data.text
    .split("\n")
    .map(cleanLineText)
    .filter((t) => t.length > 0)
    .map((text, i) => ({ id: i + 1, text }));
}
