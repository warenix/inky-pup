"use client";
import { useRef } from "react";

interface Props {
  count: number;
  onManual: () => void;
  onPhotoFile: (f: File) => void;
}

/** Three ways to grow the word list: type it, snap it, or upload it. */
export default function AddWords({ count, onManual, onPhotoFile }: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Reset the input so picking the same file twice still fires onChange.
  const clear = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) onPhotoFile(f);
  };

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <h2 className="text-center text-2xl font-black">➕ Add more words!</h2>
      <p className="mt-1 text-center text-slate-500">
        {count === 0 ? "Start your list — pick one! " : "Keep growing your list! "}
      </p>
      <div className="mt-4 flex flex-col gap-3">
        <button
          onClick={onManual}
          className="btn-action bg-purple-500 text-white hover:bg-purple-600"
        >
          ✏️ Write it myself
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => cameraRef.current?.click()}
            className="btn-action-md flex-1 bg-blue-500 text-white hover:bg-blue-600"
          >
            📷 Photo
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="btn-action-md flex-1 border-4 border-blue-400 bg-white text-blue-500 hover:bg-blue-50"
          >
            🖼️ Upload
          </button>
        </div>
      </div>
      {/* Camera-first picker (mobile opens the camera directly) */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={clear}
      />
      {/* Plain file picker (mobile opens gallery / files — no camera forced) */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={clear}
      />
    </section>
  );
}
