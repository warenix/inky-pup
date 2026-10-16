import { chunkSentence, estimateAudioSeconds, repeatPauseSeconds, singleChunk } from "./chunks";
import { expandPunctuation } from "./speech";
import type { DictationItem, TeacherSettings } from "./types";

/**
 * Estimated playback duration, mirroring exactly what the player does:
 * same chunks, same repeats/pauses, same punctuation announcements.
 */

export function estimateSeconds(
  items: DictationItem[],
  settings: TeacherSettings
): number {
  const chunkingOn = settings.chunkLongSentences !== false;
  let total = 0;
  for (const it of items) {
    const chunks = chunkingOn ? chunkSentence(it.text) : singleChunk(it.text);
    for (const c of chunks) {
      const spoken =
        settings.sayPunctuation === false
          ? c.text
          : expandPunctuation(c.text, settings.lang);
      total +=
        (estimateAudioSeconds(spoken) / settings.rate) * settings.repeatCount +
        repeatPauseSeconds(c.text, settings) * (settings.repeatCount - 1);
    }
    if (chunks.length > 1) {
      total += repeatPauseSeconds(chunks[chunks.length - 2].text, settings);
    }
    total += settings.writingTime;
  }
  return Math.max(0, Math.round(total));
}

/** Kid-friendly "About 3 min", with an exact subtitle for grown-ups. */
export function formatEstimate(totalSecs: number): { big: string; small: string } {
  if (totalSecs < 60) {
    const s = Math.max(5, Math.round(totalSecs / 5) * 5);
    return { big: `About ${s} seconds`, small: `≈ ${totalSecs} sec in total` };
  }
  const m = Math.floor(totalSecs / 60);
  const s = Math.round(totalSecs % 60);
  const exact = s === 0 ? `${m} min` : `${m} min ${s} sec`;
  return { big: `About ${m} min`, small: `≈ ${exact} in total` };
}