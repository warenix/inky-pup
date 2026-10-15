export interface DictationItem {
  id: number;
  text: string;
}

export interface TeacherSettings {
  /** BCP-47 voice lang, e.g. en-US, en-GB, yue-HK, zh-CN */
  lang: string;
  /** SpeechSynthesis rate, 0.3 (slow) – 1.5 (fast) */
  rate: number;
  /** Times each item is spoken */
  repeatCount: number;
  /** Pause between repetitions, seconds */
  pauseInterval: number;
  /** Writing countdown per item, seconds */
  writingTime: number;
  /** Announce punctuation names aloud (". full stop") instead of pausing silently */
  sayPunctuation: boolean;
  /** Read long items in small memorable parts instead of all at once */
  chunkLongSentences: boolean;
  /** Hide the text during playback so students can't peek (hold 👀 to reveal) */
  hideWords: boolean;
}

export const DEFAULT_SETTINGS: TeacherSettings = {
  lang: "en-US",
  rate: 0.8,
  repeatCount: 2,
  pauseInterval: 1,
  writingTime: 10,
  sayPunctuation: true,
  chunkLongSentences: true,
  hideWords: true,
};

export const LANGUAGES = [
  { value: "en-US", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "yue-HK", label: "Cantonese (廣東話)" },
  { value: "zh-CN", label: "Mandarin (普通話)" },
];
