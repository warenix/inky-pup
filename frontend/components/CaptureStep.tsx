"use client";

import { useRef, useState } from "react";
import CameraCapture, { hasNativeCamera } from "./CameraCapture";
import { useT } from "./LocaleProvider";

export default function CaptureStep({
  onFile,
  appendCount = 0,
}: {
  onFile: (f: File) => void;
  appendCount?: number;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [webcam, setWebcam] = useState(false);
  const t = useT();

  // Phones hand off to the system camera; desktop needs the webcam dialog.
  const takePhoto = () => {
    if (hasNativeCamera()) {
      cameraRef.current?.click();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      fileRef.current?.click();
      return;
    }
    setWebcam(true);
  };

  const handleFile = (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      alert(t("capture.errNotImage"));
      return;
    }
    if (f.size > 25 * 1024 * 1024) {
      alert(t("capture.errTooBig"));
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
      <h2 className="text-center text-2xl font-black">{t("capture.title")}</h2>
      <p className="mt-1 text-center text-slate-500">{t("capture.subtitle")}</p>
      {appendCount > 0 && (
        <p className="mx-auto mt-2 w-fit rounded-full bg-green-100 px-4 py-1 text-center font-black text-green-700">
          {t("capture.appendBadge", { n: appendCount })}
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
          <img
            src={preview}
            alt={t("capture.previewAlt")}
            className="max-h-64 rounded-2xl object-contain"
          />
        ) : null}
        <div className="mt-4 flex w-full flex-col gap-3">
          <button
            onClick={takePhoto}
            className="btn-action bg-blue-500 text-white hover:bg-blue-600"
          >
            {t("capture.takePhoto")}
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="btn-action-md border-4 border-blue-400 bg-white text-blue-500 hover:bg-blue-50"
          >
            {t("capture.choosePicture")}
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

      {webcam && (
        <CameraCapture
          onCapture={(file) => {
            setWebcam(false);
            handleFile(file);
          }}
          onCancel={() => setWebcam(false)}
          onUnavailable={() => {
            setWebcam(false);
            fileRef.current?.click();
          }}
        />
      )}
    </section>
  );
}