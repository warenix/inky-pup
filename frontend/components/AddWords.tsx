"use client";

import { useRef, useState } from "react";
import CameraCapture, { hasNativeCamera } from "./CameraCapture";
import { useT } from "./LocaleProvider";

interface Props {
  count: number;
  onManual: () => void;
  onPhotoFile: (f: File) => void;
}

/** Three ways to grow the word list: type it, snap it, or upload it. */
export default function AddWords({ count, onManual, onPhotoFile }: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [webcam, setWebcam] = useState(false);
  const t = useT();

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

  // Reset the input so picking the same file twice still fires onChange.
  const clear = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) onPhotoFile(f);
  };

  return (
    <section className="card p-6">
      <h2 className="title">{t("add.title")}</h2>
      <p className="subtitle">
        {count === 0 ? t("add.subtitleEmpty") : t("add.subtitleMore")}
      </p>
      <div className="mt-4 flex flex-col gap-3">
        <button
          onClick={onManual}
          className="btn-action"
        >
          {t("add.manual")}
        </button>
        <div className="flex gap-2">
          <button
            onClick={takePhoto}
            className="btn-action-md flex-1 bg-[#007d8c] text-white hover:bg-[#00656f]"
          >
            {t("add.photo")}
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="btn-action-md flex-1 btn-plain"
          >
            {t("add.upload")}
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

      {webcam && (
        <CameraCapture
          onCapture={(f) => {
            setWebcam(false);
            onPhotoFile(f);
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