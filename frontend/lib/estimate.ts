import { chunkSentence, estimateAudioSeconds, repeatPauseSeconds, singleChunk } from "./chunks";
import type { TKey, Vars } from "./i18n";
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
export function formatEstimate(
  totalSecs: number,
  t: (key: TKey, vars?: Vars) => string
): { big: string; small: string } {
  if (totalSecs < 60) {
    const s = Math.max(5, Math.round(totalSecs / 5) * 5);
    return {
      big: t("estimate.seconds", { n: s }),
      small: t("estimate.exactSeconds", { n: totalSecs }),
    };
  }
  const m = Math.floor(totalSecs / 60);
  const s = Math.round(totalSecs % 60);
  const exact =
    s === 0
      ? t("estimate.exactMinutes", { n: m })
      : t("estimate.exactMinutesSeconds", { n: m, s });
  return { big: t("estimate.minutes", { n: m }), small: exact };
}