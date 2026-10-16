"use client";
import { useRef, useState } from "react";

export default function CaptureStep({ onFile, appendCount = 0 }: { onFile: (f: File) => void; appendCount?: number }) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      alert("That doesn't look like a picture. Please pick an image! ");
      return;
    }
    if (f.size > 25 * 1024 * 1024) {
      alert("That picture is a bit too big — under 25 MB please! ");
      return;
    }
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(f);
    });
    onFile(f);
  };

  // Reset the input so picking the same file twice still fires onChange.
  const clear = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFile(e.target.files?.[0]);
    e.target.value = "";
  };

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <h2 className="text-center text-2xl font-black"> Take a photo!</h2>
      <p className="mt-1 text-center text-slate-500">
        Snap your dictation sheet. Lay it flat — ask a grown-up to help! 
      </p>
      {appendCount > 0 && (
        <p className="mx-auto mt-2 w-fit rounded-full bg-green-100 px-4 py-1 text-center font-black text-green-700">
           New words will join your {appendCount} words!
        </p>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
        className={`mt-4 flex flex-col items-center justify-center rounded-2xl border-4 border-dashed p-6 text-center transition ${
          dragOver ? "border-amber-400 bg-amber-50" : "border-slate-300"
        }`}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Dictation sheet preview" className="max-h-64 rounded-2xl object-contain" />
        ) : null}
        <div className="mt-4 flex w-full flex-col gap-3">
          <button
            onClick={() => cameraRef.current?.click()}
            className="btn-kid rounded-2xl bg-blue-500 px-4 py-4 text-xl font-black text-white shadow-lg hover:bg-blue-600"
          >
            Take photo
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="btn-kid rounded-2xl border-4 border-blue-400 bg-white px-4 py-3 text-xl font-black text-blue-500 hover:bg-blue-50"
          >
            Choose picture
          </button>
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
      </div>
    </section>
  );
}
