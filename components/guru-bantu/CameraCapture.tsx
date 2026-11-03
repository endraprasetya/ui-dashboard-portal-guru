"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { btnOutline, btnPrimary } from "./ui";

type Props = { onChange: (blob: Blob | null) => void; disabled?: boolean };

/** Kamera depan via getUserMedia. Jika ditolak/tidak didukung → fallback input kamera bawaan HP. */
export default function CameraCapture({ onChange, disabled }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"idle" | "live" | "preview">("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => () => stopStream(), [stopStream]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  useEffect(() => {
    if (mode === "live" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [mode]);

  async function bukaKamera() {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      fileRef.current?.click();
      return;
    }
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 } },
        audio: false,
      });
      setMode("live");
    } catch {
      setError("Kamera tidak bisa diakses. Memakai kamera bawaan perangkat.");
      fileRef.current?.click();
    }
  }

  function simpan(blob: Blob) {
    setPreview(URL.createObjectURL(blob));
    setMode("preview");
    onChange(blob);
  }

  function jepret() {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, 0, 0);
    c.toBlob((b) => {
      if (b) {
        stopStream();
        simpan(b);
      }
    }, "image/jpeg", 0.9);
  }

  function ulangi() {
    setPreview(null);
    onChange(null);
    setMode("idle");
    bukaKamera();
  }

  return (
    <div className="space-y-3">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) simpan(f);
          e.target.value = "";
        }}
      />

      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-slate-900">
        {mode === "live" && (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video ref={videoRef} playsInline muted className="h-full w-full -scale-x-100 object-cover" />
        )}
        {mode === "preview" && preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Foto selfie presensi" className="h-full w-full object-cover" />
        )}
        {mode === "idle" && (
          <div className="flex h-full flex-col items-center justify-center gap-1 px-6 text-center text-sm text-slate-300">
            <span className="text-3xl" aria-hidden>📷</span>
            Foto selfie wajib untuk presensi
          </div>
        )}
      </div>

      {error && <p className="text-xs text-amber-700">{error}</p>}

      <div className="flex gap-2">
        {mode === "idle" && (
          <button type="button" className={`${btnPrimary} w-full`} onClick={bukaKamera} disabled={disabled}>
            Buka kamera
          </button>
        )}
        {mode === "live" && (
          <>
            <button type="button" className={`${btnPrimary} flex-1`} onClick={jepret}>
              Ambil foto
            </button>
            <button type="button" className={btnOutline} onClick={() => { stopStream(); setMode("idle"); }}>
              Batal
            </button>
          </>
        )}
        {mode === "preview" && (
          <button type="button" className={`${btnOutline} w-full`} onClick={ulangi} disabled={disabled}>
            Ulangi foto
          </button>
        )}
      </div>
    </div>
  );
}
