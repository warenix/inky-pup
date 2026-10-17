# Inky Pup 黑犬聽寫

Scan dictation sheets with OCR, review the words, configure a virtual teacher,
and play back dictation with the browser's speech synthesis.

**黑犬聽寫** — 掃描、檢查、朗讀，一切在裝置內完成。

100% client-side — no server, no uploads. OCR runs in the page via
[Tesseract.js](https://github.com/naptha/tesseract.js) (WASM port of Tesseract)
with Traditional Chinese (`chi_tra`) + English traineddata, LSTM engine, and
PSM 6 tuned for printed word lists. Photos never leave the device.

## Prerequisites

- **Node.js** (≥ 18) + npm
- A modern browser (Chrome / Edge / Safari / Firefox)
- Internet on first use (downloads ~25MB of OCR data, then cached in IndexedDB for offline use)

## Run it

```bash
cd frontend
npm install
npm run dev
# open http://localhost:3000
```

Production build:

```bash
npm run build && npm start
```

Deploy anywhere static: `npm run build` output works on Vercel, Netlify, GitHub Pages, etc.

## How Traditional Chinese quality is kept high

- `chi_tra` traineddata (not `chi_sim`) + English, LSTM-only engine (`OEM.LSTM`)
- `tessedit_pageseg_mode = 6` — uniform text block, best for printed lists
- `preserve_interword_spaces = 1` — keeps CJK-adjacent spacing stable
- Canvas preprocessing before recognition: grayscale + 140% contrast,
  downscale if > 2048px, **2x upscale when the image is small**
  (Tesseract's own docs: upscaling low-res input often beats everything else)
- Line-level bounding boxes sorted top-to-bottom / left-to-right, list indices
  (`1.`, `2)`, `一、`, `•` …) stripped, empties dropped
- Accuracy guards: lines scoring under 20% confidence are dropped as
  hallucinations; table grid rules (`|`, `─`) are cleaned; wrapped sentence
  lines are rejoined; over-split table cells are regrouped into words
- Two result modes per scan: **📝 Lines/sentences** or **🔤 Single words**
  (best for vocabulary tables)
- The OCR worker is created once and reused for every scan

Tips for best results: photograph straight-on in good light, fill the frame
with the sheet, and keep text level.

## Project layout

```
/frontend           Next.js 14 + Tailwind single-page app (the whole product)
  app/              layout, page (4 steps), globals.css
  components/       CaptureStep, ReviewStep, SettingsPanel, PlayerEngine
  lib/              ocr.ts (Tesseract.js pipeline), speech.ts, types.ts
```

## Flow

`CaptureStep` photo/upload → in-browser OCR with progress bar →
`ReviewStep` editable list → `SettingsPanel` (lang `en-US`/`en-GB`/`yue-HK`/`zh-CN`,
rate, repeats, pause, writing time) → `PlayerEngine` (Web Speech API loop:
speak × N → writing countdown → next, with play/pause/restart/finish).
