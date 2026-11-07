"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { kompresGambar } from "@/lib/guru-bantu/utils";
import { btnOutline, btnPrimary, Spinner } from "./ui";

type Props = { onChange: (blob: Blob | null) => void; disabled?: boolean };

/** Kamera depan via getUserMedia. Jika ditolak/tidak didukung → fallback input kamera bawaan HP. */
export default function CameraCapture({ onChange, disabled }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"idle" | "live" | "preview">("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [memproses, setMemproses] = useState(false);

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
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(blob));
    setMode("preview");
    onChange(blob);
  }

  async function terimaDanKompres(raw: Blob) {
    setMemproses(true);
    setError("");
    try {
      const kecil = await kompresGambar(raw);
      simpan(kecil);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memproses foto.");
      onChange(null);
      setMode("idle");
    } finally {
      setMemproses(false);
    }
  }

  function jepret() {
    const v = videoRef.current;
    if (!v || !v.videoWidth || memproses) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, 0, 0);
    c.toBlob((b) => {
      if (b) {
        stopStream();
        void terimaDanKompres(b);
      }
    }, "image/jpeg", 0.92);
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
          if (f) void terimaDanKompres(f);
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
        {mode === "idle" && !memproses && (
          <div className="flex h-full flex-col items-center justify-center gap-1 px-6 text-center text-sm text-slate-300">
            <span className="text-3xl" aria-hidden>📷</span>
            Foto selfie wajib untuk presensi
          </div>
        )}
        {memproses && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/75 text-sm text-white">
            <Spinner className="h-6 w-6 text-white" />
            Memproses foto…
          </div>
        )}
      </div>

      {error && <p className="text-xs text-amber-700">{error}</p>}

      <div className="flex gap-2">
        {mode === "idle" && (
          <button type="button" className={`${btnPrimary} w-full`} onClick={bukaKamera} disabled={disabled || memproses}>
            Buka kamera
          </button>
        )}
        {mode === "live" && (
          <>
            <button type="button" className={`${btnPrimary} flex-1`} onClick={jepret} disabled={memproses}>
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
