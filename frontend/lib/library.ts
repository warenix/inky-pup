import type { DictationItem, TeacherSettings } from "./types";

/**
 * Saved dictation library, persisted in IndexedDB (100% local, offline).
 * Each entry wraps one full dictation: its items + the teacher settings
 * used to practise it.
 */

export interface DictationEntry {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  items: DictationItem[];
  settings: TeacherSettings;
  /** Which teacher profile was assigned to this dictation, if any. */
  teacherId: string | null;
}

const DB_NAME = "smart-dictation-db";
const STORE = "entries";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available in this browser"));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("updatedAt", "updatedAt", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Failed to open library"));
  });
}

function run<T>(
  mode: IDBTransactionMode,
  op: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        t.oncomplete = () => db.close();
        t.onerror = () => reject(t.error ?? new Error("Library update failed"));
        const req = op(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () =>
          reject(req.error ?? new Error("Library update failed"));
      })
  );
}

/** All saved dictations, most recently updated first. */
export async function listEntries(): Promise<DictationEntry[]> {
  const all = (await run("readonly", (s) => s.getAll())) as DictationEntry[];
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Save the current items + settings as a new dictation entry. */
export async function saveEntry(
  name: string,
  items: DictationItem[],
  settings: TeacherSettings,
  teacherId: string | null = null
): Promise<DictationEntry> {
  const now = Date.now();
  const entry: DictationEntry = {
    id: newId(),
    name: name.trim() || `Dictation ${new Date(now).toLocaleString()}`,
    createdAt: now,
    updatedAt: now,
    items: items.map((it, i) => ({ id: i + 1, text: it.text })),
    settings: { ...settings },
    teacherId,
  };
  await run("readwrite", (s) => s.add(entry));
  return entry;
}

/** Update the items + settings of an existing entry (no duplicate). */
export async function updateEntry(
  id: string,
  items: DictationItem[],
  settings: TeacherSettings,
  teacherId: string | null = null
): Promise<DictationEntry> {
  const existing = (await run("readonly", (s) =>
    s.get(id)
  )) as DictationEntry | undefined;
  if (!existing) throw new Error("Dictation not found");
  const updated: DictationEntry = {
    ...existing,
    items: items.map((it, i) => ({ id: i + 1, text: it.text })),
    settings: { ...settings },
    teacherId,
    updatedAt: Date.now(),
  };
  await run("readwrite", (s) => s.put(updated));
  return updated;
}

/** Rename a saved dictation (bumps it to the top of the list). */
export async function renameEntry(id: string, name: string): Promise<DictationEntry> {
  const existing = (await run("readonly", (s) =>
    s.get(id)
  )) as DictationEntry | undefined;
  if (!existing) throw new Error("Dictation not found");
  const clean = name.trim();
  if (!clean) throw new Error("Name is empty");
  const updated: DictationEntry = { ...existing, name: clean, updatedAt: Date.now() };
  await run("readwrite", (s) => s.put(updated));
  return updated;
}

/** Delete one saved dictation. */
export async function deleteEntry(id: string): Promise<void> {
  await run("readwrite", (s) => s.delete(id));
}
