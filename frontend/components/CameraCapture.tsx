"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "./LocaleProvider";

interface Props {
  onCapture: (file: File) => void;
  onCancel: () => void;
  /** Called when the camera can't be used, so the caller can fall back. */
  onUnavailable?: (reason: "denied" | "missing" | "unsupported") => void;
}

/**
 * Webcam capture for desktop browsers.
 *
 * Mobile keeps the native camera (the `capture` attribute opens the system
 * camera app, which gives far better quality and focus). Desktop browsers
 * ignore `capture` entirely and just show a file picker, so this uses
 * getUserMedia + canvas instead.
 */
export default function CameraCapture({ onCapture, onCancel, onUnavailable }: Props) {
  const t = useT();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<"starting" | "live" | "error">("starting");
  const [errorKey, setErrorKey] = useState<
    "camera.denied" | "camera.missing" | "camera.unsupported"
  >("camera.denied");
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [hasFront, setHasFront] = useState(false);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(
    async (mode: "environment" | "user") => {
      setStatus("starting");
      stop();
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setErrorKey("camera.unsupported");
          setStatus("error");
          onUnavailable?.("unsupported");
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: mode, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        // Laptops often have both a built-in and an external camera.
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          setHasFront(devices.filter((d) => d.kind === "videoinput").length > 1);
        } catch {
          setHasFront(false);
        }
        setStatus("live");
      } catch (e) {
        const name = e instanceof DOMException ? e.name : "";
        if (name === "NotAllowedError" || name === "SecurityError") {
          setErrorKey("camera.denied");
          onUnavailable?.("denied");
        } else if (name === "NotFoundError" || name === "OverconstrainedError") {
          setErrorKey("camera.missing");
          onUnavailable?.("missing");
        } else {
          setErrorKey("camera.unsupported");
          onUnavailable?.("unsupported");
        }
        setStatus("error");
      }
    },
    [onUnavailable, stop]
  );

  useEffect(() => {
    void start(facing);
    return stop;
    // Start once; facing changes restart through switchCamera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchCamera = () => {
    const next = facing === "environment" ? "user" : "environment";
    setFacing(next);
    void start(next);
  };

  const snap = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      stop();
      onCapture(
        new File([blob], `dictation-${Date.now()}.jpg`, { type: "image/jpeg" })
      );
    }, "image/jpeg", 0.92);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t("camera.title")}
    >
      <div className="w-full max-w-2xl rounded-3xl bg-white p-4 shadow-xl">
        <h2 className="text-center text-xl font-black">{t("camera.title")}</h2>

        <div className="relative mt-3 overflow-hidden rounded-2xl bg-slate-900">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="max-h-[55vh] w-full object-contain"
          />

          {status === "starting" && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/70">
              <p className="animate-pulse text-lg font-black text-white">
                {t("camera.starting")}
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900/85 p-4 text-center">
              <p className="text-5xl">📷</p>
              <p className="text-lg font-black text-white">{t(errorKey)}</p>
              <p className="text-sm text-slate-300">{t("camera.fallbackHint")}</p>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            onClick={onCancel}
            className="btn-action-md border-4 border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
          >
            {t("camera.cancel")}
          </button>

          <button
            onClick={snap}
            disabled={status !== "live"}
            aria-label={t("camera.shutter")}
            className="btn-action h-16 w-16 rounded-full bg-green-500 text-white hover:bg-green-600 disabled:opacity-40"
          >
            <span className="block h-11 w-11 rounded-full border-4 border-white bg-green-600" />
          </button>

          {hasFront && (
            <button
              onClick={switchCamera}
              disabled={status === "starting"}
              aria-label={t("camera.switch")}
              className="btn-action-md border-4 border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            >
              🔄
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * True when the device has its own camera app that the `capture` attribute
 * can hand off to (phones/tablets). Desktop browsers ignore `capture`, so
 * they need the webcam flow instead.
 */
export function hasNativeCamera(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/Android|iPhone|iPad|iPod|Mobile|Silk|Kindle|BlackBerry|Opera Mini|IEMobile/i.test(ua)) {
    return true;
  }
  // iPadOS reports a desktop UA but is a touch device.
  return (
    navigator.maxTouchPoints > 1 &&
    typeof window !== "undefined" &&
    /Macintosh/.test(ua)
  );
}