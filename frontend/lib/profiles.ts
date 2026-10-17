import { DEFAULT_SETTINGS, type TeacherSettings } from "./types";

/**
 * Teacher profiles.
 *
 * A teacher configures the voice once — language, speed, repeats, pauses —
 * and students then just tap their own avatar to start. Same idea as picking
 * a user on a console, so it is stored separately from dictation content.
 */

export interface TeacherProfile {
  id: string;
  name: string;
  settings: TeacherSettings;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = "inky-pup-teacher-profiles";

/** Settings a teacher owns. `hideWords` stays per-session by design. */
const PROFILE_KEYS: Array<keyof TeacherSettings> = [
  "lang",
  "rate",
  "repeatCount",
  "pauseInterval",
  "writingTime",
  "sayPunctuation",
  "chunkLongSentences",
];

export function profileFromSettings(
  name: string,
  settings: TeacherSettings
): TeacherProfile {
  const now = Date.now();
  const bundled: TeacherSettings = { ...DEFAULT_SETTINGS };
  const source = settings as unknown as Record<string, string | number | boolean>;
  const target = bundled as unknown as Record<string, string | number | boolean>;
  for (const k of PROFILE_KEYS) target[k] = source[k];
  return {
    id: newId(),
    name: name.trim(),
    settings: bundled,
    createdAt: now,
    updatedAt: now,
  };
}

/** Apply a profile's voice settings, leaving practice-mode choices alone. */
export function applyProfile(
  settings: TeacherSettings,
  profile: TeacherProfile
): TeacherSettings {
  const next: TeacherSettings = { ...settings };
  for (const k of PROFILE_KEYS) {
    // Each key keeps its own type, so assign through a narrow record.
    (next as unknown as Record<string, string | number | boolean>)[k] =
      profile.settings[k];
  }
  return next;
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

function read(): TeacherProfile[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isProfile)
      .sort((a, b) => a.createdAt - b.createdAt);
  } catch {
    return []; // storage blocked or corrupt — treat as "no profiles yet"
  }
}

function write(profiles: TeacherProfile[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  } catch {
    /* storage blocked (private mode) — profiles just won't persist */
  }
}

function isProfile(value: unknown): value is TeacherProfile {
  if (!value || typeof value !== "object") return false;
  const p = value as Partial<TeacherProfile>;
  return (
    typeof p.id === "string" &&
    typeof p.name === "string" &&
    typeof p.createdAt === "number" &&
    typeof p.settings === "object" &&
    p.settings !== null &&
    typeof p.settings.lang === "string" &&
    typeof p.settings.rate === "number"
  );
}

export function listProfiles(): TeacherProfile[] {
  return read();
}

/** Look up a single profile by id. */
export function getProfile(id: string): TeacherProfile | undefined {
  return read().find((p) => p.id === id);
}

/** Create a profile, refusing blank names and duplicate names. */
export function createProfile(name: string, settings: TeacherSettings): TeacherProfile {
  const clean = name.trim();
  if (!clean) throw new Error("empty");
  const profiles = read();
  if (profiles.some((p) => p.name === clean)) throw new Error("duplicate");
  const profile = profileFromSettings(clean, settings);
  profiles.push(profile);
  write(profiles);
  return profile;
}

/** Update an existing profile's voice settings. */
export function updateProfile(
  id: string,
  settings: TeacherSettings,
  name?: string
): TeacherProfile {
  const profiles = read();
  const i = profiles.findIndex((p) => p.id === id);
  if (i < 0) throw new Error("missing");
  const merged = profileFromSettings(name ?? profiles[i].name, settings);
  const next: TeacherProfile = {
    ...profiles[i],
    name: merged.name || profiles[i].name,
    settings: merged.settings,
    updatedAt: Date.now(),
  };
  profiles[i] = next;
  write(profiles);
  return next;
}

export function deleteProfile(id: string): void {
  write(read().filter((p) => p.id !== id));
}

/** First letter for the avatar tile, with a safe fallback. */
export function profileInitial(name: string): string {
  const trimmed = name.trim();
  return trimmed ? Array.from(trimmed)[0].toUpperCase() : "•";
}