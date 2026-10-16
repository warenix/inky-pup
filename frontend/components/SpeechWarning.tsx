"use client";

import { useEffect, useState } from "react";
import { speechSupported } from "../lib/speech";

interface Props {
  /** Optional callback when user dismisses the warning */
  onDismiss?: () => void;
}

/** Shows a warning when the browser doesn't support Web Speech API. */
export default function SpeechWarning({ onDismiss }: Props) {
  const [warned, setWarned] = useState(false);

  useEffect(() => {
    if (!speechSupported()) {
      setWarned(true);
    }
  }, []);

  if (!warned) return null;

  return (
    <section className="rounded-3xl bg-yellow-50 border-y border-yellow-200 p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <p className="text-3xl">🎤</p>
        </div>
        <div>
          <h3 className="text-amber-800 font-black mb-1">Web Speech API not supported</h3>
          <p className="text-slate-600">
            Your browser cannot use the Web Speech API for dictation. Some features may
            not work properly. Please use a modern browser (Chrome, Edge, Safari) or
            check your browser settings.
          </p>
        </div>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-yellow-100 px-4 py-2 text-sm font-black text-amber-600 hover:bg-yellow-200"
        >
          ✕ Dismiss
        </button>
      )}
    </section>
  );
}